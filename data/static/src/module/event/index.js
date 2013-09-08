basis.require('basis.ui');
basis.require('app.type');

var months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

var EntryNode = new basis.ui.Node.subclass({
  template: resource('template/entry.tmpl'),
  binding: {
    source: 'data:',
    sourceImage: {
      events: 'update',
      getter: function(node){
        return app.type.Provider.assets[node.data.source];
      }
    },
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

  titleFocused: false,
  descriptionFocused: false,

  template: resource('template/view.tmpl'),
  binding: {
    id: 'data:',

    status: 'data:',

    title: new basis.ui.Node({
      autoDelegate: true,

      template: resource('template/title.tmpl'),
      binding: {
        title: {
          events: 'update',
          getter: function(node){
            return node.data.title || '';
          }
        },
        hasTitle: {
          events: 'update',
          getter: function(node){
            return !!node.data.title;
          }
        },
        noTitle: {
          events: 'update',
          getter: function(node){
            return !node.data.title;
          }
        }
      }
    }),

    startDate: {
      events: 'update',
      getter: function(node){
        var date = basis.date.fromISOString(node.data.startDate);
        return months[date.getMonth() - 1] + ' ' + date.getDate() + ', ' + date.getFullYear();
      }
    },
    endDate: {
      events: 'update',
      getter: function(node){
        var date = basis.date.fromISOString(node.data.endDate);
        return months[date.getMonth() - 1] + ' ' + date.getDate() + ', ' + date.getFullYear();
      }
    },

    description: new basis.ui.Node({
      autoDelegate: true,

      template: resource('template/description.tmpl'),
      binding: {
        description: {
          events: 'update',
          getter: function(node){
            return node.data.description || '';
          }
        }
      }
    }),

    entries: new basis.ui.Node({
      autoDelegate: true,
      handler: {
        update: function(){
          this.setDataSource(this.data.entries);
        }
      },

      template: resource('template/entry-list.tmpl'),
      binding: {
        visible: {
          events: 'update',
          getter: function(node){
            return node.data.status == 'ready';
          }
        }
      },

      sorting: 'data.id',
      childClass: EntryNode,
      childFactory: function(config){
        var ItemClass = entryViews[config.delegate.data.type] || EntryNode;
        return new ItemClass(config);
      }
    }),
    progress: new basis.ui.Node({
      autoDelegate: true,

      template: resource('template/progress.tmpl'),
      binding: {
        visible: {
          events: 'update',
          getter: function(node){
            return node.data.status == 'wait' || node.data.status == 'progress';
          }
        },
        progress: 'data:'
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