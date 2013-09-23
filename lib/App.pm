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
	
	$self->plugin(o_auth => $conf->{oauth});
	$self->plugin(mail   => {
		from => $conf->{mail}->{from},
		type => 'text/html',
	});
	
	# helpers
	
	$self->plugin('api_helpers', {error_msg => {
		44 => 'User not found', 50 => 'Inernal server error', 51 => 'Bad signature',
	}});
	
	$self->plugin( 'util_helpers');
	$self->plugin('share_helpers');
	
	$self->plugin( 'App::Helpers');
	
	#
	
	my $r = $self->routes;
	
	# check user
	
	my $u = $r->bridge->to('user#check');
	$u->route->to('index#main')->name('index');
	
	# oauth
	
	$r->route('/login/:provider')->to('user-provider#oauth_session')->name('login');
	
	$r->route('/oauth/error'    )->to('user-provider#oauth_error');
	$r->route('/oauth/redirect' )->to('user-provider#oauth_redirect');
	$r->route('/oauth/:provider')->to('user-provider#oauth');
	
	# admin
	
	my $ar = $r->route('/admin')->to(admin => 1)->name('admin_index');
	$ar->route('/login')->post->to('admin-enter#login');
	$ar->route('/forgot')->to('admin-enter#forgot');
	
	my $a = $ar->bridge->to('admin-enter#check');
	$a->route->to('admin-enter#index');
	$a->route('/logout')->to('admin-enter#logout');
	
	$a->crud($_ => "admin-$_") for qw(admin user);

	# api
	
	my $api = $r->route('/api')->to('api#', api => 1);
	$api->route('/test')->to('api#hello');
	
	my $apiu = $api->bridge->to('#auth');
	$apiu->route('/user')->get->to('api-user#profile');
	
	$apiu->route('/event')->get->to('api-event#list');
	$apiu->route('/event/create')->post->to('api-event#create');
	
	my $apiei = $apiu->bridge('/event_item/:id', id => qr/\d+/)->to('api-event_item#check');
	$apiei->get->to('api-event_item#item');
	$apiei->route('/update')->post->to('api-event_item#update');
	#$apiei->route('/update')->to('api-event_item#update');
	
	my $apie = $apiu->bridge('/event/:id', id => qr/\d+/)->to('api-event#check');
	$apie->get ->to('api-event#item');
	$apie->post->to('api-event#update');
	$apie->post->to('api-event#remove');

	# HACK
	$apie->route('/start')->post->to('api-event#start');
	
	# XXX: delete, for tests
	$apie->route('/update')->to('api-event#update');
	$apie->route('/remove')->to('api-event#remove');
	
	$api->route->to('#hello');
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
