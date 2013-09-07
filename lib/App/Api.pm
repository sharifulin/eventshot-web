package App::Api;
use App::Base -controller, with => 'App::Api::Validate';

use Encode ();
use Mojo::Util;

has api_id => 1;

sub error { shift->api_error(code => 1) }
sub any   { shift->api_error(code => 5) }

sub hello { shift->render('json', { hello => 'EventShot' }) }

#

sub sign {
	my $self = shift;
	
	if ( !$self->req->param('dev103') && $self->stash('sign') ) {
		$self->api_error(code => 4, subcode => 41), return 0
			unless $self->check_sign;
	}
	else {
		$self->stash(api_id => $self->api_id);
	}
	
	return 1;
}

sub auth {
	my $self = shift;
	
	# for test mode
	
	my $s;
	if ($self->req->param('dev103') && $self->req->param('user_id')) {
		$s->{user_id} = $self->req->param('user_id');
	}
	
	if (!$s) {
		$self->api_error(code => 2), return
			unless my $auth = $self->_get_auth;
		
		$self->api_error(code => 2, subcode => 21), return
			unless $s = $self->db->select('select * from session where sid=? limit 1', $auth)->[0];
	}
	
	# user must be verify
	$self->api_error(code => 2, subcode => 22), return
		unless my $u = $self->db->select('select * from user where id=? and verify=1 limit 1', $s->{user_id})->[0];
	
	# actived
	{
		$self->db->query('update user set actived=now() where id=?', $u->{id});
		$u->{actived} = $self->u('time2iso');
		$u->{session} = $s;
	}
	
	$self->stash(USER => $u);
	return 1;
}

sub check_sign {
	my $self  = shift;
	my $sign  = lc $self->req->param('sign') || return;
	
	my $url   = $self->req->url->path; $url =~ s{^/api}{};
	my $param = $self->req->params->to_hash; delete $param->{sign};
	
	# default api_id
	my $api_id = $self->req->param('api_id') || $self->api_id;
	
	$self->api_error(code => 5, subcode => 52), return
		unless my $api_key = $self->stash('api_key_hash')->{$api_id};

	# set api client
	
	$self->stash(api_id     => $api_id);
	$self->stash(api_client => $api_key->{name});
	
	warn
	my $key = join '',
		$self->_get_auth,
		(map { Encode::_utf8_off $param->{$_}; "$_=$param->{$_}" } sort keys %$param),
		$url,
		$api_key->{secret},
	;
	
	my $mysign = Mojo::Util::md5_sum($key);
	warn "$mysign eq $sign";
	
	$self->api_error(code => 5, subcode => 51), return
		unless $mysign eq $sign;
	
	return 1;
}

#

sub _get_auth {
	my $self = shift;
	$self->req->headers->header('X-Session-Auth') || $self->req->param('auth') || '';
}

sub _error {
	my $self = shift;
	$self->api_error(code => 4, params => $self->stash('error'));
	
	return 0;
}

1;
