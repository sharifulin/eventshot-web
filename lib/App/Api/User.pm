package App::Api::User;
use App::Base 'App::Api';

sub profile {
	my $self = shift;
	my $USER = $self->stash('USER');
	
	$self->render('json', {
		user => {
			id        => $USER->{id},
			uuid      => $USER->{uuid},
			prodivers => [map $_->{type}, @{ $USER->{providers}||[] }],
		},
	});
}

1;
