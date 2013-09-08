basis.require('basis.ui');
basis.require('basis.router');

var view = new basis.ui.Node({
  template: resource('template/view.tmpl'),

  selection: true,
  childClass: {
    autoDelegate: true,

    template: resource('template/page.tmpl'),
    binding: {
      content: 'satellite:'
    },

    emit_select: function(){
      if (this.lazyContent)
      {
        this.setSatellite('content', this.lazyContent.fetch());
        this.lazyContent = null;
      }
      basis.ui.Node.prototype.emit_select.call(this);      
    }
  },
  childNodes: [
    {
      autoDelegate: true,
      selected: true,
      lazyContent: resource('module/start/index.js')
    }
  ],

  handler: {
    update: function(sender, delta){
      if ('id' in delta && this.data.id)
        basis.router.navigate('/event/' + this.data.id);
    }
  }  
});


basis.router.add(/^(\/add-event|\/?)$/, {
  enter: function(id){
    view.setDelegate(app.type.Event({}));
  },
  leave: function(){
    if (view.data.id)
      view.setDelegate();
    else
      view.target.destroy();
  }
});

module.exports = view;
