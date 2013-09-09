#!/usr/bin/env perl
use common::sense;
use lib qw(.. /tk/mojo4/lib t/api);

use Test::Mojo;
use Test::More;

use ApiTest 'sign';
use Data::Dumper;

my $t    = Test::Mojo->new;
my $user = $ApiTest::DB->select('select * from user limit 1')->[0];

my $data;
my $date_reg = qr/^\d{4}-\d{2}-\d{2}.\d{2}:\d{2}:\d{2}Z?$/; 

### GET ALL EVENTS
note "App/Api/Event.pm";
note '/event - AUTH ERROR';	
$t->get_ok($ApiTest::URL . '/event')
  ->status_is(200)
  ->content_is(q({"error":{"msg":"User authorization failed","code":2}}))
;
	
note '/event - BAD PARAMS';	
$t->get_ok($ApiTest::URL . '/event?uuid=99999999999')
  ->status_is(200)
  ->content_is(q({"error":{"subcode":44,"msg":"Bad parameters","submsg":"User not found","code":4}}))
;
	
note '/event - GET ALL EVENTS';
$data = $t->get_ok($ApiTest::URL . "/event?uuid=$user->{uuid}")
	->status_is(200)
	->tx->res->json
;
{
	my $events = $data->{events};
	is(exists $data->{events}, 1, 'Events exists');
	is(ref $events, 'ARRAY', 'Event items is array');

	# event
	my $event = $events->[0];
	for (qw(created description endDate main_entry id progress providers soundtrack startDate status title)) {
		is(exists $event->{$_}, 1, "event: $_ exists");
	}

	like($event->{id}, qr/^\d+$/, 'event: id is OK');
	like($event->{progress}, qr/^\d+$/, 'event: progress is OK');
	like($event->{status}, qr/^error|progress|ready|wait$/, 'event: status is OK');
	
	for (qw(created endDate startDate)) {
		like($event->{$_}, $date_reg, "event: $_ is OK");
	}

	for (@{ $event->{providers} }) {
		like($_, qr/^facebook|foursquare|instagram|twitter$/, "provider: $_ is OK");
	}

	# main entry
	check_event_item($event->{main_entry});
}

### CREATE EVENT
note "/event/create - BAD REQUEST";
$t->get_ok($ApiTest::URL . '/event/create')
  ->status_is(200)
  ->content_is(q({"error":{"msg":"Bad request","code":5}}))
;

note "/event/create - AUTH ERROR";
$t->post_ok($ApiTest::URL . '/event/create')
  ->status_is(200)
  ->content_is(q({"error":{"msg":"User authorization failed","code":2}}))
;

note "/event/create - BAD PARAMS";
$t->post_ok($ApiTest::URL . '/event/create?uuid=99999999999')
  ->status_is(200)
  ->content_is(q({"error":{"subcode":44,"msg":"Bad parameters","submsg":"User not found","code":4}}))
;

note "/event/create - EMPTY PARAMS";
$t->post_ok($ApiTest::URL . "/event/create", 'form', { uuid => $user->{uuid} })
  ->status_is(200)
  ->content_is(q({"error":{"params":{"providers":"empty","end_date":"empty","start_date":"empty"},"msg":"Bad parameters: end_date, providers, start_date","code":4}}))
;

my $id;
note "/event/create - CREATE EVENT";
$data = $t->post_ok($ApiTest::URL . "/event/create", 'form', {
	uuid       => $user->{uuid},
	start_date => '2013-09-01',
	end_date   => '2013-09-06',
	providers  => 'instagram,foursquare',
})
  ->status_is(200)
  ->tx->res->json
;
{
	my $event = $data->{event};
	check_event($event);
	check_event_spec($event);
	$id = $event->{id};
}

### EVENT START
note "/event/ID/update - AUTH ERROR";
$t->post_ok($ApiTest::URL . "/event/$id/start")
  ->status_is(200)
  ->content_is(q({"error":{"msg":"User authorization failed","code":2}}))
;

note '/event/ID/update - BAD PARAMS';	
$t->post_ok($ApiTest::URL . "/event/$id/start?uuid=99999999999")
  ->status_is(200)
  ->content_is(q({"error":{"subcode":44,"msg":"Bad parameters","submsg":"User not found","code":4}}))
;

note '/event/ID/update - WRONG EVENT ID';
$t->post_ok($ApiTest::URL . "/event/0/start", 'form', { uuid => $user->{uuid} })
	->status_is(200)
	->content_is(q({"error":{"msg":"Bad parameters","code":4}}))
;

