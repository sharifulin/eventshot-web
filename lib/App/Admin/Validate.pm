package App::Admin::Validate;
use App::Base -controller;

# XXX: need Validate engine

sub login {
	my $self  = shift;
	
	my $user;
	my $error = {
		(map { $_ => 'empty'       } grep { !$self->req->param($_) } qw(email password)),
		(map { $_ => 'email404'    } grep {  $self->req->param($_) && do {
			$user = $self->db->select(
				'select * from admin where email=? limit 1', scalar $self->req->param($_)
			)->[0];
			!$user;
		} } 'email'),
		(map { $_ => 'badpassword' } grep {  $self->req->param($_) && $user && $self->req->param($_) ne $user->{$_} } 'password'),
	};
	
	if (%$error) {
		$self->stash(error => $error);
		return;
	}
	
	delete $user->{password};
	$self->stash(ADMIN => $user);
	
	return 1;
}

sub forgot {
	my $self  = shift;
	
	my $user;
	my $error = {
		(map { $_ => 'empty'       } grep { !$self->req->param($_) } qw(email)),
		(map { $_ => 'email404'    } grep {  $self->req->param($_) && do {
			$user = $self->db->select(
				'select * from admin where email=? limit 1', scalar $self->req->param($_)
			)->[0];
			!$user;
		} } 'email'),
	};
	
	if (%$error) {
		$self->stash(error => $error);
		return;
	}
	
	$self->stash(user => $user);
	return 1;
}

sub about {
	my $self = shift;
	
	my $error = {
		(map { $_ => 'empty' } grep { !$self->req->param($_) } 't'),
	};
	
	if (%$error) {
		$self->stash(error => $error);
		return;
	}
	
	return 1;
}

#

sub admin {
	my $self = shift;
	
	my $error = {
		(map { $_ => 'empty'       } grep { !$self->req->param($_) } qw(email password name)),
		(map { $_ => 'incorrect'   } grep {  $self->req->param($_) && $self->req->param($_) !~ /^[\w\.\-]+@[\w\.\-]+\.\w{2,4}$/ } 'email'),
		(map { $_ => 'badpassword' } grep {  $self->req->param($_) && $self->req->param($_) !~ /\w{6,32}/ } 'password'),
		
		$self->stash('action') eq 'add'
	 ?
		(
			(map { $_ => $_.'exists'   } grep {  $self->req->param($_) &&
				$self->db->select("select 1 from admin where $_=? limit 1", scalar $self->req->param($_))->[0]->{1}
			} 'email'),
		)
	 :
		(
			(map { $_ => $_.'exists'   } grep {  $self->req->param($_) && 
				$self->db->select("select 1 from admin where $_=? and id <> ? limit 1", scalar $self->req->param($_), $self->stash('item')->{id})->[0]->{1}
			} 'email'),
		)
	};
	
	if (%$error) {
		$self->stash(error => $error);
		return;
	}
	
	return 1;
}

1;
