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
  ->header_is('Access-Control-Allow-Origin', '*')
  ->json_is({hello => 'Security Video'})
;

$t->get_ok("$url/foobar")
  ->status_is(200)
  ->content_is(q({"error":{"msg":"Bad request","code":5}}))
;

# check sign

note 'Check sign...';

$t->get_ok("$url/test")
  ->status_is(200)
  ->content_is(q({"error":{"subcode":41,"msg":"Bad parameters","submsg":"No signature","code":4}}))
;

$t->get_ok("$url/test?api_id")
  ->status_is(200)
  ->content_is(q({"error":{"subcode":41,"msg":"Bad parameters","submsg":"No signature","code":4}}))
;

$t->get_ok("$url/test?api_id=1&sign=foobar")
  ->status_is(200)
  ->content_is(q({"error":{"subcode":41,"msg":"Bad parameters","submsg":"No signature","code":4}}))
;

$t->get_ok(sign get => '/test')
  ->status_is(200)
  ->json_is({hello => 'Security Video'})
;

$t->get_ok(sign get => '/test?api_id=sdsdsdsd')
  ->status_is(200)
  ->content_is(q({"error":{"subcode":41,"msg":"Bad parameters","submsg":"No signature","code":4}}))
;

$t->get_ok(sign get => '/test?api_id=3')
  ->status_is(200)
  ->content_is(q({"error":{"subcode":41,"msg":"Bad parameters","submsg":"No signature","code":4}}))
;

$t->get_ok(sign get => '/test?api_id=2')
  ->status_is(200)
  ->json_is({hello => 'Security Video'})
;

done_testing;
