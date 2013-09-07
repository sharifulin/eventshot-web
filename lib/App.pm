package App;
use Mojo::Base 'Mojolicious';

has conf => sub { do 'conf/app.conf' };
has db   => sub { use Util; Util->db(do 'conf/mysql.conf', {mysql_client_found_rows => 0}) }; # for updates

sub startup {
	my $self = shift;
	my $conf = $self->conf;
	
	push @{$self->static  ->paths}, $conf->{path}->{data};
	push @{$self->renderer->paths}, $conf->{path}->{tmpl};
	
	$self->secret( $conf->{secret} ) if $conf->{secret};
	$self->log( Mojo::Log->new( %{$conf->{log}} ) ) if $conf->{log};
	
	if (my $s = $conf->{session}) {
		$self->sessions->cookie_name( $s->{name} );
		$self->sessions->cookie_domain( $s->{domain} );
		$self->sessions->default_expiration( $s->{expires} );
	}
	
	if (my $d = $conf->{defaults}) {
		$self->defaults( $d );
		
		for (keys %$d) {
			next unless ref $d->{$_} eq 'ARRAY';
			$self->defaults($_ . '_hash' => { map { $_->[0] => $_->[1] } @{ $d->{$_} } });
		}
	}
	
	# plugins
	
	$self->plugin(mail => {
		from => $conf->{mail}->{from},
		type => 'text/html',
	});
	
	# helpers
	
	$self->plugin(  'api_helpers', {error_msg => {
		21 => 'Bad session', 22 => 'Bad user',
		41 => 'No signature', 44 => 'User not found',
		50 => 'Inernal server error', 51 => 'Bad signature', 52 => 'Not found api_id',
	}});
	
	$self->plugin( 'util_helpers');
	$self->plugin('share_helpers');
	
	$self->plugin( 'App::Helpers');
	
	#
	
	my $r = $self->routes;
	
	$r->route->to('index#main')->name('index');
	
	# admin
	
	my $ar = $r->route('/admin')->to(admin => 1)->name('admin_index');
	$ar->route('/login')->post->to('admin-enter#login');
	$ar->route('/forgot')->to('admin-enter#forgot');
	
	my $a = $ar->bridge->to('admin-enter#check');
	$a->route->to('admin-enter#index');
	$a->route('/logout')->to('admin-enter#logout');
	
	$a->crud($_ => "admin-$_") for qw(admin user);

	# api
	
	my $api  = $r->route('/api')->to('api#', api => 1);
	
	my $apis = $api->bridge->to('#sign', sign => 1);
	$apis->route('/test')->to('api#hello');
	
	# my $apiu = $apis->bridge->to('#auth');
	# $apiu->route('/session')->to('api-user#new_session');
	
	$api->bridge('/')->to('#sign', maybe => 1, sign => 0)->route->to('#hello');
	$api->route ('/(*any)')->to('#any');
	
	$self->hook(after_dispatch => sub {
		my $c = shift;
		
		# error for api
		if ($c->stash('api')) {
			return $c->api_error(code => 4, subcode => 44) if $c->res->code eq 404;
			return $c->api_error(code => 5, subcode => 50) if $c->res->code eq 500;
		}
	});
	
	# api debug
	
	if ($self->conf->{api_trace}) {
		$self->hook(before_dispatch => sub {
			my $c = shift;
			if ( $c->req->url =~ /api/ ) {
				warn '--------->Request: ' . $c->req->to_string . "\n\n";
			}
		});
		
		$self->hook(after_dispatch => sub {
			my $c = shift;
		
			if ( $c->req->url =~ /api/ ) {
				warn '<--------Response: ' . $c->res->to_string . "\n\n";
			}
		});
	}
}

1;
