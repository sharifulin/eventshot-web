basis.require('basis.app');
basis.require('basis.ui');
basis.require('app.router');
//;;;basis.require('basis.devpanel');

//var t = basis.require('./1.js');
//var t = basis.require('./1.tmpl', '.');
//console.log(t);

;;;app.uuid = '1825C0A465469AD086CFD93369BBF8CB';

module.exports = basis.app.create({
  title: 'EventShot',

  init: function(){
    var pages = new basis.ui.Node({
      selection: true,
      listen: {
        selection: {
          itemsChanged: function(selection){
            if (!selection.itemCount)
              this.firstChild.select();
          }
        }
      },
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
          name: 'welcome',
          lazyContent: resource('module/welcome/index.js')
        },
        {
          selected: true,
          name: 'add-event',
          router: '/add-event',
          lazyContent: resource('module/wizard/index.js')
        },
        {
          name: 'list',
          router: '/list',
          lazyContent: resource('module/eventlist/index.js')
        },
        {
          name: 'event',
          router: /^\/event(\/.*)?$/,
          lazyContent: resource('module/event/index.js')
        }
      ]
    });

    /** @cut */ basis.router.debug = true;
    basis.router.start();

    return new basis.ui.Node({
      template: resource('app/template/layout.tmpl'),
      binding: {
        pages: pages
      },
      action: {
        showEventList: function(){
          basis.router.navigate('/list');
        },
        createEvent: function(){
          basis.router.navigate('/add-event');
        }
      }
    });
  }
});
