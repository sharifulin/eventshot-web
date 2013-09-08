basis.require('basis.router');
basis.require('basis.ui');

var postInit_ = basis.ui.Node.prototype.postInit;
var destroy_ = basis.ui.Node.prototype.destroy;

basis.ui.Node.prototype.postInit = function(){
  postInit_.call(this);

  if (this.router)
    basis.router.add(this.router, this.routerCallback, this);
};

basis.ui.Node.prototype.destroy = function(){
  if (this.router)
    basis.router.remove(this.router, this.routerCallback, this);

  destroy_.call(this);
};

basis.ui.Node.prototype.routerCallback = basis.Class.extensibleProperty({
  enter: function(){
    this.select();
  },
  leave: function(){
    this.unselect();
  }
});

module.exports = basis.router.exports;