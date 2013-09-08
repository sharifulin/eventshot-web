basis.require('basis.entity');
basis.require('app.service');

//
// main part
//

var Event = basis.entity.createType('Event', {
  id: basis.entity.IntId,
  title: String,
  startDate: String,
  endDate: String,
  description: String,
  status: Number,
  providers: Array,
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
  })
});


//
// export names
//

module.exports = Event;
