basis.require('basis.ui');
basis.require('basis.router');
basis.require('app.type');

module.exports = new basis.ui.Node({
  template: resource('template/list.tmpl'),

  dataSource: app.type.Event.all,
  active: true,
  
  sorting: 'data.id',
  sortingDesc: true,
  childClass: {
    template: resource('template/item.tmpl'),
    binding: {
      title: 'data:'
    },
    action: {
      showDetails: function(){
        basis.router.navigate('/event/' + this.data.id);
      }
    }
  }
});