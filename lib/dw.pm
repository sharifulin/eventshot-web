package dw;
use Mojo::Base -base;

has 'db';

use Data::Lazy::BUD::SLICELY;
use Data::Stuff;

{
	no strict 'refs';
	for my $x (qw(user)) {
		*{"dw::g::$x"} = sub { my $self = shift; my $f = shift;
			GROUP {$_->{$f}} $self->$x( $self->db->select("select * from $x where $f" . $self->db->in(@$_)) )
		};
	}
	
	for my $x (qw(admin)) {
		*{"dw::$x"} = sub { $_[1] };
	}
}

1;

__END__
sub user { my $self = shift;
	SLICELY { $self->dw::g::session('user_id') } 'id' => 'sessions' =>
	SLICELY { $self->dw::g::video  ('user_id') } 'id' => 'videos' =>
	
	$_[0];
}

sub session { my $self = shift;
	SLICELY { CHV {$_->[0]} $self->dw::g::user('id') } 'user_id' => 'user' =>
	
	$_[0];
}

sub video { my $self = shift;
	SLICELY { CHV {$_->[0]} $self->dw::g::user('id') } 'user_id' => 'user' =>
	
	$_[0];
}

1;
