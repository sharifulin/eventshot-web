package App::Api::Event;
use App::Base 'App::Api', with => 'App::Api::Validate';

sub list {
	my $self = shift;
	my $USER = $self->stash('USER');
	
	my $list = $self->dw->event($self->db->select('select * from event where user_id=?', $USER->{id}));
	
	$self->render('json', {
		events => [ map $self->_item($_, 'no_entries'), @$list ]
	});
}

sub check {
	my $self = shift;
	
	# XXX: should check user?
	$self->api_error(code => 4), return 0
		unless my $item = $self->dw->event($self->db->select('select * from event where id=?', $self->stash('id')))->[0]
	;
	
	$self->stash(item => $item);
	return 1;
}

sub item {
	my $self = shift;
	
	$self->render('json', {event => $self->_item});
}

#

sub create {
	my $self = shift;
	my $USER = $self->stash('USER');
	
	return $self->_error unless $self->api_validate->event_create;
	
	$self->db->query(
		'insert into event set user_id=?, start_date=?, end_date=?, created=now()',
		$USER->{id}, map {$self->req->param($_) || undef } qw(start_date end_date),
	);
	$self->stash(id => my $id = $self->db->{mysql_insertid});
	
	if (my @p = grep $_, split /\s*,\s*/, $self->req->param('providers')) {
		my $time = $self->u('time2iso');
		
		$self->db->query(
			'insert into queue (event_id, user_id, type, created) ' . $self->db->values(
				map { [$id, $USER->{id}, $_, $time] } @p
			)
		);
	}
	
	$self->check;
	$self->render('json', {event => $self->_item(undef, 'no_entries,no_main')});
}

sub start {
	my $self = shift;
	my $item = $self->stash('item');
	
	warn qx(cd script/data; ./find_items.pl);
	
	$self->check;
	$self->render('json', {event => $self->_item});
}

sub update {
	my $self = shift;
	my $item = $self->stash('item');
	
	my $set  = join ', ',
		'updated=now()',
		map { $self->req->param($_) ? "$_=" . $self->db->quote($self->req->param($_)) : () } qw(title description soundtrack)
	;
	
	$self->db->query("update event set $set where id=?", $item->{id});
	
	$self->check;
	$self->render('json', {event => $self->_item});
}

sub remove {
	my $self = shift;
	my $item = $self->stash('item');
	
	$self->db->query('delete from event where       id=?', $item->{id});
	$self->db->query("delete from $_    where event_id=?", $item->{id}) for qw(event_item queue);
	
	$self->render('json', {ok => 1});
}

#

sub _item {
	my $self = shift;
	my $item = shift || $self->stash('item') || return;
	my $flag = shift || '';
	
	my $f = $self->req->param('provider');
	my $e =  [
		sort { $a->{data}->{created} cmp $b->{data}->{created} }
		map { 
			my $h = {
				id     => $_->{id},
				source => $_->{type},
				type   => $_->{data} =~ /photo'\s*=>\s*'http/ ? 'photo' : 'text',
				data   => eval $_->{data},
			};
			
			$f ? $f eq $_->{type} ? $h : () : $h;
		}
		@{ $item->{items}||[] }
	];
	
	+{
		(map { $_ => $item->{$_} } qw(id title description soundtrack status created)),
		
		startDate => $item->{start_date},
		endDate   => $item->{end_date  },
		providers => [ map $_->{type}, @{$item->{queues}||[]} ],
		
		# XXX
		progress  => {wait => 10, progress => '30', ready => '100', error => '0'}->{$item->{status}} || 1 + int rand 100,
		
		$flag !~ /no_entries/ ? (entries    => $e) : (),
		$flag !~ /no_main/    ? (main_entry => [grep $_->{type} eq 'photo', @$e]->[0]) : (),
	};
}

1;
