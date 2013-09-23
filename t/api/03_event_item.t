#!/usr/bin/env perl
use common::sense;
use lib qw(.. /tk/mojo4/lib t/api);

use Test::Mojo;
use Test::More;

use ApiTest 'sign';

my $t = Test::Mojo->new;
my $user       = $ApiTest::DB->select('select * from user limit 1')->[0];
my $event_item = $ApiTest::DB->select('select * from event_item where hidden = 0 and user_id = ? limit 1', $user->{id})->[0];
my $id         = $event_item->{id};
my $uuid       = $user->{uuid};

note "App/Api/EventItem.pm";
note '/event_item/ID/update - AUTH ERROR';	
$t->post_ok($ApiTest::URL . "/event_item/$id/update")
  ->status_is(200)
  ->content_is(q({"error":{"msg":"User authorization failed","code":2}}))
;
	
note '/event_item/ID/update - BAD PARAMS';	
$t->post_ok($ApiTest::URL . "/event_item/$id/update?uuid=99999999999")
  ->status_is(200)
  ->content_is(q({"error":{"subcode":44,"msg":"Bad parameters","submsg":"User not found","code":4}}))
;
	
note '/event_item/ID/update - SET HIDDEN 1';
my $data = $t->post_ok($ApiTest::URL . "/event_item/$id/update", 'form', { hidden => 1, uuid => $uuid })
	->status_is(200)
	->tx->res->json
;
{
	is($data->{event_item}->{hidden}, 1, 'hidden = 0');	
}

note '/event_item/ID/update - SET HIDDEN 0';
$data = $t->post_ok($ApiTest::URL . "/event_item/$id/update", 'form', { hidden => 0, uuid => $uuid })
	->status_is(200)
	->tx->res->json
;
{
	is($data->{event_item}->{hidden}, 0, 'hidden = 0');	
}

done_testing;
