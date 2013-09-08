#!/usr/bin/env perl

use v5.10;
use common::sense;

use lib qw(../.. ../../lib /tk/mojo4/lib);

use Mojo::Server;
use Data::Dumper;
use DateTime;
use HTTP::Date;
use DateTime::Format::Strptime;
use JSON;

use WWW::Foursquare;
use Net::Twitter::Lite::WithAPIv1_1;

my $self = Mojo::Server->load_app('../eventshot');
my $ua  = Mojo::UserAgent->new;

# get events in queue
my $queue = $self->db->select("select distinct u.user_id as user_id, u.type as type, u.data as data, q.event_id as event_id, date(e.start_date) as start_date, date(e.end_date) as end_date from user_provider u join queue q on u.user_id = q.user_id join event e on q.event_id = e.id where u.user_id = 1");
for (@$queue) {

    my @inserts;
    my $user_id    = $_->{user_id};
    my $event_id   = $_->{event_id};
    my $type       = $_->{type};
    my $data       = $_->{data};
    my $start_date = $_->{start_date};
    my $end_date   = $_->{end_date};
    my $auth       = eval $data;
	my $conf       = $self->app->conf->{oauth}->{$type};
    say "$user_id $type";

    $start_date = '2013-08-07';
    $end_date   = '2013-08-09';

    my $min_timestamp = DateTime::Format::Strptime->new( pattern => '%Y-%m-%d' )->parse_datetime($start_date)->epoch();
    my $max_timestamp = DateTime::Format::Strptime->new( pattern => '%Y-%m-%d' )->parse_datetime($end_date)->epoch();

    given($type) {
        when (/foursquare/) {

            # get all checkins
            say "foursquare";

            my $fs = WWW::Foursquare->new(map { $_ => $conf->{$_} } qw(client_id client_secret redirect_uri));
            $fs->set_access_token($auth->{access_token});
            my $checkins = $fs->users()->checkins(afterTimestamp => $min_timestamp, beforeTimestamp => $max_timestamp);
    
            for (@{ $checkins->{checkins}->{items} }) { 

                # clean object
                delete $_->{venue}->{likes};
                delete $_->{likes};

                #push @inserts, [$event_id, $user_id, $type, Dumper($_), DateTime->now->datetime];
            }
        }
        when (/instagram/) {
            my $images = $ua->get("https://api.instagram.com/v1/users/self/media/recent/" => form => { min_timestamp => $min_timestamp, max_timestamp => $max_timestamp, access_token => $auth->{access_token} })->res->json;

            for (@{ $images->{data} }) {

                delete $_->{likes};
                #push @inserts, [$event_id, $user_id, $type, Dumper($_), DateTime->now->datetime];
            }
        }
        when (/twitter/) {
	        my $nt = Net::Twitter::Lite::WithAPIv1_1->new(
				(map { $_ => $conf->{$_} } qw(consumer_key consumer_secret)),
				(map { $_ => $auth->{$_} } qw(access_token access_token_secret)),
			);
			
			my $data = $nt->verify_credentials;
		    my $tweets = $nt->user_timeline({ count => 200, trim_user => 1});
            say "twitter";
            say scalar @$tweets;

            # filter retweets, reply
            $tweets = [
                grep {
                    my $what;
                    $what->{retweet} = !!$_->{retweeted_status};
                    $what->{reply  } = !!$_->{in_reply_to_user_id_str};
                    $what->{tweet  } = !$what->{retweet} && !$what->{reply};
                    #warn qq(It's tweet "$what->{tweet}", reply "$what->{reply}", retweet "$what->{retweet}": $_->{text}\n);

                    my $epoch = at2time($_->{created_at});
                    my $yes   = ($epoch >= $min_timestamp && $epoch <= $max_timestamp && $what->{tweet}) ? 1 : 0;
                    $yes;
                }
                @$tweets
            ];
            
            #say scalar @$tweets;
            for (@$tweets) {
                say Dumper($_) if $_->{id} == 365558939858919424;
                #push @inserts, [$event_id, $user_id, $type, Dumper($_), DateTime->now->datetime];
            }
            exit;
        }
        when (/facebook/) {
            my $url   = "https://graph.facebook.com/me/posts";
            my $posts = $ua->get($url => form => { access_token => $auth->{access_token}, since => $start_date, until => $end_date, limit => 500 })->res->json;
            
            for my $item (@{ $posts->{data}}) {
 
                my ($user_id, $object_id) = split '_', $item->{id};

                # filter useless feeds
                next if $item->{from}->{id} != $user_id;
                next if $item->{status_type} =~ m/shared|friend|tag/i;
                next if $item->{type} eq 'status' && !$item->{status_type}; #like page, and post on page

                # filter instagram
                next if $item->{application}->{name} =~ m/instagram|foursquare|pages|twitter/i;

                # change img to big
                $item->{picture} =~ s/\/([\d_]+)_s\.jpg/\/s640x640\/$1_n\.jpg/ if $item->{picture};
                #push @inserts, [$event_id, $user_id, $type, Dumper($item), DateTime->now->datetime];
            }
        }
        default {}
    };

    while (my @insert_chunk = splice @inserts, 0, 500) {
        insert_event_item(\@insert_chunk);
    }
}

sub insert_event_item {
	my $inserts = shift;

    say scalar @$inserts;
	$self->db->query(
		'insert into event_item(event_id, user_id, type, data, created) ' . $self->db->values(
			map { $_ } @$inserts
		) . ' on duplicate key update data = values(data)'
	);
}

sub at2time {
    my $date = shift;
    $date =~ s/\+0000 //;
    str2time( $date ) + 60*60*4; # XXX: check zone
}
