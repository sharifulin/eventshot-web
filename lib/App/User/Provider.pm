package App::User::Provider;
use App::Base -controller, with => 'App::User';

use WWW::Foursquare;
use WebService::Instagram;
use Net::Twitter::Lite::WithAPIv1_1;

use Mojo::JSON;
has json => sub { Mojo::JSON->new };

sub oauth_session {
	my $self = shift;
	
	return $self->redirect('/oauth/error') unless $self->oauth_login($self->stash('provider'));
	return;
}

sub oauth {
	my $self = shift;
	
	return $self->redirect('/oauth/error') unless $self->oauth_callback;
	return $self->redirect('/oauth/error') unless my $uuid = $self->get_cookie('uuid');
	
	$self->user->_load_user($uuid);
	
	my $USER = $self->stash('USER');
	my $data = $self->_get_data;
	warn $self->dumper($data);
	
	$self->db->query(
		'insert into user_provider set user_id=?, type=?, uid=?, username=?, name=?, link=?, photo=?, data=?, created=now()
		on duplicate key update uid=?, username=?, name=?, link=?, photo=?, data=?, created=now()',
		$USER->{id}, $data->{provider},
		( (map $data->{user}->{$_}, qw(uid username name link photo)), $self->dumper($data->{oauth}) ) x 2,
	);
	
	$self->render('user/provider/oauth_redirect');
}

#

sub _get_data {
	my $self = shift;
	
	my $oauth = $self->session('oauth'); delete $self->{session}->{oauth};
	my $conf  = $self->app->conf->{oauth}->{ $oauth->{oauth_provider} };
	
	my $user;
	eval {
		given ($oauth->{oauth_provider}) {
			when ('twitter') {
				my $nt = Net::Twitter::Lite::WithAPIv1_1->new(
					(map { $_ => $conf ->{$_} } qw(consumer_key consumer_secret)),
					(map { $_ => $oauth->{$_} } qw(access_token access_token_secret)),
				);
			
				my $data = $nt->verify_credentials;
				$user = {
					uid      => $data->{id},
					username => $data->{screen_name},
					photo    => $data->{profile_image_url},
					name     => $data->{name},
					link     => "http://twitter.com/$data->{screen_name}",
				};
				
				# $list = $nt->user_timeline(count => 200, trim_user => 1);
			}
			when ('foursquare') {
				my $fs = WWW::Foursquare->new(
					(map { $_ => $conf ->{$_} } qw(client_id client_secret)),
				);
				$fs->set_access_token($oauth->{access_token});
				
				my $data = $fs->users->info->{user};
				$user = {
					uid      => $data->{id},
					username => $data->{contact}->{email},
					photo    => join('64x64', @$data{qw(prefix suffix)}),
					name     => join(' ', @$data{qw(firstName lastName)}),
					link     => '', # XXX ?
				};
				
				# $list = $fs->checkins(limit => 2);
			}
			when ('instagram') {
				my $ws = WebService::Instagram->new({
					(map { $_ => $conf->{$_} } qw(client_id client_secret redirect_uri)),
				});
				$ws->set_access_token($oauth->{access_token});
				
				my $data = $ws->request('https://api.instagram.com/v1/users/self')->{data};
				$user = {
					uid      => $data->{id},
					username => $data->{username},
					photo    => $data->{profile_picture},
					name     => $data->{full_name},
					link     => "http://instagram.com/$data->{username}",
				};
				
				# $list = $ws->request('https://api.instagram.com/v1/users/self/media/recent', {count => 2})->{data};
			}
			when ('facebook') {
				my $res = $self->oauth_request($oauth->{oauth_provider},
					{ map { $_ => $oauth->{$_} } qw(access_token access_token_secret) },
					$conf->{protected_params} || {}
				);
				
				my $body = $res && $res->content;
				my $data = $self->json->decode( $body );
				
				# XXX: email empty, perm?
				$user = {
					uid   => $data->{id},
					photo => "https://graph.facebook.com/$data->{username}/picture",
					(map { $_ => $data->{$_} } qw(username email link name)),
				};
				
				# list
			}
			default {
				warn "UNKNOWN TYPE: $_";
			}
		}
	};
	warn "ERROR: $@" if $@;
	
	+{
		oauth    => $oauth,
		user     => $user,
		provider => $oauth->{oauth_provider},
	};
}

1;
