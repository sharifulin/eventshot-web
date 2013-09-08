basis.require('basis.ui');
basis.require('app.type');

var checkedProviders = new basis.data.Value({
  value: []
});
var view = new basis.ui.Node({
  autoDelegate: true,
  dataSource: app.type.Provider.all,
  handler: {
    update: function(){
      checkedProviders.set(this.data.providers);
    }
  },

  template: resource('template/list.tmpl'),
  
  childClass: {
    checked: false,

    template: resource('template/item.tmpl'),
    binding: {
      id: 'data:',
      title: 'data:',
      unchecked: checkedProviders.compute('update', function(node, value){
        return value.indexOf(node.data.id) == -1;
      })
    },
    action: {
      toggle: function(){
        var providers = basis.array(checkedProviders.value);
        var idx = providers.indexOf(this.data.id);

        if (idx == -1)
          providers.push(this.data.id);
        else
          providers.splice(idx, 1);

        this.parentNode.update({
          providers: providers
        });
      }
    }
  }
});

module.exports = view;