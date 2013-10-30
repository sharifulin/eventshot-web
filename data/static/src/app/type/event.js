basis.require('basis.entity');
basis.require('basis.net');
basis.require('basis.data.index');
basis.require('basis.data.dataset');
basis.require('basis.ui');
basis.require('app.service');

//
// main part
//

function nullString(value){
  return value == null ? value : String(value);
}

var Event = basis.entity.createType('Event', {
  id: basis.entity.IntId,
  startDate: {
    type: String,
    defValue: function(){
      return (new Date()).add('day', -7).toISOString();
    }
  },
  endDate: {
    type: String,
    defValue: function(){
      return (new Date()).toISOString();
    }
  },

  title: nullString,
  description: nullString,
  main_entry: 'Entry',

  status: String,
  progress: Number,
  
  providers: {
    type: Array,
    defValue: function(){
      return app.type.Provider.all.getItems().filter(function(provider){
        return provider.data.enabled;
      }).map(function(provider){
        return provider.data.id;
      });
    }
  },
  entries: basis.entity.createSetType('Entry')
});

var reader_ = Event.entityType.reader;
Event.entityType.reader = function(data){
  if (data && data.entries)
    data.entries.forEach(function(entry){
      if (entry.data && entry.data.weather)
      {
        data.entries.push({
          id: -entry.id,
          created: entry.data.created,
          source: 'weather',
          type: 'weather',
          data: basis.object.complete({ created: entry.data.created}, entry.data.weather)
        });
      }
    });

  return reader_.call(this, data);
};


var deprecateTimer;
Event.inited = new basis.data.dataset.Subset({
  source: Event.all,
  rule: function(event){
    return event.data.id
  },
  syncAction: app.service['default'].createAction({
    url: '/api/event',
    //url: 'data/event-list.json',
    success: function(data){
      basis.array(data.events).map(Event.reader).map(Event);
    }
  }),
  handler: {
    stateChanged: function(){
      if (this.state == basis.data.STATE.READY || this.state == basis.data.STATE.UNDEFINED)
      {
        if (!deprecateTimer)
        {
          deprecateTimer = setTimeout(function(){
            Event.inited.deprecate();
          }, 5000);
        }
      }
      else
        deprecateTimer = clearTimeout(deprecateTimer);
    }
  }
});

// mega hack
new basis.ui.Node({ active: true, dataSource: Event.inited });

Event.extend({
  syncAction: app.service['default'].createAction({
    url: '/api/event/:id',
    request: function(){
      return {
        routerParams: {
          id: this.data.id
        }
      }
    },
    success: function(data){
      this.update(Event.reader(data.event));
    }
  }),

  save: app.service['default'].createAction({
    method: 'POST',
    request: function(){
      return !this.data.id
        ? {
            url: '/api/event/create',
            params: {
              start_date: this.data.startDate,
              end_date: this.data.endDate,
              providers: this.data.providers
            }
          }
        : {
            url: '/api/event/:id',
            routerParams: {
              id: this.data.id
            },
            params: basis.object.slice(this.data, [
              'title',
              'description'
            ])
          };
    },
    success: function(data){
      if (!this.data.id)
        basis.net.request({
          timeout: 60000,
          method: 'POST',
          url: '/api/event/' + data.event.id + '/start' /** @cut */ + '?uuid=' + app.uuid
        });

      this.update(Event.reader(data.event));
    }
  }),

  remove: app.service['default'].createAction({
    method: 'POST',
    url: '/api/:id/remove',
    request: function(){
      return {
        routerParams: {
          id: this.data.id
        }
      };
    },
    success: function(data){
      this.destroy();
    }
  })
});


//
// export names
//

module.exports = Event;
