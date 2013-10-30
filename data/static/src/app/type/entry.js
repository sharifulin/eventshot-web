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
  }
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

//
// export names
//

module.exports = Entry;
