package App::Admin;
use App::Base -controller;

sub enter { shift->redirect_to('admin_admin') }

1;
