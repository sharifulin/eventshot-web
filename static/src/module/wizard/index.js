basis.require('basis.ui');


module.exports = new basis.ui.Node({
  template: resource('template/view.tmpl'),

  selection: true,
  childClass: {
    template: resource('template/page.tmpl'),
    binding: {
      content: 'satellite:'
    },

    next: function(){
      if (this.nextSibling)
        this.nextSibling.select();
    },
    handler: {
      select: function(){
        if (this.lazyContent)
        {
          this.setSatellite('content', this.lazyContent.fetch());
          this.lazyContent = null;
        }
      }
    }
  },
  childNodes: [
    {
      selected: true,
      lazyContent: resource('module/start/index.js')
    },
    {
      lazyContent: resource('module/details/index.js')
    }
  ]
});
