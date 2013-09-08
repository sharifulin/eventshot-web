basis.require('basis.entity');
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
      return '2013-09-01';
    }
  },
  endDate: {
    type: String,
    defValue: function(){
      return '2013-09-08';
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
      })
    }
  },
  entries: basis.entity.createSetType('Entry')
});

Event.all.setSyncAction(app.service['default'].createAction({
  url: '/api/event',
  //url: 'data/event-list.json',
  success: function(data){
    this.sync(basis.array(data.events).map(Event.reader));
  }
}));

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
