basis.require('basis.ui');
basis.require('basis.ui.form');
basis.require('basis.ui.field');

module.exports = new basis.ui.form.FormContent({
  template: resource('template/view.tmpl'),
  childNodes: [
    {
      title: 'Title'
    },
    {
      title: 'Description'
    }
  ]
});