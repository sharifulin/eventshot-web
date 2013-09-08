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

Provider.assets = {
  facebook: basis.asset('src/app/template/logos/facebook.png'),
  instagram: basis.asset('src/app/template/logos/instagram.png'),
  twitter: basis.asset('src/app/template/logos/twitter.png'),
  foursquare: basis.asset('src/app/template/logos/foursquare.png')
};

//
// export names
//

module.exports = Provider;
