package App::Api::EventItem;
use App::Base 'App::Api', with => 'App::Api::Validate';

sub check {
	my $self = shift;
	my $USER = $self->stash('USER');
	
	$self->api_error(code => 4), return 0
		unless my $item = $self->db->select('select * from event_item where id=? and user_id=?', $self->stash('id'), $USER->{id})->[0]
	;
	
	$self->stash(item => $item);
	return 1;
}

sub item {
	my $self = shift;

	$self->render('json', $self->_item);
}

sub update {
	my $self = shift;
	my $item = $self->stash('item');
	
	my $set  = join ', ',
		'updated=now()',
		map { "$_=" . $self->db->quote($self->req->param($_)) } qw(hidden)
	;

	$self->db->query("update event_item set $set where id=?", $item->{id});
	
	$self->check;
	$self->render('json', $self->_item);
}

sub _item {
	my $self = shift;
	my $item = $self->stash('item');
	
	+{
		event_item => {
			map { $_ => $item->{$_} } qw(id event_id user_id hidden)
		}
	}
}

1;
