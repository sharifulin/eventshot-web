basis.require('basis.entity');
basis.require('app.service');

//
// main part
//

var Entry = basis.entity.createType('Entry', {
  id: basis.entity.IntId,
  source: String,
  type: String,
  created: String,
  data: function(value){
    return value || '';
  },
  hidden: Boolean
});

var reader_ = Entry.entityType.reader;
Entry.entityType.reader = function(data){
  if (data && data.data)
  {
    data.created = data.data.created;
    if (data.data.video)
      data.type = 'video';
  }

  return reader_.call(this, data);
};

Entry.extend({
  toggleHidden: app.service['default'].createAction({
    method: 'POST',
    url: '/api/event_item/:id/update',
    request: function(){
      this.set('hidden', !this.data.hidden, true);
      return {
        routerParams: {
          id: this.data.id
        },
        params: {
          hidden: Number(this.data.hidden)
        }
      };
    },
    success: function(data){
      this.commit(Entry.reader(data.event_item));
    }
  })
});

//
// export names
//

module.exports = Entry;
