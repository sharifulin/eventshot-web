#!/usr/bin/env perl
use common::sense;
use lib qw(.. /tk/mojo4/lib t/api);

use Test::Mojo;
use Test::More;

use ApiTest 'sign';
use Data::Dumper;

my $t = Test::Mojo->new;
my $data;
my $user = $ApiTest::DB->select('select * from user limit 1')->[0];

# list
# if (0)
{
	note 'Check event list...';
	
	$t->get_ok($ApiTest::URL . '/event')
	  ->status_is(200)
	  ->content_is(q({"error":{"msg":"User authorization failed","code":2}}))
	;
	
	$t->get_ok($ApiTest::URL . '/event?uuid=99999999999')
	  ->status_is(200)
	  ->content_is(q({"error":{"subcode":44,"msg":"Bad parameters","submsg":"User not found","code":4}}))
	;
	
	warn $t->get_ok($ApiTest::URL . "/event?uuid=$user->{uuid}")
	  ->status_is(200)
	  ->json_is('/events')
	  ->tx->res->to_string
	;
}

# XXX

# one

# update

# remove

# create
if (0)
{
	note 'Check event create...';
	
	$t->get_ok($ApiTest::URL . '/event/create')
	  ->status_is(200)
	  ->content_is(q({"error":{"msg":"Bad request","code":5}}))
	;
	
	$t->post_ok($ApiTest::URL . '/event/create')
	  ->status_is(200)
	  ->content_is(q({"error":{"msg":"User authorization failed","code":2}}))
	;
	
	$t->post_ok($ApiTest::URL . '/event/create?uuid=99999999999')
	  ->status_is(200)
	  ->content_is(q({"error":{"subcode":44,"msg":"Bad parameters","submsg":"User not found","code":4}}))
	;
	
	$t->post_ok($ApiTest::URL . "/event/create", 'form', {uuid => $user->{uuid}})
	  ->status_is(200)
	  ->content_is(q({"error":{"params":{"providers":"empty","end_date":"empty","start_date":"empty"},"msg":"Bad parameters: end_date, providers, start_date","code":4}}))
	;
	
	warn $t->post_ok($ApiTest::URL . "/event/create", 'form', {
		uuid       => $user->{uuid},
		start_date => '2013-09-01',
		end_date   => '2013-09-06',
		providers  => 'instagram,foursquare',
	})
	  ->status_is(200)
	  ->json_has('/event/id')
	  ->json_has('/event/startDate')
	  ->json_has('/event/endDate')
	  ->json_has('/event/created')
	  ->json_has('/event/providers')
	  ->tx->res->to_string
	;
}

done_testing;
