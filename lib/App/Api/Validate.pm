package App::Api::Validate;
use App::Base -controller;

# XXX: need Validate engine

sub user_signup {
	my $self  = shift;
	my $error = {
		(map { $_ => 'empty'     } grep { !$self->req->param($_) } qw(name phone udid app_version os os_version)),
		(map { $_ => 'incorrect' } grep {  $self->req->param($_) && $self->req->param($_) !~ /^[A-Za-zА-Яа-я\- ]+$/ } 'name'),
		(map { $_ => 'incorrect' } grep {  $self->req->param($_) && $self->req->param($_) !~ /^\+?\d{10,13}$/ } 'phone'),
	};
	
	if (%$error) {
		$self->stash(error => $error);
		return;
	}
	
	return 1;
}

1;
