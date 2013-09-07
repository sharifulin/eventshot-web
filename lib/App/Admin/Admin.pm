package App::Admin::Admin;
use App::Base -controller, with => 'App::Admin::Validate';

sub list {
	my $self = shift;
	
	my $where = 1;
	if (my $q = $self->req->param('q')) {
		$where = join ' or ', 'name ' . $self->db->like($q), 'email' . $self->db->like($q);
	}
	
	$self->stash(
		page => $_,
		list => $_->{start}
			? 
				$self->dw->admin($self->db->select("select * from admin where $where order by id " . $self->db->limit($_->{start}-1, $_->{limit})))
			
			: []
	) for $self->u('page',
		$self->db->select("select count(*) cnt from admin where $where")->[0]->{cnt},
		$self->conf('limit')->{admin}->{list} => $self->req->param('page')
	);
}

sub listing {
	my $self = shift;
	my %args = @_;
	my @id   = $args{id} ? @{$args{id}} : $self->req->param('id');
	my($act)  = grep {$_} $self->req->param('action');
	
	if (@id && $act) {
		my $in = $self->db->in( @id );
		given ($act) {
			when (/^(!)?(hidden)/) {
				my $field = $2;
				my $value = $1 ? 0 : 1;
				
				$self->db->query("update admin set $field=$value where id $in");
				
			}
			when ('remove') {
				# XXX: зависимости
				$self->db->query("delete from admin where id $in");
			}
			default {
				warn "Unknown action $act\n";
			}
		}
	}
	
	$self->redirect_to;
}

#

sub check {
	my $self = shift;
	
	return unless my $item = 
		$self->db->select('select * from admin where id=?', $self->stash('id'))->[0];
	
	$self->stash(item => $item);
}

sub item {
	my $self = shift;
	$self->redirect_to('admin_admin_edit', id => $self->stash('id'));
}

sub add {
	my $self = shift;
	return $self->form unless $self->admin_validate->admin;
	
	$self->db->query(
		'insert into admin set email=?, password=?, name=?, position=?, hidden=?, created=now()',
		(map { $self->req->param($_) || undef } qw(email password name position)),
		(map { $self->req->param($_) ? 1 : 0 } qw( hidden)),
	);
	
	$self->redirect_to('admin_admin');
}

sub edit {
	my $self = shift;
	my $item = $self->stash('item');
	
	return $self->form unless $self->admin_validate->admin;
	
	$self->db->query(
		'update admin set email=?, password=?, name=?, position=?, hidden=? where id=?',
		(map { $self->req->param($_) || undef } qw(email password name position)),
		(map { $self->req->param($_) ? 1 : 0 } qw( hidden)),
		$item->{'id'}
	);
	
	$self->stash(save => 1);
	
	$self->check;
	$self->form;
}

sub remove {
	my $self = shift;
	
	# XXX: files?
	$self->db->query('delete from admin where id=?', $self->stash('item')->{id});
	
	$self->redirect_to('admin_admin');
}

sub form {
	shift->render('admin/admin/form');
}

sub _list {
	my $self = shift;
	$self->db->select('select * from admin');
}

1;
