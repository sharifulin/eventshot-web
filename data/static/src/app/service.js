basis.require('basis.net.service');

var defaultService = new basis.net.service.Service({
  transportClass: basis.net.Transport.subclass({
    request: function(){
      ;;;this.setParam('uuid', '30489C58E885A0E8B5C2A2A199862EFA');
      basis.net.Transport.prototype.request.apply(this, arguments);
    }
  })
});

module.exports = {
  'default': defaultService
};