basis.require('basis.ui');


module.exports = new basis.ui.Node({
  template: resource('template/list.tmpl'),
  
  childClass: {
    template: resource('template/item.tmpl'),
    binding: {
      title: 'data:'
    }
  },

  childNodes: basis.array.create(5, function(idx){
    return {
      data: {
        title: 'event ' + idx
      }
    }
  })
});