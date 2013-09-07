package ApiTest;
use common::sense;
use lib qw(.. /tk/mojo4/lib);

use Encode;
use Mojo::URL;
use Mojo::Util;

require Exporter;
our @ISA       = 'Exporter';
our @EXPORT    = 'sign';
our @EXPORT_OK = 'sign';

use Mojo::Server;
my $self = Mojo::Server->load_app('script/eventshot');

our $conf = $self->conf || die "Can't find conf of app\n";
our $DB   = $self->db;
our $URL  = $conf->{server}->{api};

sub sign($$;$$) {
	my $method = shift;
	my $url    = Mojo::URL->new($URL . shift);
	
	my($param, $auth) = @_ == 2 ? @_ : ({}, $_[0]);
	
	my  $new = $url->query->to_hash;
	if(%$new) {
		$param->{$_} = $new->{$_} for keys %$new;
	}
	
	$param->{api_id} //= 1;
	
	# remove files
	my $file = {};
	$file->{$_} = delete $param->{$_} for grep { ref $param->{$_} } keys %$param;
	
	my $secret = $conf->{defaults}->{api_key}->[$param->{api_id} ? $param->{api_id}-1 : 0]->[1]->{secret};
	
	my $key = join '',
		$auth->{'X-Session-Auth'},
		(map { Encode::_utf8_off $param->{$_}; "$_=$param->{$_}" } sort keys %$param),
		$url->path,
		$secret,
	;
	
	$param->{sign} = Mojo::Util::md5_sum $key;
	
	if ($method eq 'get') {
		$url->query([ %$param ]);
		return ($url->to_abs, $auth);
	}
	else {
		return ($url->to_abs, $auth, $method eq 'post' ? 'form' : (), {%$param, %$file});
	}
}

1;
