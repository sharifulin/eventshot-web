package App::Api::Event;
use App::Base 'App::Api', with => 'App::Api::Validate';

sub list {
	my $self = shift;
	my $USER = $self->stash('USER');
	
	my $list = $self->dw->event($self->db->select('select * from event where user_id=?', $USER->{id}));
	
	$self->render('json', {
		events => [ map $self->_item($_, 'noentry'), @$list ]
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
	$self->render('json', {event => $self->_item(undef, 'noentry')});
}

sub update {
	my $self = shift;
	my $item = $self->stash('item');
	
	$self->db->query(
		'update event set title=?, description=?, soundtrack=? where id=?',
		(map { $self->req->param($_) || undef } qw(title description soundtrack)),
		$item->{id}
	);
	
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
	my $flag = shift;
	
	+{
		(map { $_ => $item->{$_} } qw(id title description soundtrack status created)),
		
		startDate => $item->{start_date},
		endDate   => $item->{end_date  },
		providers => [ map $_->{type}, @{$item->{queues}||[]} ],
		
		# XXX
		progress  => 1 + int rand 100,
		
		$flag ? () : (
			entries => [
				map { +{
					id      => $_->{id},
					source  => $_->{type},
					created => $_->{created},
					data    => eval $_->{data},
					# data    => {
					# 	url   => 'http://eventshot.me/logo.jpg',
					# 	title => 'Lorem...',
					# }
				} }
				@{ $item->{items}||[] }
			]
		),
	};
}

1;
