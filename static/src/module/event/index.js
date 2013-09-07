basis.require('basis.ui');

var view = new basis.ui.Node({
  template: resource('template/view.tmpl'),
  binding: {
    id: 'data:'
  }
});

basis.router.add('/event/:id', {
  match: function(id){
    //view.setDelegate(app.type.Event(id));
    view.update({
      id: id
    });
  },
  leave: function(){
    view.setDelegate();
  }
});

module.exports = view;