note "/event/start - GENERATE EVENT_ITEM FOR EVENT";
$data = $t->post_ok($ApiTest::URL . "/event/$id/start", 'form', { uuid => $user->{uuid} })
  ->status_is(200)
  ->tx->res->json
;
{
	my $event = $data->{event};
	is($event->{status}, 'ready', 'Status is ready');
	is($event->{progress}, 100, 'Event is completed');

	for (@{ $event->{entries} }) {
		check_event_item($_);
	}
}

### GET ONE EVENT
note "/event/ID - AUTH ERROR";
$t->get_ok($ApiTest::URL . "/event/$id")
  ->status_is(200)
  ->content_is(q({"error":{"msg":"User authorization failed","code":2}}))
;

note '/event/ID - BAD PARAMS';	
$t->get_ok($ApiTest::URL . "/event/$id?uuid=99999999999")
  ->status_is(200)
  ->content_is(q({"error":{"subcode":44,"msg":"Bad parameters","submsg":"User not found","code":4}}))
;

note '/event/ID - WRONG EVENT ID';
$t->get_ok($ApiTest::URL . "/event/0?uuid=$user->{uuid}")
	->status_is(200)
	->content_is(q({"error":{"msg":"Bad parameters","code":4}}))
;

note '/event/ID - GET ONE EVENT';
my $data = $t->get_ok($ApiTest::URL . "/event/$id?uuid=$user->{uuid}")
	->status_is(200)
	->tx->res->json
;
{
	my $event = $data->{event};
	check_event($event);
	check_event_spec($event);
}

### EVENT UPDATE
note "/event/ID/update - AUTH ERROR";
$t->get_ok($ApiTest::URL . "/event/$id/update")
  ->status_is(200)
  ->content_is(q({"error":{"msg":"User authorization failed","code":2}}))
;

note '/event/ID/update - BAD PARAMS';	
$t->post_ok($ApiTest::URL . "/event/$id/update?uuid=99999999999")
  ->status_is(200)
  ->content_is(q({"error":{"subcode":44,"msg":"Bad parameters","submsg":"User not found","code":4}}))
;

note '/event/ID/update - WRONG EVENT ID';
$t->post_ok($ApiTest::URL . "/event/0/update", 'form', { uuid => $user->{uuid} })
	->status_is(200)
	->content_is(q({"error":{"msg":"Bad parameters","code":4}}))
;

note '/event/ID/update - UPDATE EVENT';
$data = $t->post_ok($ApiTest::URL . "/event/$id/update", 'form', {
	uuid        => $user->{uuid},
	title        => 'change trip',
	description  => 'change desc',
})
  ->status_is(200)
  ->tx->res->json
;
{
	my $event = $data->{event};
	is($event->{title}, 'change trip', 'title is changed');
	is($event->{description}, 'change desc', 'desc is changed');
}

### EVENT REMOVE
note '/event/ID/remove - REMOVE EVENT';
$data = $t->post_ok($ApiTest::URL . "/event/$id/remove", 'form', {
	uuid        => $user->{uuid},
})
  	->status_is(200)
	->content_is(q({"ok":1}))
;
	
# XXX
sub check_event {
	my $event = shift;
	for (qw(created description endDate id progress providers soundtrack startDate status title)) {
		is(exists $event->{$_}, 1, "event: $_ exists");
	}

	like($event->{id}, qr/^\d+$/, 'event: id is OK');
	like($event->{progress}, qr/^\d+$/, 'event: progress is OK');
	like($event->{status}, qr/^error|progress|ready|wait$/, 'event: status is OK');
	
	for (qw(created endDate startDate)) {
		like($event->{$_}, $date_reg, "event: $_ is OK");
	}

	for (@{ $event->{providers} }) {
		like($_, qr/^facebook|foursquare|instagram|twitter$/, "provider: $_ is OK");
	}
}

sub check_event_spec {
	my $event = shift;

	my %providers = map { $_ => 1 } @{$event->{providers}};
	like($event->{startDate}, qr/^2013-09-01/, 'startDate is the same'); 
	like($event->{endDate}, qr/^2013-09-06/, 'endDate is the same');
	is(exists $providers{instagram}, 1, 'instagram in providers');
	is(exists $providers{foursquare}, 1, 'foursquare in providers')
}

sub check_event_item {
	my $event_item = shift;

	like($event_item->{id}, qr/^\d+$/, 'event item: id is OK');
	like($event_item->{source}, qr/^facebook|foursquare|instagram|twitter$/, "event item: source is OK");
	like($event_item->{type}, qr/^photo|text|video$/, "event item: type is OK");
	is(scalar keys $event_item->{data} > 1, 1, "event item: data is OK");
}

done_testing;
