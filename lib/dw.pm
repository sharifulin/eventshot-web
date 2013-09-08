package dw;
use Mojo::Base -base;

has 'db';

use Data::Lazy::BUD::SLICELY;
use Data::Stuff;

{
	no strict 'refs';
	for my $x (qw(user user_provider event event_item queue)) {
		*{"dw::g::$x"} = sub { my $self = shift; my $f = shift;
			GROUP {$_->{$f}} $self->$x( $self->db->select("select * from $x where $f" . $self->db->in(@$_)) )
		};
	}
	
	for my $x (qw(admin)) {
		*{"dw::$x"} = sub { $_[1] };
	}
}

sub user { my $self = shift;
	SLICELY { $self->dw::g::event        ('user_id') } 'id' => 'events' =>
	SLICELY { $self->dw::g::user_provider('user_id') } 'id' => 'providers' =>
	# SLICELY { $self->dw::g::session('user_id') } 'id' => 'sessions' =>
	
	$_[0];
}

sub user_provider { my $self = shift;
	SLICELY { CHV {$_->[0]} $self->dw::g::user('id') } 'user_id' => 'user' =>
	
	$_[0];
}

# sub session { my $self = shift;
# 	SLICELY { CHV {$_->[0]} $self->dw::g::user('id') } 'user_id' => 'user' =>
# 	
# 	$_[0];
# }

sub event { my $self = shift;
	SLICELY { CHV {$_->[0]} $self->dw::g::user      ('id')       } 'user_id' => 'user' =>
	SLICELY {               $self->dw::g::event_item('event_id') } 'id'      => 'items' =>
	SLICELY {               $self->dw::g::queue     ('event_id') } 'id'      => 'queues' =>
	
	$_[0];
}

sub event_item { my $self = shift;
	SLICELY { CHV {$_->[0]} $self->dw::g::user ('id')       } 'user_id'  => 'user'  =>
	SLICELY { CHV {$_->[0]} $self->dw::g::event('id')       } 'event_id' => 'event' =>
	
	$_[0];
}

sub queue { my $self = shift;
	SLICELY { CHV {$_->[0]} $self->dw::g::user ('id')       } 'user_id'  => 'user'  =>
	SLICELY { CHV {$_->[0]} $self->dw::g::event('id')       } 'event_id' => 'event' =>
	
	$_[0];
}

1;
