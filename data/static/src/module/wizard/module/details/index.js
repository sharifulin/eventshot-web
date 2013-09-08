basis.require('basis.ui');

module.exports = new basis.ui.Node({
  autoDelegate: true,

  template: resource('template/view.tmpl'),
  binding: {
    form: resource('module/form/index.js').fetch()
  }
});