
  basis.require('basis.dom');
  basis.require('basis.dom.event');
  basis.require('basis.cssom');
  basis.require('basis.layout');
  basis.require('basis.ui.table');


 /**
  * @see ./demo/defile/table.html
  * @namespace basis.ui.scrolltable
  */

  var namespace = this.path;


  //
  // import names
  //

  var Class = basis.Class;
  var DOM = basis.dom;
  var cssom = basis.cssom;
  var layout = basis.layout;

  var sender = basis.dom.event.sender;
  var createArray = basis.array.create;
  var createElement = basis.dom.createElement;

  var Table = basis.ui.table.Table;


  //
  // definitions
  //

  var templates = basis.template.define(namespace, {
    ScrollTable: resource('templates/scrolltable/ScrollTable.tmpl')
  });


  //
  // main part
  //

  var IE8 = basis.ua.is('IE8');

  function resetStyle(extraStyle){
    return '[style="padding:0!important;margin:0!important;border:0!important;width:auto!important;height:0!important;font-size:0!important;' + (extraStyle || '') + '"]';
  }

  function cellSectionBuilder(property){
    var ref = 'section_' + property + '_';

    return function(owner){
      return owner[ref] || (owner[ref] = createElement('tbody' + resetStyle(),
        createElement('tr' + resetStyle(),
          owner.columnWidthSync_.map(basis.getter(property))
        )
      ));
    }
  }

  function replaceTemplateNode(owner, refName, newNode){
    DOM.replace(owner.tmpl[refName],
      owner.tmpl[refName] = newNode
    );
  }

  // Cells proto
  // TODO: remove reference to basis.dom.event, because future build improvement may hide basis from global scope
  var measureCell = createElement('td' + resetStyle(),
    createElement(resetStyle('position:relative!important'),
      createElement('iframe[event-load="measureInit"]' +
        resetStyle(
          'width:100%!important;position:absolute!important;visibility:hidden!important;' +
          // hack for IE via behavior - load event emulation
          // FIXME: find to better way, but anyway don't access to basis via global scope (it may be removed on build)
          'behavior:expression(basis.dom.event.fireEvent(window,\\"load\\",{type:\\"load\\",target:this}),(runtimeStyle.behavior=\\"none\\"))'
        )
      )
    )
  );

  var expanderCell = createElement('td' + resetStyle(),
    createElement(resetStyle())
  );


 /**
  * @class
  */
  var ScrollTable = Class(Table, {
    className: namespace + '.ScrollTable',

    timer_: false,

   /**
    * Column width sync cells
    */
    columnWidthSync_: null,

   /**
    * Should table try to fit it's container or not.
    * @type boolean
    */
    fitToContainer: false,

   /**
    * @inheritDoc
    */
    template: templates.ScrollTable,
    binding: {
      fitToContainer: 'fitToContainer',

      // measure row
      measureRow: cellSectionBuilder('measure'),
      
      // header expander row
      headerExpandRow: cellSectionBuilder('header'),
      
      // footer expander row
      footerExpandRow: cellSectionBuilder('footer')
    },
    action: {
      scroll: function(){
        var scrollLeft = -this.tmpl.scrollContainer.scrollLeft + 'px';

        if (this.tmpl.headerOffset.style.left != scrollLeft)
        {
          this.tmpl.headerOffset.style.left = scrollLeft;
          this.tmpl.footerOffset.style.left = scrollLeft;
        }
      },
      measureInit: function(event){
        (sender(event).contentWindow.onresize = this.requestRelayout)();
      }
    },

    headerClass: {
      className: namespace + '.Header',
      listen: {
        childNode: {
          '*': function(){
            if (this.owner)
              this.owner.requestRelayout();
          }
        }
      }
    },

   /**
    * @inheritDoc
    */
    init: function(){
      this.requestRelayout = this.requestRelayout.bind(this);
      this.relayout = this.relayout.bind(this);

      // inherit
      Table.prototype.init.call(this);

      // add request to relayout on any header events
      this.header.addHandler({
        '*': this.requestRelayout
      }, this);

      // column width sync cells
      this.columnWidthSync_ = createArray(this.columnCount, function(){
        return {
          measure: measureCell.cloneNode(true),
          header: expanderCell.cloneNode(true),
          footer: expanderCell.cloneNode(true)
        };
      });

      // FIXME: hack for ie, trigger relayout on create
      if (IE8)
        setTimeout(this.requestRelayout, 1);
    },

    templateSync: function(){
      Table.prototype.templateSync.call(this);

      // add block resize trigger
      if ('boundElement' in this.tmpl)
        layout.addBlockResizeHandler(this.tmpl.boundElement, this.requestRelayout);

      this.requestRelayout();
    },

   /**
    * Notify table that it must be relayout.
    */
    requestRelayout: function(){
      if (!this.timer_)
        this.timer_ = basis.setImmediate(this.relayout);
    },

   /**
    * Make relayout of table. Should never be used in common cases. Call requestRelayout instead.
    */
    relayout: function(){
      var headerElement = this.header.element;
      var footerElement = this.footer ? this.footer.element : null;

      //
      // Sync header html
      //
      var headerOuterHTML = DOM.outerHTML(headerElement);
      if (this.shadowHeaderHTML_ != headerOuterHTML)
      {
        this.shadowHeaderHTML_ = headerOuterHTML;
        replaceTemplateNode(this, 'shadowHeader', headerElement.cloneNode(true));
      }

      //
      // Sync footer html
      //
      if (footerElement)
      {
        var footerOuterHTML = DOM.outerHTML(footerElement);
        if (this.shadowFooterHtml_ != footerOuterHTML)
        {
          this.shadowFooterHtml_ = footerOuterHTML;
          replaceTemplateNode(this, 'shadowFooter', footerElement.cloneNode(true));
        }
      }

      //
      // Sync column width
      //
      for (var i = 0, column, columnWidth; column = this.columnWidthSync_[i]; i++)
      {
        columnWidth = column.measure.offsetWidth + 'px';
        cssom.setStyleProperty(column.header.firstChild, 'width', columnWidth);
        if (footerElement)
          cssom.setStyleProperty(column.footer.firstChild, 'width', columnWidth);
      }

      //
      // Calc metrics boxes
      //
      var tableWidth = this.tmpl.boundElement.offsetWidth || 0;
      var headerHeight = headerElement.offsetHeight || 0;
      var footerHeight = (footerElement && footerElement.offsetHeight) || 0;

      //
      // Update style properties
      //
      this.tmpl.headerExpandCell.style.left = tableWidth + 'px';
      this.tmpl.footerExpandCell.style.left = tableWidth + 'px';
      this.tmpl.tableElement.style.margin = '-' + headerHeight + 'px 0 -' + footerHeight + 'px';

      if (this.fitToContainer)
        this.element.style.paddingBottom = (headerHeight + footerHeight) + 'px';

      // reset timer
      // it should be at the end of relayout to prevent relayout call while relayout
      this.timer_ = basis.clearImmediate(this.timer_);
    },

   /**
    * @inheritDoc
    */
    destroy: function(){
      basis.clearImmediate(this.timer_);
      this.timer_ = true; // prevent relayout call

      this.section_measure_ = null;
      this.section_header_ = null;
      this.section_footer_ = null;
      this.columnWidthSync_ = null;
      this.shadowHeaderHtml_ = null;
      this.shadowFooterHtml_ = null;

      Table.prototype.destroy.call(this);
    }
  });


  //
  // export names
  //

  module.exports = {
    ScrollTable: ScrollTable
  };
