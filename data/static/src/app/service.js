basis.require('basis.net.service');

var defaultService = new basis.net.service.Service({
  transportClass: basis.net.Transport.subclass({
    request: function(){
      ;;;this.setParam('uuid', 'F42BA2887027AD1C9CEFC71041AD5EE6');
      basis.net.Transport.prototype.request.apply(this, arguments);
    }
  })
});

module.exports = {
  'default': defaultService
};