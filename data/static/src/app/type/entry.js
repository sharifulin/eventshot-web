basis.require('basis.entity');
basis.require('app.service');

//
// main part
//

var Entry = basis.entity.createType('Entry', {
  id: basis.entity.IntId,
  source: String,
  type: String,
  data: function(value){
    return value || '';
  }
});


//
// export names
//

module.exports = Entry;
