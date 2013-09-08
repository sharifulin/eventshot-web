basis.require('basis.ui');
basis.require('basis.ui.form');
basis.require('basis.ui.field');

module.exports = new basis.ui.form.FormContent({
  autoDelegate: true,

  template: resource('template/view.tmpl'),
  childNodes: [
    {
      name: 'title',
      title: 'Title'
    },
    {
      name: 'description',
      title: 'Description'
    }
  ],
  action: {
    save: function(){
      this.update(this.serialize());
      this.target.save();
    }
  }
});