basis.require('basis.entity');
basis.require('app.service');

//
// main part
//

var Provider = basis.entity.createType('Provider', {
  id: basis.entity.StringId,
  title: String,
  enabled: Boolean
});

Provider.all.sync([
  { id: 'facebook', title: 'Facebook', enabled: true },
  { id: 'instagram', title: 'Instagram' },
  { id: 'twitter', title: 'Twitter', enabled: true },
  { id: 'foursquare', title: 'Foursquare' }
]);

//
// export names
//

module.exports = Provider;
