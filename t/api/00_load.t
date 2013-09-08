#!/usr/bin/env perl
use common::sense;
use lib qw(.. /tk/mojo4/lib t/api);

use Test::Mojo;
use Test::More;
use ApiTest 'sign';

my $t   = Test::Mojo->new;
my $url = $ApiTest::URL;

# 4.0!

use Mojolicious;
like $Mojolicious::VERSION, qr/^4\.\d+$/, 'Check Mojolicious 4.0';

# base

note 'Check base methods...';

$t->get_ok("$url/")
  ->status_is(200)
  # ->header_is('Access-Control-Allow-Origin', '*')
  ->json_is({hello => 'EventShot'})
;

$t->get_ok("$url/foobar")
  ->status_is(200)
  ->content_is(q({"error":{"msg":"Bad request","code":5}}))
;

done_testing;
