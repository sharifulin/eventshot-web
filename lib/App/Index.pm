package App::Index;
use App::Base -controller;

sub main { shift->render('index') }

1;
