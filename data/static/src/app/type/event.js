basis.require('basis.entity');
basis.require('app.service');

//
// main part
//

var Event = basis.entity.createType('Event', {
  id: basis.entity.IntId,
  title: String,
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
  description: String,
  status: Number,
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
  //url: '/api/...',
  url: 'data/event-list.json',
  success: function(data){
    this.sync(basis.array(data).map(Event.reader));
  }
}));

Event.extend({
  syncAction: app.service['default'].createAction({
    url: 'data/event-:id.json',
    request: function(){
      return {
        routerParams: {
          id: this.data.id
        }
      }
    },
    success: function(data){
      this.update(Event.reader(data));
    }
  }),

  save: app.service['default'].createAction({
    method: 'POST',
    request: function(){
      return !this.data.id
        ? {
            url: 'data/create.json',
            params: basis.object.slice(this.data, [
              'startDate',
              'endDate',
              'providers'
            ])
          }
        : {
            url: 'data/event-:id.json',
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
      data.id = parseInt(Math.random() * 1000000, 10) + 2;      
      this.update(Event.reader(data));
    }
  })
});


//
// export names
//

module.exports = Event;
