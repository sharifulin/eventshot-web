basis.require('basis.ui');

module.exports = new basis.ui.Node({
  template: resource('template/view.tmpl'),
  binding: {
    dates: resource('module/dates/index.js').fetch(),
    providers: resource('module/providers/index.js').fetch(),
    local: resource('module/local/index.js').fetch()
  },
  data: {
    startDate: '2013-09-01',
    endDate: '2013-09-08'
  },
  action: {
    next: function(){
      if (this.owner)
        this.owner.next();
    }
  }
});