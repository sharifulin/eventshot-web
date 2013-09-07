#!/usr/bin/env perl
use common::sense;
use lib qw(.. ../lib /tk/mojo4/lib);

use Mojo::Server;
my $self = Mojo::Server->load_app('./eventshot');

warn $self->dumper( $self->dw->user($self->db->select('select * from user')) );
