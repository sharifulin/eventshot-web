basis.require('basis.net.service');

var defaultService = new basis.net.service.Service({
  transportClass: basis.net.Transport.subclass({
    request: function(){
      ;;;this.setParam('uuid', '30489C58E885A0E8B5C2A2A199862EFA');
      basis.net.Transport.prototype.request.apply(this, arguments);
    }
  })
});

(app.updateProviderList = function(){
  basis.net.request({
    url: '/api/user'/** @cut*/ + '?uuid=30489C58E885A0E8B5C2A2A199862EFA'
  }, function(data){
      app.type.Provider.all.forEach(function(provider){
        provider.set('enabled', data.user.prodivers.has(provider.data.id))
      });
      if (app.onProvidersInit)
      {
        app.onProvidersInit();
        app.onProvidersInit = null;
      }
    }
  );
})();

function handleMessage(event){
  if (event.data === 'updateProviderList')
    app.updateProviderList();
}

if (global.addEventListener)
  global.addEventListener('message', handleMessage, true);
else
  global.attachEvent('onmessage', handleMessage);

module.exports = {
  'default': defaultService
};