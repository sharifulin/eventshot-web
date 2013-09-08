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
      imageUrl: {
        events: 'update',
        getter: function(node){
          return app.type.Provider.assets[node.data.id];
        }
      },
      title: 'data:',
      unchecked: checkedProviders.compute('update', function(node, value){
        return value.indexOf(node.data.id) == -1;
      })
    },
    action: {
      toggle: function(){
        var providers = basis.array(this.parentNode.data.providers);
        var idx = providers.indexOf(this.data.id);

        if (idx == -1)
        {
          if (app.type.Provider(this.data.id).data.enabled)
            providers.push(this.data.id);
          else
          {
            var width = 800;
            var height = 600;
            window.open('/login/' + this.data.id, 'oauth', 'scrollbars=0, resizable=1, menubar=0, left=' + (screen.width - width) / 2 + ', top=' + (screen.height - height) / 2 + ', width=' + width + ', height=' + height + ', toolbar=0, status=0');
            return false;
          }
        }
        else
          providers.splice(idx, 1);

        this.parentNode.update({
          providers: providers
        });
      }
    }
  }
});

app.onProvidersInit = function(){
  view.update({
    providers: app.type.Provider.all.getItems().filter(function(provider){
        return provider.data.enabled;
      }).map(function(provider){
        return provider.data.id;
      })
  });
}


module.exports = view;