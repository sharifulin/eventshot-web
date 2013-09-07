basis.require('basis.app');
basis.require('basis.ui');
;;;basis.require('basis.devpanel');


module.exports = basis.app.create({
  title: 'EventShot',

  init: function(){
    return new basis.ui.Node({
      template: resource('app/template/layout.tmpl'),
      binding: {
        //moduleName: resource('module/moduleName/index.js').fetch()
      }
    });
  }
});
