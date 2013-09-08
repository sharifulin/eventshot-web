basis.require('basis.date');
basis.require('basis.ui');
basis.require('basis.ui.popup');
basis.require('basis.ui.calendar');

var calendar = new basis.ui.calendar.Calendar({
  maxDate: new Date,
  sections: ['Month'],
  handler: {
    change: function(){
      if (calendar.dateType == 'startDate')
        view.update({
          startDate: basis.date.format(this.selectedDate.value, '%Y-%M-%D')
        });
      else
        view.update({
          endDate: basis.date.format(this.selectedDate.value, '%Y-%M-%D')
        });

      popup.hide();
    }
  }
});
var popup = new basis.ui.popup.Popup({
  template: resource('template/date-picker.tmpl'),
  dir: 'bottom center top center',
  childNodes: [
    calendar
  ]
});

var view = new basis.ui.Node({
  autoDelegate: true,

  template: resource('template/view.tmpl'),
  binding: {
    startDate: 'data:',
    endDate: 'data:'
  },
  action: {
    pickStartDate: function(event){
      calendar.selectedDate.set(basis.date.fromISOString(this.data.startDate));
      calendar.dateType = 'startDate';
      popup.show(event.sender);
    },
    pickEndDate: function(event){
      calendar.selectedDate.set(basis.date.fromISOString(this.data.endDate));
      calendar.dateType = 'endDate';
      popup.show(event.sender);
    }
  }
});

module.exports = view;
