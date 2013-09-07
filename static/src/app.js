basis.require('basis.app');
basis.require('basis.ui');
;;;basis.require('basis.devpanel');


module.exports = basis.app.create({
  title: 'EventShot',

  init: function(){
    var pages = new basis.ui.Node({
      selection: true,
      childClass: {
        template: resource('app/template/page.tmpl'),
        handler: {
          select: function(){
            if (this.lazyContent)
            {
              this.appendChild(this.lazyContent());
              this.lazyContent = null;
            }
          }
        }
      },
      childNodes: [
        {
          selected: true,
          name: 'index',
          lazyContent: resource('module/welcome/index.js')
        },
        {
          name: 'wizard',
          lazyContent: resource('module/wizard/index.js')
        },
        {
          name: 'event-list',
          lazyContent: resource('module/eventlist/index.js')
        },
        {
          name: 'event',
          lazyContent: resource('module/event/index.js')
        }
      ]
    });

    return new basis.ui.Node({
      template: resource('app/template/layout.tmpl'),
      binding: {
        tabs: new basis.ui.Node({
          template: resource('app/template/tabs.tmpl'),
          dataSource: pages.getChildNodesDataset(),
          childClass: {
            template: resource('app/template/tab.tmpl'),
            binding: {
              title: function(node){
                return node.delegate.name;
              }
            },
            action: {
              click: function(){
                this.delegate.select();
              }
            }
          }
        }),
        pages: pages
      }
    });
  }
});
