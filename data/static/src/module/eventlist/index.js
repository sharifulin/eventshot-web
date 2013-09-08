basis.require('basis.date');
basis.require('basis.ui');
basis.require('basis.router');
basis.require('app.type');

var months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

module.exports = new basis.ui.Node({
  template: resource('template/list.tmpl'),
  action: {
    create: function(){
      basis.router.navigate('/add-event');
    }
  },

  dataSource: app.type.Event.inited,
  active: true,
  
  sorting: 'data.id',
  sortingDesc: true,
  childClass: {
    template: resource('template/item.tmpl'),
    binding: {
      title: 'data:',
      hasTitle: {
        events: 'update',
        getter: function(node){
          return !!node.data.title;
        }
      },
      noTitle: {
        events: 'update',
        getter: function(node){
          return !node.data.title;
        }
      },
      startDate: {
        events: 'update',
        getter: function(node){
          var date = basis.date.fromISOString(node.data.startDate);
          return months[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
        }
      },
      endDate: {
        events: 'update',
        getter: function(node){
          var date = basis.date.fromISOString(node.data.endDate);
          return months[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
        }
      },
      cover: 'satellite:'
    },
    action: {
      showDetails: function(){
        basis.router.navigate('/event/' + this.data.id);
      }
    },
    satelliteConfig: {
      cover: {
        existsIf: function(owner){
          return owner.data.main_entry;
        },
        delegate: function(owner){
          return owner.data.main_entry;
        },
        instanceOf: basis.ui.Node.subclass({
          template: resource('template/cover.tmpl'),
          binding: {
            url: 'data:data.photo'
          }
        })
      }
    }
  }
});