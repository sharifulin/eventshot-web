package App::Base;

use Mojo::Base;
use common::sense;

# code from Mojo::Base

sub import {
	my $class = shift;

	# Flag
	return unless my $flag = shift;
	
	# Args
	my %args = @_;
	
	# Caller
	my $caller = caller;

	# No limits!
	no strict 'refs';
	no warnings 'redefine';

	# Base
	if ($flag eq '-base') { $flag = 'Mojo::Base' }
	
	# Controller
	elsif ($flag eq '-controller') { $flag = 'Mojolicious::Controller' }
	
	# Module
	unless ($flag->can('new')) {
		my $file = $flag;
		$file =~ s/::|'/\//g;
		require "$file.pm";
	}

	# ISA
	push @{"${caller}::ISA"}, $flag;

	# Can haz?
	*{"${caller}::has"} = sub { Mojo::Base::attr($caller, @_) };
	
	# With Loader
	if (my $with = $args{with}) {
		for my $m (ref $with eq 'ARRAY' ? @$with : $with) {
			my $file = $m;
			$file =~ s/::|'/\//g;
			
			require "$file.pm" unless $m->can('new');
			
			# Can attr?
			my $attr = lc $m;
			$attr =~ s/^app:://;
			$attr =~ s/::|'/_/g;
			
			Mojo::Base::attr($caller, $attr, sub { $m->new(%{ +shift }) });
		}
	}
	
	# App modules are common sense!
	common::sense->import;
}

1;
