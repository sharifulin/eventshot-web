#!/usr/bin/env perl
use common::sense;
use lib qw(.. /tk/mojo4/lib t/api);

use Test::Mojo;
use Test::More;

use ApiTest 'sign';
use Data::Dumper;

my $t = Test::Mojo->new;
my $data;

# user signup
{
	note 'Check user signup...';
	
	$t->get_ok($ApiTest::URL . '/user/signup')
	  ->status_is(200)
	  ->content_is(q({"error":{"subcode":41,"msg":"Bad parameters","submsg":"No signature","code":4}}))
	;

	$t->get_ok(sign get => '/user/signup')
	  ->status_is(200)
	  ->content_is(q({"error":{"params":{"os_version":"empty","app_version":"empty","udid":"empty","name":"empty","phone":"empty","os":"empty"},"msg":"Bad parameters: app_version, name, os, os_version, phone, udid","code":4}}))
	;

	$t->get_ok(sign get => '/user/signup?api_id=2')
	  ->status_is(200)
	  ->content_is(q({"error":{"params":{"os_version":"empty","app_version":"empty","udid":"empty","name":"empty","phone":"empty","os":"empty"},"msg":"Bad parameters: app_version, name, os, os_version, phone, udid","code":4}}))
	;

	$t->get_ok(sign get => '/user/signup?udid=test&os=iOS&os_version=6.1.4&device=test&app_version=0.0.1')
	  ->status_is(200)
	  ->content_is(q({"error":{"params":{"name":"empty","phone":"empty"},"msg":"Bad parameters: name, phone","code":4}}))
	;

	$t->get_ok(sign get => '/user/signup?udid=test&os=iOS&os_version=6.1.4&device=test&app_version=0.0.1&name=122323&phone=2323')
	  ->status_is(200)
	  ->content_is(q({"error":{"params":{"name":"incorrect","phone":"incorrect"},"msg":"Bad parameters: name, phone","code":4}}))
	;

	$t->get_ok(sign get => '/user/signup?udid=test&os=iOS&os_version=6.1.4&device=test&app_version=0.0.1&name=test&phone=+79651205540')
	  ->status_is(200)
	  ->content_is(q({"error":{"params":{"phone":"incorrect"},"msg":"Bad parameters: phone","code":4}}))
	;
	
	my $phone = Mojo::Util::url_escape '+79651205540';
	$data = $t->get_ok(sign get => "/user/signup?udid=test&os=iOS&os_version=6.1.4&device=test&app_version=0.0.1&name=test&phone=$phone")
	  ->status_is(200)
	  ->json_is('/ok', 1)
	  ->json_has('/user_id')
	  ->tx->res->json
	;
}

# user verify
{
	note 'Check user verify...';
	
	my $code = $data->{code};
	my $uid  = $data->{user_id};
	
	$t->get_ok($ApiTest::URL . '/user/verify')
	  ->status_is(200)
	  ->content_is(q({"error":{"subcode":41,"msg":"Bad parameters","submsg":"No signature","code":4}}))
	;

	$t->get_ok(sign get => '/user/verify')
	  ->status_is(200)
	  ->content_is(q({"error":{"params":{"user_id":"empty","code":"empty"},"msg":"Bad parameters: code, user_id","code":4}}))
	;
	
	$t->get_ok(sign get => '/user/verify?user_id=sdsdsd&code=33743')
	  ->status_is(200)
	  ->content_is(q({"error":{"params":{"code":"incorrect"},"msg":"Bad parameters: code","code":4}}))
	;
	
	$t->get_ok(sign get => "/user/verify?user_id=sdsdsd&code=$code")
	  ->status_is(200)
	  ->content_is(q({"error":{"params":{"code":"incorrect"},"msg":"Bad parameters: code","code":4}}))
	;
	
	$data = $t->get_ok(sign get => "/user/verify?user_id=$uid&code=$code")
	  ->status_is(200)
	  ->json_is('/ok', 1)
	  ->json_has('/session_id')
	  ->tx->res->json
	;
}

# session
{
	note 'Check new session...';
	
	my $sid = $data->{session_id};
	
	$t->get_ok($ApiTest::URL . '/session')
	  ->status_is(200)
	  ->content_is(q({"error":{"subcode":41,"msg":"Bad parameters","submsg":"No signature","code":4}}))
	;

	$t->get_ok(sign get => '/session')
	  ->status_is(200)
	  ->content_is(q({"error":{"msg":"User authorization failed","code":2}}))
	;
	
	$t->get_ok(sign get => '/session', {'X-Session-Auth' => 'sasassas'})
	  ->status_is(200)
	  ->content_is(q({"error":{"subcode":21,"msg":"User authorization failed","submsg":"Bad session","code":2}}))
	;
	
	$t->get_ok(sign get => '/session', {'X-Session-Auth' => $sid})
	  ->status_is(200)
	  ->json_is('/ok', 1)
	  ->json_has('/session_id')
	;
}

done_testing;
