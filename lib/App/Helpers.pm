package App::Helpers;
use Mojo::Base 'Mojolicious::Plugin';

no strict 'refs';

use Util;
use dw; our $dw;

sub register {
	my $self = shift;
	
	$self->user(@_);
	
	$self->etc (@_);
	$self->util(@_);
}


sub user {
	my ($self, $app, $conf) = @_;
	
	$app->helper(user_logged => sub {
		my $self = shift;
		my $USER = shift || $self->stash('USER');
		
		return $USER && $USER->{id};
	});
	
	$app->helper(user_admin => sub {
		my $self = shift;
		my $USER = shift || $self->stash('ADMIN');
		
		return $USER;
	});
	
	$app->helper(user_name => sub {
		my $self = shift;
		my $USER = shift || $self->stash('USER');
		
		return $USER->{name};
	});
	
	$app->helper(user_iam => sub {
		my $self = shift;
		my $user = shift || return;
		my $USER = $self->stash('USER');
		
		return $USER && $user->{id} == $USER->{id};
	});
}

sub etc {
	my ($self, $app, $conf) = @_;
	
	$app->helper(text_fix => sub {
		my $self = shift;
		my $text = shift || return;
		
		$text =~ s/\&(l|r)aquo;//sg;
		$text =~ s/\&amp;/&/sg;
		$text =~ s/"//sg;
		
		return $text;
	});
	
	$app->helper(img_thumb => sub {
		my $self = shift;
		my ($url, $w, $h) = @_;
		
		"http://pulsecontentserver.appspot.com/image?link=$url&width=$w&height=$h";
	});
}

sub util {
	my ($self, $app, $conf) = @_;
	
	$app->helper(dw => sub { $dw ||= dw->new(db => shift->db) });
	$app->helper(u  => sub {
		my $self = shift;
		my $func = shift || return;
		
		return &{"Util::$func"};
	});
	
	$app->helper(cur_path => sub { shift->tx->req->url->path || '' });
}

1;
