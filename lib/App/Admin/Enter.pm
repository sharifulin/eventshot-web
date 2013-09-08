package App::Admin::Enter;
use App::Base -controller, with => 'App::Admin::Validate';

sub check {
	my $self = shift;
	if ($self->check_user && $self->user_admin) {
		
		return 1;
	}
	
	$self->stash(error => { login => 'incorrect' }) if $self->req->method eq 'POST';
	$self->_form;
	return;
}

sub check_user {
	my $self = shift;
	
	if (my $user = $self->session('admin')) {
		if (time - $self->u(iso2time => $user->{updated}) > $self->conf('admin')->{active}) {
			$self->db->query('update admin set actived=now() where id=?', $user->{id});
			$user = $self->_user($user->{id});
		}
		
		$self->stash(ADMIN => $user);
	}
	else {
		$self->stash(ADMIN => undef);
	}
	
	return 1;
}

sub index {
	my $self = shift;
	# XXX: support ?redirect_url=... after login
	$self->redirect_to('admin_admin');
}

sub login {
	my $self = shift;
	return $self->_form unless $self->admin_validate->login;
	
	my $uid = $self->stash('ADMIN')->{id};
	
	$self->session(admin => $self->stash('ADMIN'));
	
	return $self->index if $self->check;
}

sub logout {
	my $self = shift;
	
	delete $self->session->{ $_ } for keys %{ $self->session };
	
	$self->redirect_to('admin_index');
}

sub forgot {
	my $self = shift;
	
	return $self->render if $self->req->method eq 'GET' || !$self->admin_validate->forgot;
	
	$self->mail(to => $self->stash('user')->{email});
	
	$self->stash(send => 1);
	$self->_form;
}

sub _form {
	shift->render('admin/enter');
}

sub _user {
	my $self = shift;
	my $uid  = shift;# || $self->stash('ADMIN') ? $self->stash('ADMIN')->{id} : return;
	
	# warn qq(Get user by id "$uid"\n);
	
	my $user = $self->db->select('select * from admin where id=? limit 1', $uid)->[0];
	delete $user->{password};
	
	$self->stash  (ADMIN => $user);
	$self->session(admin => $user);
	
	return $user;
}

1;
