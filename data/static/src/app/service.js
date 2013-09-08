basis.require('basis.net.service');

var defaultService = new basis.net.service.Service({
  transportClass: basis.net.Transport.subclass({
    request: function(){
      this.setParam('uuid', '9A248E954317E536A4DD1502B59BB7DB');
      basis.net.Transport.prototype.request.apply(this, arguments);
    }
  })
});

module.exports = {
  'default': defaultService
};