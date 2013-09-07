basis.require('basis.entity');
basis.require('app.service');

//
// main part
//

var TypeName = new basis.entity.EntityType({
  name: 'TypeName',
  fields: {
    id: basis.entity.IntId,
    title: String
  }
});

/* 
TypeName.all.setSyncAction(app.service['default'].createAction({
  url: '/api/...',
  success: function(data){
    this.sync(basis.array(data).map(TypeName.reader));
    this.setState(basis.data.STATE.READY);
  }
}));
*/

//
// export names
//

module.exports = TypeName;
