basis.require('basis.ui');

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
      selected: true,
      lazyContent: resource('module/start/index.js'),

      handler: {
        select: function(){
          if (this.tmpl)
          {
            this.element.style.height = '';
            this.element.style.opacity = '';
          }
        },
        unselect: function(){
          this.element.style.webkitTransition = 'none';
          this.element.style.height = this.element.clientHeight + 'px';
          this.element.style.opacity = 1;
          var self = this;
          basis.nextTick(function(){
            self.element.style.webkitTransition = '';
            self.element.style.height = 0;
            self.element.style.opacity = 0;
          });
        }
      }
    },
    {
      lazyContent: resource('module/details/index.js'),

      handler: {
        unselect: function(){
          if (this.tmpl)
            this.tmpl.element.style.height = 0;
        },
        select: function(){
          this.element.style.webkitTransition = 'none';
          this.element.style.height = 0;
          this.element.style.opacity = 0;
          var self = this;
          basis.nextTick(function(){
            self.element.style.webkitTransition = '';
            self.element.style.height = '';
            self.element.style.opacity = 1;
          });
        }
      }
    }
  ],

  handler: {
    update: function(){
      var node = this.data.id ? this.lastChild : this.firstChild;
      node.select();
    }
  }  
});


basis.router.add('/add-event', {
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
