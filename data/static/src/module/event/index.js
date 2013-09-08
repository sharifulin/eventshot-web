basis.require('basis.date');
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
    content: 'data:data',
    type: 'data:type',
    id: 'data:id',
    url: 'data:data.url || ""',
    time: {
      events: 'update',
      getter: function(node){
        return node.data.created.split(' ')[1].split(':').slice(0, 2).join(':');
      }
    }
  }
});

var entryViews = {
  text: EntryNode.subclass({
    template: resource('template/entry-text.tmpl'),
    binding: {
      content: 'data:data.title'
    }
  }),
  photo: EntryNode.subclass({
    template: resource('template/entry-photo.tmpl'),
    binding: {
      imageUrl: 'data:data.photo',
      title: 'data:data.title',
      width: 'data:data.width',
      height: 'data:data.height'
    }
  }),
  weather: EntryNode.subclass({
    template: resource('template/entry-weather.tmpl'),
    binding: {
      image: 'data:data.pic',
      title: 'data:data.title'
    }
  })
};

var view = new basis.ui.Node({
  active: true,

  handler: {
    update: function(sender, delta){
      if ('status' in delta)
        this.deprecate();
    }
  },

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
        }
      },
      action: {
        change: function(event){
          if (event.type == 'blur' || (event.type == 'keyup' && event.key == event.KEY.ENTER))
          {
            var id = this.data.id;
            basis.net.request({
              method: 'POST',
              params: {
                title: this.data.title
              },
              url: '/api/event/' + this.data.id /** @cut */ + '?uuid=30489C58E885A0E8B5C2A2A199862EFA'
            }, function(data){
              app.type.Event(id).set('title', data.event.title);
            });
          }
          else
            this.target.set('title', this.tmpl.input.value, true);
        }
      },
      handler: {
        targetChanged: function(){
          var self = this;
          basis.nextTick(function(){
            if (!self.data.title)
              self.focus();
          });
        }
      }
    }),

    startDate: {
      events: 'update',
      getter: function(node){
        var date = basis.date.fromISOString(node.data.startDate);
        return months[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
      }
    },
    endDate: {
      events: 'update',
      getter: function(node){
        var date = basis.date.fromISOString(node.data.endDate);
        return months[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
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
      },
      action: {
        change: function(event){
          if (event.type == 'blur' || (event.type == 'keyup' && event.key == event.KEY.ENTER))
          {
            var id = this.data.id;
            basis.net.request({
              r: 1,
              method: 'POST',
              params: {
                description: this.data.description
              },
              url: '/api/event/' + this.data.id /** @cut */ + '?uuid=30489C58E885A0E8B5C2A2A199862EFA'
            }, function(data){
              app.type.Event(id).set('description', data.event.description);
            });
          }
          else
            this.target.set('description', this.tmpl.input.value, true);
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

      sorting: 'data.created',
      grouping: {
        groupGetter: function(node){
          return node.data.created.split(' ')[0]
        },
        childClass: {
          template: resource('template/day.tmpl'),
          binding: {
            title: {
              events: 'update',
              getter: function(node){
                var parts = node.data.title.split('-');
                return months[parts[1] - 1] + ' ' + Number(parts[2]);
              }
            }
          }
        }
      },

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