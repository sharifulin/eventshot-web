package App::Api::Validate;
use App::Base -controller;

# XXX: need Validate engine

sub event_create {
	my $self  = shift;
	my $error = {
		(map { $_ => 'empty'     } grep { !$self->req->param($_) } qw(start_date end_date providers)),
		(map { $_ => 'incorrect' } grep {  $self->req->param($_) && $self->req->param($_) !~ /^\d{4}-\d{2}-\d{2}/ } qw(start_date end_date)),
	};
	
	if (%$error) {
		$self->stash(error => $error);
		return;
	}
	
	my $end = $self->req->param('end_date');
	$self->req->param(end_date => "$end 23:59:59") unless $end =~ /:/;
	
	return 1;
}

1;
