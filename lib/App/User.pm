package App::User;
use App::Base -controller;

sub check {
	my $self = shift;
	my $uuid = $self->get_cookie('uuid');
	
	# XXX: simple check
	
	unless ($uuid) {
		$uuid = $self->_generate_uuid;
		
		warn qq(Create new user "$uuid"...);
		$self->db->query('insert into user set uuid=?, created=now()', $uuid);
		
		$self->res->cookies({
			name  => 'uuid',
			value => $uuid,
			path  => '/',
		});
	}
	
	my $user = $self->_load_user($uuid);
	unless ($user) {
		$self->res->cookies({name => 'uuid', value => '', expires => time - 60*60*365});
		$self->redirect('/');
		return 0;
	}
	
	1;
}

sub _load_user {
	my $self = shift;
	my $uuid = shift || return;
	
	my $user = $self->dw->user($self->db->select('select * from user where uuid=? limit 1', $uuid))->[0] || return;
	$user->{provider}->{$_->{type}} = $_ for @{$self->db->select('select * from user_provider where user_id=?', $user->{id})};
	
	$self->stash(USER => $user);
}

sub _generate_uuid {
	my $self = shift;
	my $udid = join '-', $self->u('gen_rand', 32), time, rand $$;

	uc Mojo::Util::md5_sum $udid;
}

1;