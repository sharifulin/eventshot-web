
  basis.require('basis.timer');
  basis.require('basis.dom.event');
  basis.require('basis.l10n');
  basis.require('basis.template');
  basis.require('basis.template.htmlfgen');


 /**
  * @namespace basis.template.html
  */

  var namespace = this.path;


  //
  // import names
  //

  var document = global.document;
  var domEvent = basis.dom.event;
  var arrayFrom = basis.array.from;
  var l10nToken = basis.l10n.token;
  var getFunctions = basis.template.htmlfgen.getFunctions;
  
  var TemplateSwitchConfig = basis.template.TemplateSwitchConfig;
  var TemplateSwitcher = basis.template.TemplateSwitcher;
  var Template = basis.template.Template;

  var TYPE_ELEMENT = basis.template.TYPE_ELEMENT;
  var TYPE_ATTRIBUTE = basis.template.TYPE_ATTRIBUTE;
  var TYPE_TEXT = basis.template.TYPE_TEXT;
  var TYPE_COMMENT = basis.template.TYPE_COMMENT;

  var TOKEN_TYPE = basis.template.TOKEN_TYPE;
  var TOKEN_BINDINGS = basis.template.TOKEN_BINDINGS;
  var TOKEN_REFS = basis.template.TOKEN_REFS;

  var ATTR_NAME = basis.template.ATTR_NAME;
  var ATTR_VALUE = basis.template.ATTR_VALUE;
  var ATTR_NAME_BY_TYPE = basis.template.ATTR_NAME_BY_TYPE;

  var ELEMENT_NAME = basis.template.ELEMENT_NAME;

  var TEXT_VALUE = basis.template.TEXT_VALUE;
  var COMMENT_VALUE = basis.template.COMMENT_VALUE;



  //
  // main part
  //

  var eventAttr = /^event-(.+)+/;

  // dictionaries
  var tmplEventListeners = {};
  var tmplNodeMap = { seed: 1 };
  var namespaceURI = {
    svg: 'http://www.w3.org/2000/svg'
  };

  // test for browser (IE) normalize text nodes during cloning
  var CLONE_NORMALIZATION_TEXT_BUG = (function(){
    var element = document.createElement('div');
    element.appendChild(document.createTextNode('a'));
    element.appendChild(document.createTextNode('b'));
    return element.cloneNode(true).childNodes.length == 1;
  })();

  // test for class attribute set via setAttribute bug (IE7 and lower)
  var SET_CLASS_ATTRIBUTE_BUG = (function(){
    var element = document.createElement('div');
    element.setAttribute('class', 'a');
    return !element.className;
  })();


 /**
  * Build functions for creating instance of template.
  */
  var buildFunctions = (function(){

    var WHITESPACE = /\s+/;
    var W3C_DOM_NODE_SUPPORTED = typeof Node == 'function' && document instanceof Node;
    var CLASSLIST_SUPPORTED = global.DOMTokenList && document && document.documentElement.classList instanceof global.DOMTokenList;
    /*var TRANSITION_SUPPORTED = !!(document && (function(){
      var properties = ['webkitTransition', 'MozTransition', 'msTransition', 'OTransition', 'transition'];
      var style = document.documentElement.style;
      for (var i = 0; i < properties.length; i++)
        if (properties[i] in style)
          return true;
      return false;
    })());*/


   /**
    * @func
    */
    var bind_node = W3C_DOM_NODE_SUPPORTED
      // W3C DOM way
      ? function(domRef, oldNode, newValue){
          var newNode = domRef;

          if (newValue instanceof Node)
          {
            if (newValue.nodeType == 11)  // fragment
            {
              if (newValue.firstChild === newValue.lastChild)
                newNode = newValue.firstChild;
              else
                newNode = arrayFrom(newValue);
            }
            else
              newNode = newValue;
          }
          /*else
          {
            if (newValue && Array.isArray(newValue))
              if (newValue.length == 1)
                newNode = newValue[0];
              else
                newNode = arrayFrom(newValue);
          }*/

          if (newNode !== oldNode)
          {
            if (Array.isArray(newNode))
            {
              if (oldNode.fragmentStart)
              {
                newNode.fragmentStart = oldNode.fragmentStart;
                newNode.fragmentEnd = oldNode.fragmentEnd;

                var cursor = newNode.fragmentStart.nextSibling;
                while (cursor && cursor != newNode.fragmentEnd)
                {
                  var tmp = cursor;
                  cursor = cursor.nextSibling;
                  tmp.parentNode.removeChild(tmp);
                }
              }
              else
              {
                newNode.fragmentStart = document.createComment('start');
                newNode.fragmentEnd = document.createComment('end');
                oldNode.parentNode.insertBefore(newNode.fragmentStart, oldNode);
                oldNode.parentNode.replaceChild(newNode.fragmentEnd, oldNode);
              }

              for (var i = 0, node; node = newNode[i]; i++)
                newNode.fragmentEnd.parentNode.insertBefore(node, newNode.fragmentEnd);
            }
            else
            {
              if (oldNode && oldNode.fragmentStart)
              {
                var cursor = oldNode.fragmentStart.nextSibling;
                while (cursor && cursor != oldNode.fragmentEnd)
                {
                  var tmp = cursor;
                  cursor = cursor.nextSibling;
                  tmp.parentNode.removeChild(tmp);
                }
                oldNode.fragmentStart.parentNode.removeChild(oldNode.fragmentStart);
                oldNode = oldNode.fragmentEnd;
              }

              oldNode.parentNode.replaceChild(newNode, oldNode);
            }
          }

          return newNode;
        }
      // Old browsers way (IE6-8 and other)
      : function(domRef, oldNode, newValue){
          var newNode = newValue && typeof newValue == 'object' ? newValue : domRef;

          if (newNode !== oldNode)
            try {
              oldNode.parentNode.replaceChild(newNode, oldNode);
            } catch(e) {
              newNode = domRef;
              if (oldNode !== newNode)
                oldNode.parentNode.replaceChild(newNode, oldNode);
            }

          return newNode;
        };

   /**
    * @func
    */
    var bind_element = function(domRef, oldNode, newValue){
      var newNode = bind_node(domRef, oldNode, newValue);

      if (newNode === domRef && typeof newValue == 'string')  // TODO: save inner nodes on first innerHTML and restore when newValue is not a string
        domRef.innerHTML = newValue;

      return newNode;
    };

   /**
    * @func
    */
    var bind_comment = bind_node;

   /**
    * @func
    */
    var bind_textNode = function(domRef, oldNode, newValue){
      var newNode = bind_node(domRef, oldNode, newValue);

      if (newNode === domRef)
        domRef.nodeValue = newValue;

      return newNode;
    };

   /**
    * @func
    */
    var bind_attrClass = CLASSLIST_SUPPORTED
      // classList supported
      ? function(domRef, oldClass, newValue, prefix, anim){
          var newClass = newValue ? prefix + newValue : "";

          if (newClass != oldClass)
          {
            if (oldClass)
              domRef.classList.remove(oldClass);

            if (newClass)
            {
              domRef.classList.add(newClass);

              if (anim)
              {
                domRef.classList.add(newClass + '-anim');
                basis.timer.nextTick(function(){
                  domRef.classList.remove(newClass + '-anim');
                });
              }
            }
          }

          return newClass;
        }
      // old browsers are not support for classList
      : function(domRef, oldClass, newValue, prefix, anim){
          var newClass = newValue ? prefix + newValue : "";

          if (newClass != oldClass)
          {
            var className = domRef.className;
            var classNameIsObject = typeof className != 'string';
            var classList;

            if (classNameIsObject)
              className = className.baseVal;

            classList = className.split(WHITESPACE);

            if (oldClass)
              classList.remove(oldClass);

            if (newClass)
            {
              classList.push(newClass);

              if (anim)
              {
                classList.add(newClass + '-anim');
                basis.timer.nextTick(function(){
                  var classList = (classNameIsObject ? domRef.className.baseVal : domRef.className).split(WHITESPACE);
                  
                  classList.remove(newClass + '-anim');

                  if (classNameIsObject)
                    domRef.className.baseVal = classList.join(' ');
                  else
                    domRef.className = classList.join(' ');                  
                });
              }
            }

            if (classNameIsObject)
              domRef.className.baseVal = classList.join(' ');
            else
              domRef.className = classList.join(' ');
          }

          return newClass;
        };

   /**
    * @func
    */
    var bind_attrStyle = function(domRef, propertyName, oldValue, newValue){
      if (oldValue !== newValue)
      {
        try {
          domRef.style[propertyName.camelize()] = newValue;
        } catch(e){
        }
      }

      return newValue;
    };

   /**
    * @func
    */
    var bind_attr = function(domRef, attrName, oldValue, newValue){
      if (oldValue !== newValue)
      {
        if (newValue)
          domRef.setAttribute(attrName, newValue);
        else
          domRef.removeAttribute(attrName);
      }

      return newValue;
    };



    function resolveValue(attaches, updateAttach, bindingName, value){
      var bridge = value && value.bindingBridge;
      var oldAttach = attaches[bindingName];

      if (bridge || oldAttach)
      {
        if (bridge)
        {
          if (value !== oldAttach)
          {
            if (oldAttach)
              oldAttach.bindingBridge.detach(oldAttach, updateAttach, bindingName);
            bridge.attach(value, updateAttach, bindingName);
            attaches[bindingName] = value;
          }

          value = bridge.get(value);
        }
        else
        {
          if (oldAttach)
          {
            oldAttach.bindingBridge.detach(oldAttach, updateAttach, bindingName);
            delete attaches[bindingName];
          }
        }
      }
      return value;
    }

    var tools = {
      bind_textNode: bind_textNode,
      bind_node: bind_node,
      bind_element: bind_element,
      bind_comment: bind_comment,
      bind_attr: bind_attr,
      bind_attrClass: bind_attrClass,
      bind_attrStyle: bind_attrStyle,
      resolve: resolveValue,
      l10nToken: l10nToken
    };

    return function(tokens){
      var fn = getFunctions(tokens, true, this.source.url, tokens.source_);
      var templateMap = {};
      var l10nMap = {};
      var l10nProtoSync;

      var proto = buildHtml(tokens);
      var build = function(){
        return proto.cloneNode(true);
      };

      if (fn.createL10nSync)
      {
        l10nProtoSync = fn.createL10nSync(proto, l10nMap, bind_attr, CLONE_NORMALIZATION_TEXT_BUG);

        for (var i = 0, key; key = fn.l10nKeys[i]; i++)
          l10nProtoSync(key, l10nToken(key).value);
      }

      return {
        createInstance: fn.createInstance(tmplNodeMap, templateMap, build, tools, l10nMap, CLONE_NORMALIZATION_TEXT_BUG),
        l10nProtoSync: l10nProtoSync,
        
        keys: fn.keys,
        l10nKeys: fn.l10nKeys,
        map: templateMap
      };
    };
  })();


  //
  // Constructs dom structure
  //

 /**
  * @func
  */
  function findHostTemplate(cursor){
    var refId;
    var tmplRef;

    do {
      if (refId = cursor.basisObjectId)
      {
        // if node found, return it
        if (tmplRef = tmplNodeMap[refId])
          return tmplRef;
      }
    } while (cursor = cursor.parentNode);

    return cursor;
  }

 /**
  * @func
  */
  function createEventHandler(attrName){
    return function(event){
      event = new domEvent.Event(event);

      // don't process right click - generaly FF problem
      if (event && event.type == 'click' && event.which == 3)
        return;

      var cursor = event.sender;
      var attr;
      var refId;

      // IE events may have no source, nothing to do in this case
      if (!cursor)
        return;

      // search for nearest node with event-{eventName} attribute
      do {
        if (attr = (cursor.getAttributeNode && cursor.getAttributeNode(attrName)))
          break;
      } while (cursor = cursor.parentNode);

      // if not found - exit
      if (!cursor || !attr)
        return;

      // search for nearest node refer to basis.Class instance
      var tmplRef = findHostTemplate(cursor);
      if (tmplRef)
      {
        var actions = attr.nodeValue.qw();
        event.actionTarget = cursor;
        for (var i = 0, actionName; actionName = actions[i++];)
          tmplRef.tmpl.action_(actionName, event);
      }
    };
  }

  function createEventTrigger(eventName){
    return function(){
      domEvent.fireEvent(document, eventName);
    };
  }

 /**
  * Creates dom structure by declaration.
  */
  var buildHtml = function(tokens, parent){
    function setEventAttribute(eventName, actions){
      var attrName = 'event-' + eventName;

      if (!tmplEventListeners[eventName])
      {
        tmplEventListeners[eventName] = createEventHandler(attrName);

        for (var k = 0, names = domEvent.browserEvents(eventName), browserEventName; browserEventName = names[k++];)
          domEvent.addGlobalHandler(browserEventName, tmplEventListeners[eventName]);
      }

      // hack for non-bubble events in IE<=8
      if (!domEvent.W3CSUPPORT)
      {
        var eventInfo = domEvent.getEventInfo(eventName, tagName);
        if (eventInfo.supported && !eventInfo.bubble)
          result.attachEvent('on' + eventName, createEventTrigger(eventName));
      }

      result.setAttribute(attrName, actions);
    }

    function setAttribute(name, value){
      if (SET_CLASS_ATTRIBUTE_BUG && name == 'class')
        name = 'className';

      result.setAttribute(name, value);
    }


    var result = parent || document.createDocumentFragment();

    for (var i = parent ? 4 : 0, token; token = tokens[i]; i++)
    {
      switch(token[TOKEN_TYPE])
      {
        case TYPE_ELEMENT: 
          var tagName = token[ELEMENT_NAME];
          var parts = tagName.split(/:/);

          var element = parts.length > 1
            ? document.createElementNS(namespaceURI[parts[0]], tagName)
            : document.createElement(tagName);

          // precess for children and attributes
          buildHtml(token, element);

          // add to result
          result.appendChild(element);

          break;

        case TYPE_ATTRIBUTE:
          var attrName = token[ATTR_NAME];
          var attrValue = token[ATTR_VALUE];
          var eventName = attrName.replace(/^event-/, '');

          if (eventName != attrName)
          {
            setEventAttribute(eventName, attrValue);
          }
          else
          {
            if (attrName != 'class' && attrName != 'style' ? !token[TOKEN_BINDINGS] : attrValue)
              setAttribute(attrName, attrValue || '');
          }

          break;

        case 4:
        case 5:
          var attrValue = token[ATTR_VALUE - 1];

          if (attrValue)
            setAttribute(ATTR_NAME_BY_TYPE[token[TOKEN_TYPE]], attrValue);

          break;

        case 6:
          setEventAttribute(token[1], token[2] || token[1]);
          break;

        case TYPE_COMMENT:
          result.appendChild(document.createComment(token[COMMENT_VALUE] || (token[TOKEN_REFS] ? '{' + token[TOKEN_REFS].join('|') + '}' : '')));
          break;

        case TYPE_TEXT:
          // fix bug with normalize text node in IE8-
          if (CLONE_NORMALIZATION_TEXT_BUG && i && tokens[i - 1][TOKEN_TYPE] == TYPE_TEXT)
            result.appendChild(document.createComment(''));

          result.appendChild(document.createTextNode(token[TEXT_VALUE] || (token[TOKEN_REFS] ? '{' + token[TOKEN_REFS].join('|') + '}' : '') || (token[TOKEN_BINDINGS] ? '!' : '')));
          break;
      }
    }

    return result;
  };

  function resolveObjectById(refId){
    return tmplNodeMap[refId].context;
  }


 /**
  * @class
  */
  var HtmlTemplate = Template.subclass({
    className: namespace + '.Template',

    __extend__: function(value){
      if (value instanceof HtmlTemplate)
        return value;

      if (value instanceof TemplateSwitchConfig)
        return new HtmlTemplateSwitcher(value);

      return new HtmlTemplate(value);
    },

    builder: buildFunctions
  });


 /**
  * @class
  */
  var HtmlTemplateSwitcher = TemplateSwitcher.subclass({
    className: namespace + '.TemplateSwitcher',

    templateClass: HtmlTemplate
  });  


  //
  // exports name
  //

  module.exports = {
    Template: HtmlTemplate,
    TemplateSwitcher: HtmlTemplateSwitcher
  };

  //
  // for backward capability
  // TODO: remove
  //
  basis.template.extend({
    buildHtml: buildHtml,
    buildFunctions: buildFunctions,
    resolveObjectById: resolveObjectById
  });
