#!/usr/bin/env perl
use lib qq(/tk/mojo4/lib);
use v5.10;
use common::sense;

use Mojo::UserAgent;
use Data::Dumper;

my $ua  = Mojo::UserAgent->new;

my $country = $ARGV[0] || 'RU';
my $city    = $ARGV[1] || 'Moscow';
my $date    = $ARGV[2] || '2006-04-05';

$date =~ s/-//g;

my $access_token = '9f0bd8f58f379487';
my $url = "http://api.wunderground.com/api/$access_token/history_$date/q/$country/$city.json";
say $url;

my $result = $ua->get($url)->res->json;
my $weather = $result->{history}->{observations}->[11];


my $icon    = $weather->{icon};
my $tempm   = $weather->{tempm};
my $wspdi   = $weather->{wspdi};
my $hum     = $weather->{hum};
my $precipm = $weather->{precipm};

my $title = "$tempm C, $wspdi mph, $hum %";

my $icon_url = "http://icons.wxug.com/i/c/k/$icon.gif";
say $icon_url;
say $title;
