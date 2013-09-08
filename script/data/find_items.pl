#!/usr/bin/env perl
use common::sense;
use lib qw(../.. ../../lib /tk/mojo4/lib);

use Mojo::Server;
use Mojo::UserAgent;
use WWW::Foursquare;
use Net::Twitter::Lite::WithAPIv1_1;

my $self = Mojo::Server->load_app('../eventshot');
my $conf = $self->app->conf->{oauth};
my $ua   = Mojo::UserAgent->new(max_redirects => 5, connect_timeout => 30, inactivity_timeout => 60, request_timeout => 30);

my $limit = 200;

#

my $queue = $self->dw->queue($self->db->select(
	'select * from queue where status="wait"' # . ' and user_id=1 and type="twitter"'
));

my $user  = {
	map { ("$_->{user_id}-$_->{type}" => $_) }
	@{$self->db->select('select * from user_provider where user_id ' . $self->db->in(map $_->{user_id}, @$queue))}
};

#

for my $q (@$queue) {
	warn qq(New task from queue "$q->{id}" by user "$q->{user_id}"...\n);
	
	my $p = $user->{ "$q->{user_id}-$q->{type}" };
	unless ($p) {
		warn qq(Not found provider "$q->{type}" for user "$q->{user_id}"\n);
		$self->db->query('update queue set status="error" where id=?', $q->{id});
		
		# XXX: end?
		next;
	}
	
	# $self->db->query('update queue set status="progress" where id=?', $q->{id});
	
	my $items = find_items(
		start_date => $q->{event}->{start_date},
		end_date   => $q->{event}->{end_date  },
		
		provider   => $q->{type},
		data       => eval $p->{data},
	);
	
	my $c;
	if (@$items) {
		my $time  = $self->u('time2iso');
		my $count = scalar @$items;
		warn qq(Find "$count" items by provider "$q->{type}"\n);
		
		# XXX: check uniq ext id
		$c += $count if $self->db->query(
			'insert ignore into event_item (event_id, user_id, type, ext_id, data, created)' . $self->db->values(
				map {
					[ @$q{qw(event_id user_id type)}, $_->{id}, $self->dumper($_), $time ]
				}
				@$items
			)
		);
	}
	
	# ready?
	$self->db->query('update queue set count=count+?, status="ready" where id=?', $c, $q->{id});
	
	# XXX: если все ок?
	$self->db->query('update event set status="ready" where id=?', $q->{event_id});
}

#

# XXX: find only one page

sub find_items {
	my %args = @_;
	
	my $data = $args{data};
	my($start, $end) = map $self->u('iso2time', $_), @args{qw(start_date end_date)};
	
	my $items;
	eval {
		given ($args{provider}) {
			when ('instagram') {
				my $list = $ua->get(
					'https://api.instagram.com/v1/users/self/media/recent/' => form => {
						count         => $limit, # XXX
						min_timestamp => $start,
						max_timestamp => $end,
						access_token  => $data->{access_token},
					}
				)->res->json;
				
				for my $d (@{$list->{data}||[]}) {
					unshift @$items, {
						id       => $d->{id},
						title    => $d->{caption}->{text},
						url      => $d->{link},
						location => $d->{location},
						photo    => $d->{images}->{standard_resolution}->{url},
						width    => $d->{images}->{standard_resolution}->{width},
						height   => $d->{images}->{standard_resolution}->{height},
						created  => $self->u('time2iso', $d->{created_time}),
					};
				}
			}
			when ('foursquare') {
				my $fs = WWW::Foursquare->new(map { $_ => $conf->{foursquare}->{$_} } qw(client_id client_secret redirect_uri));
				$fs->set_access_token($data->{access_token});
				
				my $list = $fs->users->checkins(
					limit           => $limit, # XXX
					afterTimestamp  => $start,
					beforeTimestamp => $end,
				);
				
				for my $d (@{$list->{checkins}->{items} || []}) {
					next if $d->{source}->{name} =~ /instagram/i;
					
					my $p = eval { $d->{photos}->{items}->[0] };
					unshift @$items, {
						id       => $d->{id},
						title    => $d->{shout},
						url      => $d->{venue}->{canonicalUrl},
						location => $d->{venue}->{location},
						photo    => $p ? join('600x600', $p->{prefix}, $p->{suffix}) : undef,
						width    => $p ? $p->{width } : 0,
						height   => $p ? $p->{height} : 0,
						created  => $self->u('time2iso', $d->{createdAt}),
					};
				}
			}
			when ('twitter') {
				my $nt = Net::Twitter::Lite::WithAPIv1_1->new(
					(map { $_ => $conf->{twitter}->{$_} } qw(consumer_key consumer_secret)),
					(map { $_ => $data->{$_} } qw(access_token access_token_secret)),
				);
				
				my $list = $nt->user_timeline({ count => $limit, trim_user => 1 });
				$list = [
					grep {
						my $what;
						$what->{retweet} = !!$_->{retweeted_status};
						$what->{reply  } = !!$_->{in_reply_to_user_id_str};
						$what->{tweet  } = !$what->{retweet} && !$what->{reply};
						# warn qq(It's tweet "$what->{tweet}", reply "$what->{reply}", retweet "$what->{retweet}": $_->{text}\n);
						
						my $epoch = at2time($_->{created_at});
						my $yes   = ($epoch >= $start && $epoch <= $end && $what->{tweet}) ? 1 : 0;
						$yes;
					}
					@$list
				];
				
				for my $d (@$list) {
					next if $d->{source} =~ /instagram|foursquare/i;
					
					unshift @$items, {
						id       => $d->{id},
						title    => $d->{text},
						url      => "https://twitter.com/$d->{user}->{id}/status/$d->{id}",
						location => $d->{place},
						photo    => undef,
						width    => 0,
						height   => 0,
						created  => $self->u('time2iso', at2time($d->{created_at})),
					};
				}
			}
			when ('facebook') {
			
			}
			default {
				warn qq(Unknown provider "$_"\n);
			}
		}
	};
	warn qq(ERROR: $@) if $@;
	
	$items;
}

sub at2time {
	use HTTP::Date;
	
	my $date = shift;
	$date =~ s/\+0000 //;
	str2time( $date ) + 60*60*4; # XXX: check zone
}
