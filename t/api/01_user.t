#!/usr/bin/env perl
use common::sense;
use lib qw(.. /tk/mojo4/lib t/api);

use Test::Mojo;
use Test::More;

use ApiTest 'sign';
use Data::Dumper;

my $t = Test::Mojo->new;
my $data;

note "App/Api/User.pm";
note "/user - AUTH ERROR";
$t->get_ok($ApiTest::URL . '/user')
  ->status_is(200)
  ->content_is(q({"error":{"msg":"User authorization failed","code":2}}))
;

note "/user - BAD PARAMS";	
$t->get_ok($ApiTest::URL . '/user?uuid=99999999999')
  ->status_is(200)
  ->content_is(q({"error":{"subcode":44,"msg":"Bad parameters","submsg":"User not found","code":4}}))
;

note "/user - GET USER";
my $user = $ApiTest::DB->select('select * from user limit 1')->[0];
$t->get_ok($ApiTest::URL . "/user?uuid=$user->{uuid}")
  ->status_is(200)
  ->json_is('/user/id', $user->{id})
  ->json_has('/user/prodivers')
;

done_testing;
