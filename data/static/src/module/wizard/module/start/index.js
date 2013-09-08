basis.require('basis.ui');
basis.require('app.type');

var view = new basis.ui.Node({
  autoDelegate: true,

  template: resource('template/view.tmpl'),
  binding: {
    dates: resource('module/dates/index.js').fetch(),
    providers: resource('module/providers/index.js').fetch(),
    local: resource('module/local/index.js').fetch()
  },
  action: {
    create: function(){
      this.target.save();
    }
  }
});

module.exports = view;
