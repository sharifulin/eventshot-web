basis.require('basis.ui');
basis.require('app.type');

var EntryNode = new basis.ui.Node.subclass({
  template: resource('template/entry.tmpl'),
  binding: {
    source: 'data:',
    content: 'data:data'
  }
});

var entryViews = {
  text: EntryNode.subclass({
    template: resource('template/entry-text.tmpl'),
    binding: {
    }
  }),
  photo: EntryNode.subclass({
    template: resource('template/entry-photo.tmpl'),
    binding: {
      url: 'data:data.url',
      title: 'data:data.title'
    }
  })
};

var view = new basis.ui.Node({
  active: true,

  template: resource('template/view.tmpl'),
  binding: {
    id: 'data:',
    title: 'data:',
    description: 'data:',
    entries: new basis.ui.Node({
      autoDelegate: true,
      handler: {
        update: function(){
          this.setDataSource(this.data.entries);
        }
      },

      sorting: 'data.id',
      childClass: EntryNode,
      childFactory: function(config){
        var ItemClass = entryViews[config.delegate.data.type] || EntryNode;
        return new ItemClass(config);
      }
    })
  }
});

basis.router.add('/event/:id', {
  match: function(id){
    view.setDelegate(app.type.Event(id));
  },
  leave: function(){
    view.setDelegate();
  }
});

module.exports = view;