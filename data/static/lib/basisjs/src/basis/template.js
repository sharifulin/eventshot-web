
 /**
  * @namespace basis.template
  */

  var namespace = this.path;


  //
  // import names
  //

  var Class = basis.Class;
  var cleaner = basis.cleaner;
  var path = basis.path;


  //
  // Main part
  //

  var templateList = [];
  var tmplFilesMap = {};

  var DECLARATION_VERSION = 2;

  // token types
  /** @const */ var TYPE_ELEMENT = 1;
  /** @const */ var TYPE_ATTRIBUTE = 2;
  /** @const */ var TYPE_ATTRIBUTE_CLASS = 4;
  /** @const */ var TYPE_ATTRIBUTE_STYLE = 5;
  /** @const */ var TYPE_ATTRIBUTE_EVENT = 6;
  /** @const */ var TYPE_TEXT = 3;
  /** @const */ var TYPE_COMMENT = 8;

  // references on fields in declaration
  /** @const */ var TOKEN_TYPE = 0;
  /** @const */ var TOKEN_BINDINGS = 1;
  /** @const */ var TOKEN_REFS = 2;

  /** @const */ var ATTR_NAME = 3;
  /** @const */ var ATTR_VALUE = 4;

  var ATTR_NAME_BY_TYPE = {
    4: 'class',
    5: 'style'
  };
  var ATTR_TYPE_BY_NAME = {
    'class': TYPE_ATTRIBUTE_CLASS,
    'style': TYPE_ATTRIBUTE_STYLE
  };

  /** @const */ var ELEMENT_NAME = 3;
  /** @const */ var ELEMENT_ATTRS = 4;
  /** @const */ var ELEMENT_CHILDS = 5;

  /** @const */ var TEXT_VALUE = 3;
  /** @const */ var COMMENT_VALUE = 3;

  // parsing variables
  var SYNTAX_ERROR = 'Invalid or unsupported syntax';

  // html parsing states
  var TEXT = /((?:.|[\r\n])*?)(\{(?:l10n:([a-zA-Z_][a-zA-Z0-9_\-]*(?:\.[a-zA-Z_][a-zA-Z0-9_\-]*)*)\})?|<(\/|!--(\s*\{)?)?|$)/g;
  var TAG_NAME = /([a-z_][a-z0-9\-_]*)(:|\{|\s*(\/?>)?)/ig;
  var ATTRIBUTE_NAME_OR_END = /([a-z_][a-z0-9_\-]*)(:|\{|=|\s*)|(\/?>)/ig;
  var COMMENT = /(.|[\r\n])*?-->/g;
  var CLOSE_TAG = /([a-z_][a-z0-9_\-]*(?::[a-z_][a-z0-9_\-]*)?)>/ig;
  var REFERENCE = /([a-z_][a-z0-9_]*)(\||\}\s*)/ig;
  var ATTRIBUTE_VALUE = /"((?:(\\")|[^"])*?)"\s*/g;

  var quoteUnescape = /\\"/g;


 /**
  * Parse html into tokens.
  * @param {string} source Source of template
  */
  var tokenize = function(source){
    var result = [];
    var tagStack = [];
    var lastTag = { childs: result };
    var sourceText;
    var token;
    var bufferPos;
    var startPos;
    var parseTag = false;
    var textStateEndPos = 0;
    var textEndPos;

    var state = TEXT;
    var pos = 0;
    var m;

    source = source.trim();

    try {
      while (pos < source.length || state != TEXT)
      {
        state.lastIndex = pos;
        startPos = pos;

        m = state.exec(source);

        if (!m || m.index !== pos)
        {
          //throw SYNTAX_ERROR;

          // treats broken comment reference as comment content
          if (state == REFERENCE && token && token.type == TYPE_COMMENT)
          {
            state = COMMENT;
            continue;
          }

          if (parseTag)
            lastTag = tagStack.pop();

          if (token)
            lastTag.childs.pop();

          if (token = lastTag.childs.pop())
          {
            if (token.type == TYPE_TEXT && !token.refs)
              textStateEndPos -= 'len' in token ? token.len : token.value.length;
            else
              lastTag.childs.push(token);
          }

          parseTag = false;
          state = TEXT;
          continue;
        }

        pos = state.lastIndex;

        //stat[state] = (stat[state] || 0) + 1;
        switch(state)
        {
          case TEXT:

            textEndPos = startPos + m[1].length;

            if (textStateEndPos != textEndPos)
            {
              sourceText = textStateEndPos == startPos
                ? m[1]
                : source.substring(textStateEndPos, textEndPos);

              token = sourceText.replace(/\s*(\r\n?|\n\r?)\s*/g, '');

              if (token)
                lastTag.childs.push({
                  type: TYPE_TEXT,
                  len: sourceText.length,
                  value: token
                });
            }

            textStateEndPos = textEndPos;

            if (m[3])
            {
              lastTag.childs.push({
                type: TYPE_TEXT,
                refs: ['l10n:' + m[3]],
                value: '{l10n:' + m[3] + '}'
              });
            }
            else if (m[2] == '{')
            {
              bufferPos = pos - 1;
              lastTag.childs.push(token = {
                type: TYPE_TEXT
              });
              state = REFERENCE;
            }
            else if (m[4])
            {
              if (m[4] == '/')
              {
                token = null;
                state = CLOSE_TAG;
              }
              else //if (m[3] == '!--')
              {
                lastTag.childs.push(token = {
                  type: TYPE_COMMENT
                });

                if (m[5])
                {
                  bufferPos = pos - m[5].length;
                  state = REFERENCE;
                }
                else
                {
                  bufferPos = pos;
                  state = COMMENT;
                }
              }
            }
            else if (m[2]) // m[2] == '<' open tag
            {
              parseTag = true;
              tagStack.push(lastTag);

              lastTag.childs.push(token = {
                type: TYPE_ELEMENT,
                attrs: [],
                childs: []
              });
              lastTag = token;

              state = TAG_NAME;
            }

            break;

          case CLOSE_TAG:
            if (m[1] !== (lastTag.prefix ? lastTag.prefix + ':' : '') + lastTag.name)
            {
              //throw 'Wrong close tag';
              lastTag.childs.push({
                type: TYPE_TEXT,
                value: '</' + m[0]
              });
            }
            else
              lastTag = tagStack.pop();

            state = TEXT;
            break;

          case TAG_NAME:
          case ATTRIBUTE_NAME_OR_END:
            if (m[2] == ':')
            {
              if (token.prefix)  // if '/' or prefix was before
                throw SYNTAX_ERROR;      // TODO: drop to text but not throw

              token.prefix = m[1];
              break;
            }

            if (m[1])
            {
              // store name (it may be null when check for attribute and end)
              token.name = m[1];

              // store attribute
              if (token.type == TYPE_ATTRIBUTE)
                lastTag.attrs.push(token);
            }

            if (m[2] == '{')
            {
              state = REFERENCE;
              break;
            }

            if (m[3]) // end tag declaration
            {
              if (m[3] == '/>') // otherwise m[3] == '>', nothing to do
                lastTag = tagStack.pop();

              parseTag = false;
              state = TEXT;
              break;
            }

            if (m[2] == '=') // ATTRIBUTE_NAME_OR_END only
            {
              state = ATTRIBUTE_VALUE;
              break;
            }

            // m[2] == '\s+' next attr, state doesn't change
            token = {
              type: TYPE_ATTRIBUTE
            };
            state = ATTRIBUTE_NAME_OR_END;
            break;

          case COMMENT:
            token.value = source.substring(bufferPos, pos - 3);
            state = TEXT;
            break;

          case REFERENCE:
            // add reference to token list name
            if (token.refs)
              token.refs.push(m[1]);
            else
              token.refs = [m[1]];

            // go next
            if (m[2] != '|') // m[2] == '}\s*'
            {
              if (token.type == TYPE_TEXT)
              {
                pos -= m[2].length - 1;
                token.value = source.substring(bufferPos, pos);
                state = TEXT;
              }
              else if (token.type == TYPE_COMMENT)
              {
                state = COMMENT;
              }
              else if (token.type == TYPE_ATTRIBUTE && source[pos] == '=')
              {
                pos++;
                state = ATTRIBUTE_VALUE;
              }
              else // ATTRIBUTE || ELEMENT
              {
                token = {
                  type: TYPE_ATTRIBUTE
                };
                state = ATTRIBUTE_NAME_OR_END;
              }
            }

            // continue to collect references
            break;

          case ATTRIBUTE_VALUE:
            token.value = m[1].replace(quoteUnescape, '"');

            token = {
              type: TYPE_ATTRIBUTE
            };
            state = ATTRIBUTE_NAME_OR_END;

            break;

          default:
            throw 'Parser bug'; // Must never to be here; bug in parser otherwise
        }

        if (state == TEXT)
          textStateEndPos = pos;
      }

      if (textStateEndPos != pos)
        lastTag.childs.push({
          type: TYPE_TEXT,
          value: source.substring(textStateEndPos, pos)
        });

      if (tagStack.length > 1)
        throw 'No close tag for ' + tagStack.pop().name;

      result.templateTokens = true;

    } catch(e) {
      ;;;basis.dev.warn(e, source);
    }

    return result;
  };


  //
  // Convert tokens to declaration
  //

  function dirname(url){
    return String(url).replace(/[^\\\/]+$/, '');
  }


 /**
  * make compiled version of template
  */
  var makeDeclaration = (function(){

    var IDENT = /^[a-z_][a-z0-9_\-]*$/i;
    var CLASS_ATTR_PARTS = /(\S+)/g;
    var CLASS_ATTR_BINDING = /^([a-z_][a-z0-9_\-]*)?\{((anim:)?[a-z_][a-z0-9_\-]*)\}$/i;
    var STYLE_ATTR_PARTS = /\s*[^:]+?\s*:(?:\(.*?\)|".*?"|'.*?'|[^;]+?)+(?:;|$)/gi;
    var STYLE_PROPERTY = /\s*([^:]+?)\s*:((?:\(.*?\)|".*?"|'.*?'|[^;]+?)+);?$/i;
    var ATTR_BINDING = /\{([a-z_][a-z0-9_]*|l10n:[a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)*)\}/i;
    var NAMED_CHARACTER_REF = /&([a-z]+|#[0-9]+|#x[0-9a-f]{1,4});?/gi;
    var tokenMap = basis.NODE_ENV ? require('./template/htmlentity.json') : {};
    var tokenElement = !basis.NODE_ENV ? document.createElement('div') : null;
    var includeStack = [];

    function name(token){
      return (token.prefix ? token.prefix + ':' : '') + token.name;
    }

    function namedCharReplace(m, token){
      if (!tokenMap[token])
      {
        if (token.charAt(0) == '#')
        {
          tokenMap[token] = String.fromCharCode(
            token.charAt(1) == 'x' || token.charAt(1) == 'X'
              ? parseInt(token.substr(2), 16)
              : token.substr(1)
          );
        }
        else
        {
          if (tokenElement)
          {
            tokenElement.innerHTML = m;
            tokenMap[token] = tokenElement.firstChild ? tokenElement.firstChild.nodeValue : m;
          }
        }
      }
      return tokenMap[token] || m;
    }

    function untoken(value){
      return value.replace(NAMED_CHARACTER_REF, namedCharReplace);
    }

    function refList(token){
      var array = token.refs;

      if (!array || !array.length)
        return 0;

      return array;
    }

    function processAttr(name, value){
      function buildExpression(parts){
        var bindName;
        var names = [];
        var expression = [];
        var map = {};
        
        for (var j = 0; j < parts.length; j++)
          if (j % 2)
          {
            bindName = parts[j];
            
            if (!map[bindName])
            {
              map[bindName] = names.length;
              names.push(bindName);
            }

            expression.push(map[bindName]);
          }
          else
          {
            if (parts[j])
              expression.push(untoken(parts[j]));
          }

        return [names, expression];
      }

      var bindings = 0;
      var parts;
      var m;

      // other attributes
      if (value)
      {
        switch (name)
        {
          case 'class':
            if (parts = value.match(CLASS_ATTR_PARTS))
            {
              var newValue = [];

              bindings = [];

              for (var j = 0, part; part = parts[j]; j++)
              {
                if (m = part.match(CLASS_ATTR_BINDING))
                  bindings.push([m[1] || '', m[2]]);
                else
                  newValue.push(part);
              }
              
              // set new value
              value = newValue.join(' ');
            }
            break;

          case 'style':
            var props = [];

            bindings = [];
            if (parts = value.match(STYLE_ATTR_PARTS))
            {
              for (var j = 0, part; part = parts[j]; j++)
              {
                var m = part.match(STYLE_PROPERTY);
                var propertyName = m[1];
                var value = m[2].trim();

                var valueParts = value.split(ATTR_BINDING);
                if (valueParts.length > 1)
                {
                  var expr = buildExpression(valueParts);
                  expr.push(propertyName);
                  bindings.push(expr);
                }
                else
                  props.push(propertyName + ': ' + untoken(value));
              }
            }
            else
            {
              ;;;if (/\S/.test(value)) basis.dev.warn('Bad value for style attribute (value ignored):', value);
            }

            props.push('');
            value = props.join(';');
            break;

          default:
            parts = value.split(ATTR_BINDING);
            if (parts.length > 1)
              bindings = buildExpression(parts);
            else
              value = untoken(value);
        }
      }

      if (bindings && !bindings.length)
        bindings = 0;

      return {
        binding: bindings,
        value: value,
        type: ATTR_TYPE_BY_NAME[name] || 2
      };   
    }

    function attrs(token, declToken, optimizeSize){
      var attrs = token.attrs;
      var result = [];
      var m;

      for (var i = 0, attr; attr = attrs[i]; i++)
      {
        // process special attributes (basis namespace)
        if (attr.prefix == 'b')
        {
          switch (attr.name)
          {
            case 'ref':
              var refs = (attr.value || '').trim().split(/\s+/);
              for (var j = 0; j < refs.length; j++)
                addTokenRef(declToken, refs[j]);
            break;
          }

          continue;
        }

        if (m = attr.name.match(/^event-(.+)$/))
        {
          result.push(m[1] == attr.value ? [TYPE_ATTRIBUTE_EVENT, m[1]] : [TYPE_ATTRIBUTE_EVENT, m[1], attr.value]);
          continue;
        }

        var parsed = processAttr(attr.name, attr.value);
        var item = [
          parsed.type,            // TOKEN_TYPE = 0
          parsed.binding,         // TOKEN_BINDINGS = 1
          refList(attr)           // TOKEN_REFS = 2         
        ];

        // ATTR_NAME = 3
        if (parsed.type == 2)
          item.push(name(attr));

        // ATTR_VALUE = 4
        if (parsed.value && (!optimizeSize || !parsed.binding || parsed.type != 2))
          item.push(parsed.value);

        result.push(item);
      }

      return result.length ? result : 0;
    }

    function addTokenRef(token, refName){
      if (!token[TOKEN_REFS])
        token[TOKEN_REFS] = [];

      token[TOKEN_REFS].add(refName);

      if (refName != 'element')
        token[TOKEN_BINDINGS] = token[TOKEN_REFS].length == 1 ? refName : 0;
    }

    function removeTokenRef(token, refName){
      var idx = token[TOKEN_REFS].indexOf(refName);
      if (idx != -1)
      {
        var indexBinding = token[TOKEN_BINDINGS] && typeof token[TOKEN_BINDINGS] == 'number';
        token[TOKEN_REFS].splice(idx, 1);

        if (indexBinding)
          if (idx == token[TOKEN_BINDINGS] - 1)
            token[TOKEN_BINDINGS] = refName;

        if (!token[TOKEN_REFS].length)
          token[TOKEN_REFS] = 0;
        else
        {
          if (indexBinding)
            token[TOKEN_BINDINGS] -= idx < (token[TOKEN_BINDINGS] - 1);
        }
      }
    }

    function tokenAttrs(token){
      var result = {};

      if (token.attrs)
        for (var i = 0, attr; attr = token.attrs[i]; i++)
          result[name(attr)] = attr.value;

      return result;
    }

    function addUnique(array, items){
      for (var i = 0; i < items.length; i++)
        array.add(items[i]);
    }

    //
    // main function
    //
    function process(tokens, template, options){

      function modifyAttr(token, name, action){
        var attrs = tokenAttrs(token);

        if (name)
          attrs.name = name;

        if (!attrs.name)
        {
          ;;;template.warns.push('Instruction <b:' + token.name + '> has no attribute name');
          return;
        }  

        if (!IDENT.test(attrs.name))
        {
          ;;;template.warns.push('Bad attribute name `' + attrs.name + '`');
          return;
        }

        var includedToken = tokenRefMap[attrs.ref || 'element'];
        if (includedToken)
        {
          if (includedToken.token[TOKEN_TYPE] == TYPE_ELEMENT)
          {
            var itAttrs = includedToken.token;
            var itType = ATTR_TYPE_BY_NAME[attrs.name];
            var valueIdx = ATTR_VALUE - !!itType;
            var itAttrToken = itAttrs && itAttrs.search(attrs.name, function(token){
              return itType ? ATTR_NAME_BY_TYPE[token[TOKEN_TYPE]] : token[ATTR_NAME];
            });

            if (!itAttrToken && action != 'remove')
            {
              itAttrToken = [
                itType || TYPE_ATTRIBUTE,
                0,
                0
              ];
              if (!itType)
                itAttrToken.push(attrs.name);
              itAttrToken.push('');

              if (!itAttrs)
              {
                itAttrs = [];
                includedToken.token.push(itAttrs);
              }

              itAttrs.push(itAttrToken);
            }

            var classOrStyle = attrs.name == 'class' || attrs.name == 'style';
            switch (action){
              case 'set':
                var parsed = processAttr(attrs.name, attrs.value);

                itAttrToken[TOKEN_BINDINGS] = parsed.binding;

                if (!options.optimizeSize || !itAttrToken[TOKEN_BINDINGS] || classOrStyle)
                  itAttrToken[valueIdx] = parsed.value || '';
                else
                  itAttrToken.length = valueIdx;

                if (classOrStyle)
                  if (!itAttrToken[TOKEN_BINDINGS] && !itAttrToken[valueIdx])
                  {
                    itAttrs.remove(itAttrToken);
                    return;
                  }

                break;

              case 'append':
                var parsed = processAttr(attrs.name, attrs.value);

                if (parsed.binding)
                {
                  var attrBindings = itAttrToken[TOKEN_BINDINGS];
                  if (attrBindings)
                  {
                    if (attrs.name == 'style')
                    {
                      var filter = {};

                      for (var i = 0, newBinding; newBinding = parsed.binding[i]; i++)
                        filter[newBinding[2]] = true;

                      for (var i = 0, k = 0, oldBinding; oldBinding = attrBindings[i]; i++)
                        if (!filter[oldBinding[2]])
                          attrBindings[k++] = oldBinding;

                      attrBindings.length = k;
                    }

                    attrBindings.push.apply(attrBindings, parsed.binding);
                  }
                  else
                    itAttrToken[TOKEN_BINDINGS] = parsed.binding;
                }

                if (parsed.value)
                  itAttrToken[valueIdx] += (itAttrToken[valueIdx] && attrs.name == 'class' ? ' ' : '') + parsed.value;

                if (classOrStyle)
                  if (!itAttrToken[TOKEN_BINDINGS] && !itAttrToken[valueIdx])
                  {
                    itAttrs.remove(itAttrToken);
                    return;
                  }

                break;

              case 'remove':
                if (itAttrToken)
                  itAttrs.remove(itAttrToken);

                break;
            }
          }
          else
          {
            ;;;template.warns.push('Attribute modificator is not reference to element token (reference name: ' + (attrs.ref || 'element') + ')');
          }
        }
      }

      var result = [];

      for (var i = 0, token, item; token = tokens[i]; i++)
      {
        var refs = refList(token);
        var bindings = refs && refs.length == 1 ? refs[0] : 0;

        switch (token.type)
        {
          case TYPE_ELEMENT:
            // special elements (basis namespace)
            if (token.prefix == 'b')
            {
              var elAttrs = tokenAttrs(token);

              switch (token.name)
              {
                case 'resource':
                case 'style':
                  if (elAttrs.src)
                    template.resources.push(path.resolve(template.baseURI + elAttrs.src));
                break;

                /*case 'set':
                  if ('name' in elAttrs && 'value' in elAttrs)
                  {
                    var value = elAttrs.value;

                    if (value == 'true')
                      value = true;
                    if (value == 'false')
                      value = false;

                    template.options[elAttrs.name] = value;
                  }
                break;*/

                case 'define':
                  if ('name' in elAttrs && !template.defines[elAttrs.name])
                  {
                    switch (elAttrs.type)
                    {
                      case 'bool':
                        template.defines[elAttrs.name] = [elAttrs['default'] == 'true' ? 1 : 0];
                        break;
                      case 'enum':
                        var values = elAttrs.values ? elAttrs.values.qw() : [];
                        template.defines[elAttrs.name] = [values.indexOf(elAttrs['default']) + 1, values];
                        break;
                      ;;;default:
                      ;;;  template.warns.push('Bad define type `' + elAttrs.type + '` for ' + elAttrs.name);
                    }
                  }
                break;

                case 'include':

                  if (elAttrs.src)
                  {
                    var isTemplateRef = /^#\d+$/.test(elAttrs.src);
                    var url = isTemplateRef ? elAttrs.src.substr(1) : elAttrs.src;

                    if (includeStack.indexOf(url) == -1) // prevent recursion
                    {
                      includeStack.push(url);

                      var decl;

                      if (isTemplateRef)
                      {
                        var tmpl = templateList[url];
                        template.deps.add(tmpl);
                        if (tmpl.source.bindingBridge)
                          template.deps.add(tmpl.source);

                        decl = getDeclFromSource(tmpl.source, tmpl.baseURI, true, options);
                      }
                      else
                      {
                        var resource;

                        if (/^[a-z0-9\.]+$/i.test(url) && !/\.tmpl$/.test(url))
                          resource = getSourceByPath(url);
                        else
                          resource = basis.resource(path.resolve(template.baseURI + url));

                        template.deps.add(resource);
                        decl = getDeclFromSource(resource.get(), resource.url ? path.dirname(resource.url) + '/' : '', true, options);
                      }

                      includeStack.pop();

                      if (decl.resources && 'no-style' in elAttrs == false)
                        addUnique(template.resources, decl.resources);
                      if (decl.deps)
                        addUnique(template.deps, decl.deps);

                      //basis.dev.log(elAttrs.src + ' -> ' + url);
                      //basis.dev.log(decl);

                      var tokenRefMap = normalizeRefs(decl.tokens);
                      var instructions = (token.childs || []).slice();

                      if (elAttrs['class'])
                        instructions.push({
                          type: TYPE_ELEMENT,
                          prefix: 'b',
                          name: 'append-class',
                          attrs: [
                            {
                              type: TYPE_ATTRIBUTE,
                              name: 'value',
                              value: elAttrs['class']
                            }
                          ]
                        });

                      if (elAttrs.id)
                        instructions.push({
                          type: TYPE_ELEMENT,
                          prefix: 'b',
                          name: 'set-attr',
                          attrs: [
                            {
                              type: TYPE_ATTRIBUTE,
                              name: 'name',
                              value: 'id'
                            },
                            {
                              type: TYPE_ATTRIBUTE,
                              name: 'value',
                              value: elAttrs.id
                            }
                          ]
                        });

                      if (elAttrs.ref)
                        if (tokenRefMap.element)
                          elAttrs.ref.trim().split(/\s+/).map(function(refName){
                            addTokenRef(tokenRefMap.element.token, refName);
                          });

                      for (var j = 0, child; child = instructions[j]; j++)
                      {
                        // process special elements (basis namespace)
                        if (child.type == TYPE_ELEMENT && child.prefix == 'b')
                        {
                          switch (child.name)
                          {
                            case 'replace':
                            case 'before':
                            case 'after':
                              var childAttrs = tokenAttrs(child);
                              var tokenRef = childAttrs.ref && tokenRefMap[childAttrs.ref];

                              if (tokenRef)
                              {
                                var pos = tokenRef.owner.indexOf(tokenRef.token);
                                var rem;
                                if (pos != -1)
                                {
                                  pos += child.name == 'after';
                                  rem = child.name == 'replace';
                                  tokenRef.owner.splice.apply(tokenRef.owner, [pos, rem].concat(process(child.childs, template, options) || []));
                                }
                              }
                            break;

                            case 'prepend':                            
                            case 'append':
                              var childAttrs = tokenAttrs(child);
                              var ref = 'ref' in childAttrs ? childAttrs.ref : 'element';
                              var tokenRef = ref && tokenRefMap[ref];
                              var token = tokenRef && tokenRef.token;

                              if (token && token[TOKEN_TYPE] == TYPE_ELEMENT)
                              {
                                var childs = process(child.childs, template, options) || [];

                                if (child.name == 'prepend')
                                  token.splice.apply(token, [ELEMENT_ATTRS, 0].concat(childs));
                                else
                                  token.push.apply(token, childs);
                              }
                            break;                            

                            case 'attr':
                            case 'set-attr':
                              modifyAttr(child, false, 'set');
                            break;

                            case 'append-attr':
                              modifyAttr(child, false, 'append');
                            break;

                            case 'remove-attr':
                              modifyAttr(child, false, 'remove');
                            break;

                            case 'class':
                            case 'append-class':
                              modifyAttr(child, 'class', 'append');
                            break;

                            case 'set-class':
                              modifyAttr(child, 'class', 'set');
                            break;

                            case 'remove-class':
                              modifyAttr(child, 'class', 'remove');
                            break;

                            case 'add-ref':
                              var childAttrs = tokenAttrs(child);
                              var ref = 'ref' in childAttrs ? childAttrs.ref : 'element';
                              var tokenRef = ref && tokenRefMap[ref];
                              var token = tokenRef && tokenRef.token;

                              if (token && childAttrs.name)
                                addTokenRef(token, childAttrs.name);
                            break;

                            case 'remove-ref':
                              var childAttrs = tokenAttrs(child);
                              var ref = 'ref' in childAttrs ? childAttrs.ref : 'element';
                              var tokenRef = ref && tokenRefMap[ref];
                              var token = tokenRef && tokenRef.token;

                              if (token)
                                removeTokenRef(token, childAttrs.name || childAttrs.ref);
                            break;

                            default: 
                              ;;;template.warns.push('Unknown instruction tag <b:' + child.name + '>');
                          }
                        }
                        else
                          decl.tokens.push.apply(decl.tokens, process([child], template, options) || []);
                      }

                      if (tokenRefMap.element)
                        removeTokenRef(tokenRefMap.element.token, 'element');

                      //resources.push.apply(resources, tokens.resources);
                      result.push.apply(result, decl.tokens);
                    }
                    else
                    {
                      ;;;basis.dev.warn('Recursion: ', includeStack.join(' -> '));
                    }
                  }

                break;
              }

              // don't add to declaration
              continue;
            }

            item = [
              1,                       // TOKEN_TYPE = 0
              bindings,                // TOKEN_BINDINGS = 1
              refs,                    // TOKEN_REFS = 2
              name(token)             // ELEMENT_NAME = 3
            ]
            item.push.apply(item, attrs(token, item, options.optimizeSize) || []);
            item.push.apply(item, process(token.childs, template, options) || []);

            break;

          case TYPE_TEXT:
            if (refs && refs.length == 2 && refs.search('element'))
              bindings = refs[+!Array.lastSearchIndex];

            item = [
              3,                       // TOKEN_TYPE = 0
              bindings,                // TOKEN_BINDINGS = 1
              refs                     // TOKEN_REFS = 2
            ];

            // TEXT_VALUE = 3
            if (!refs || token.value != '{' + refs.join('|') + '}')
              item.push(untoken(token.value));

            break;

          case TYPE_COMMENT:
            if (options.optimizeSize && !bindings && !refs)
              continue;

            item = [
              8,                       // TOKEN_TYPE = 0
              bindings,                // TOKEN_BINDINGS = 1
              refs                     // TOKEN_REFS = 2
            ];

            // COMMENT_VALUE = 3
            if (!options.optimizeSize)
              if (!refs || token.value != '{' + refs.join('|') + '}')
                item.push(untoken(token.value));

            break;
        }

        while (item[item.length - 1] === 0)
          item.pop();

        result.push(item);
      }


      return result.length ? result : 0;
    }

    function normalizeRefs(tokens, map, stIdx){
      if (!map)
        map = {};

      for (var i = stIdx || 0, token; token = tokens[i]; i++)
      {
        if (token[TOKEN_TYPE] == TYPE_ATTRIBUTE_EVENT)
          continue;

        var refs = token[TOKEN_REFS];

        if (refs)
        {
          for (var j = refs.length - 1, refName; refName = refs[j]; j--)
          {
            if (refName.indexOf(':') != -1)
            {
              removeTokenRef(token, refName);
              continue;
            }

            if (map[refName])
              removeTokenRef(map[refName].token, refName);

            if (token[TOKEN_BINDINGS] == refName)
              token[TOKEN_BINDINGS] = j + 1;

            map[refName] = {
              owner: tokens,
              token: token
            };
          }
        }

        if (token[TOKEN_TYPE] == TYPE_ELEMENT)
          normalizeRefs(token, map, ELEMENT_ATTRS);
      }

      return map;
    }

    function applyDefines(tokens, template, options, stIdx){
      var unpredictable = 0;

      for (var i = stIdx || 0, token; token = tokens[i]; i++)
      {
        if (token[TOKEN_TYPE] == TYPE_ELEMENT)
          unpredictable += applyDefines(token, template, options, ELEMENT_ATTRS);

        if (token[TOKEN_TYPE] == TYPE_ATTRIBUTE_CLASS || (token[TOKEN_TYPE] == TYPE_ATTRIBUTE && token[ATTR_NAME] == 'class'))
        {
          var bindings = token[TOKEN_BINDINGS];
          var valueIdx = ATTR_VALUE - (token[TOKEN_TYPE] == TYPE_ATTRIBUTE_CLASS);

          if (bindings)
          {
            var newAttrValue = (token[valueIdx] || '').qw();

            for (var k = 0, bind; bind = bindings[k]; k++)
            {
              if (bind.length > 2)  // bind already processed
                continue;

              var bindName = bind[1].split(':').pop();
              var bindDef = template.defines[bindName];

              if (bindDef)
              {
                bind.push.apply(bind, bindDef);
                bindDef.used = true;

                if (bindDef[0])
                {
                  if (bindDef.length == 1) // bool
                    newAttrValue.add(bind[0] + bindName);
                  else                     // enum
                    newAttrValue.add(bind[0] + bindDef[1][bindDef[0] - 1]);
                }
              }
              else
              {
                ;;;template.warns.push('Unpredictable value `' + bindName + '` in class binding: ' + bind[0] + '{' + bind[1] + '}');
                unpredictable++;
              }
            }

            token[valueIdx] = newAttrValue.join(' ');
            if (options.optimizeSize && !token[valueIdx])
              token.length = valueIdx;
          }
        }
      }

      return unpredictable;
    }

    return function(source, baseURI, options){
      options = options || {};
      var debug = options.debug;
      var warns = [];
      ;;;var source_;

      // result object
      var result = {
        baseURI: baseURI || '',
        tokens: null,
        resources: [],
        deps: [],
        defines: {},
        unpredictable: true,
        warns: warns
      };

      if (!source.templateTokens)
      {
        ;;;source_ = source;
        source = tokenize('' + source);
      }

      // main task
      result.tokens = process(source, result, options);

      // there must be at least one token in result
      if (!result.tokens)
        result.tokens = [[3, 0, 0, '']];

      // store source for debug
      ;;;if (source_) result.tokens.source_ = source_;

      // normalize refs
      addTokenRef(result.tokens[0], 'element');
      normalizeRefs(result.tokens);

      // deal with defines
      result.unpredictable = !!applyDefines(result.tokens, result, options);

      ;;;for (var key in result.defines) if (!result.defines[key].used) warns.push('Unused define for ' + key);

      // delete unnecessary keys
      delete result.defines;

      if (!warns.length)
        result.warns = false;
      //else console.warn('Template make declaration warns', result, result.warns.join('\n'));

      return result;
    };
  })();

  //
  //
  //

  var usableResources = {
    '.css': true
  };

  function startUseResource(uri){
    if (usableResources[path.extname(uri)])
      basis.resource(uri)().startUse();
  }

  function stopUseResource(uri){
    if (usableResources[path.extname(uri)])
      basis.resource(uri)().stopUse();
  }



 /**
  * @func
  */
  function templateSourceUpdate(){
    if (this.instances_)
      buildTemplate.call(this);

    for (var i = 0, attach; attach = this.attaches_[i]; i++)
      attach.handler.call(attach.context);
  }

  function cloneDecl(array){
    var result = [];

    ;;;if (array.source_) result.source_ = array.source_;

    for (var i = 0; i < array.length; i++)
      result.push(
        Array.isArray(array[i])
          ? cloneDecl(array[i])
          : array[i]
      );

    return result;
  }

 /**
  * @param {Template} template
  * @param {boolean=} clone
  */
  function getDeclFromSource(source, baseURI, clone, options){
    var result = source;

    if (typeof result == 'function')
    {
      baseURI = 'baseURI' in source ? source.baseURI : baseURI;
      result = result();
    }

    if (result instanceof basis.Token)
    {
      baseURI = 'baseURI' in source ? source.baseURI : baseURI;
      result = result.get();
    }

    if (Array.isArray(result))
    {
      if (clone)
        result = cloneDecl(result);

      result = {
        tokens: result
      };
    }
    else
    {
      if (typeof result != 'object' || !Array.isArray(result.tokens))
        result = String(result);
    }

    if (typeof result == 'string')
      result = makeDeclaration(result, baseURI, options);

    return result;
  }

 /**
  * @func
  */
  function createTemplateBindingUpdater(names, getters){
    return function templateBindingUpdater(){
      for (var i = 0, bindingName; bindingName = names[i]; i++)
        this.tmpl.set(bindingName, getters[bindingName](this));
    };
  }

 /**
  * @func
  */
  function createBindingFunction(keys){
    var bindingCache = {};
    return function getBinding(bindings, testNode){
      var cacheId = 'bindingId' in bindings
        ? bindings.bindingId
        : null;

      ;;;if (!cacheId) basis.dev.warn('basis.template.Template.getBinding: bindings has no bindingId property, cache is not used');

      var result = bindingCache[cacheId];

      if (!result)
      {
        var names = [];
        var getters = {};
        var events = {};
        var handler;
        for (var i = 0, key; key = keys[i]; i++)
        {
          var binding = bindings[key];
          var getter = binding && binding.getter;

          if (getter)
          {
            getters[key] = getter;
            names.push(key);

            if (binding.events)
            {
              var eventList = binding.events;

              if (!Array.isArray(eventList))
                eventList = String(eventList).qw();

              for (var j = 0, eventName; eventName = eventList[j]; j++)
              {
                ;;;if (testNode && ('emit_' + eventName) in testNode == false) basis.dev.warn('basis.template.Template.getBinding: unknown event `' + eventName + '` for ' + (testNode.constructor && testNode.constructor.className));
                if (events[eventName])
                {
                  events[eventName].push(key);
                }
                else
                {
                  handler = handler || {};
                  events[eventName] = [key];
                  handler[eventName] = createTemplateBindingUpdater(events[eventName], getters);
                }
              }
            }
          }
        }

        result = {
          names: names,
          events: events,
          sync: createTemplateBindingUpdater(names, getters),
          handler: handler
        };

        if (cacheId)
          bindingCache[cacheId] = result;
      }

      return result;
    };
  }

 /**
  * @func
  */
  function buildTemplate(){
    var decl = getDeclFromSource(this.source, this.baseURI);
    var instances = this.instances_;
    var funcs = this.builder(decl.tokens);  // makeFunctions
    var l10n = this.l10n_;
    var deps = this.deps_;

    if (deps)
    {
      this.deps_ = null;
      for (var i = 0, dep; dep = deps[i]; i++)
        dep.bindingBridge.detach(dep, buildTemplate, this);
    }

    if (decl.deps && decl.deps.length)
    {
      deps = decl.deps;
      this.deps_ = deps;
      for (var i = 0, dep; dep = deps[i]; i++)
        dep.bindingBridge.attach(dep, buildTemplate, this);
    }

    if (l10n)
    {
      this.l10n_ = null;
      for (var i = 0, link; link = l10n[i]; i++)
        link.token.detach(link.handler, link);
    }

    this.createInstance = funcs.createInstance;
    this.getBinding = createBindingFunction(funcs.keys);
    this.instances_ = funcs.map;

    var l10nProtoSync = funcs.l10nProtoSync;
    var hasResources = decl.resources && decl.resources.length > 0;

    if (hasResources)
      for (var i = 0, res; res = decl.resources[i]; i++)
        startUseResource(res);

    if (this.resources)
      for (var i = 0, res; res = this.resources[i]; i++)
        stopUseResource(res);

    this.resources = hasResources && decl.resources;

    if (instances)
      for (var id in instances)
        instances[id].rebuild_();

    if (funcs.l10nKeys)
    {
      l10n = [];
      this.l10n_ = l10n;
      instances = funcs.map;
      for (var i = 0, key; key = funcs.l10nKeys[i]; i++)
      {
        var link = {
          path: key,
          token: basis.l10n.token(key),
          handler: function(value){
            l10nProtoSync(this.path, value);
            for (var id in instances)
              instances[id].set(this.path, value);
          }
        };
        link.token.attach(link.handler, link);
        l10n.push(link);
      }
    }
  }


  //
  // source from script by id
  //

  function sourceById(sourceId){
    var host = document.getElementById(sourceId);

    if (host && host.tagName == 'SCRIPT')
    {
      if (host.type == 'text/basis-template')
        return host.textContent || host.text;
      
      ;;;basis.dev.warn('Template script element with wrong type', host.type);

      return '';
    }

    ;;;basis.dev.warn('Template script element with id `' + sourceId + '` not found');

    return '';
  }

  function resolveSourceById(sourceId){
    return function(){
      return sourceById(sourceId);
    };
  }

 /**
  * Creates DOM structure template from marked HTML. Use {basis.Html.Template#createInstance}
  * method to apply template to object. It creates clone of DOM structure and adds
  * links into object to pointed parts of structure.
  *
  * To remove links to DOM structure from object use {basis.Html.Template#clearInstance}
  * method.
  * @example
  *   // create a template
  *   var template = new basis.template.html.Template(
  *     '<li class="listitem item-{num}" title="Item #{num}: {title}">' +
  *       '<a href="{url}">{title}</a>' + 
  *       '<span class="description">{description}</span>' +
  *     '</li>'
  *   );
  *
  *   // create list container
  *   var list = document.createElement('ul'); // or create using another template
  *
  *   // create 10 DOM elements using template
  *   for (var i = 0; i < 10; i++)
  *   {
  *     var tmpl = template.createInstance();
  *     tmpl.set('num', i);
  *     tmpl.set('url', '/foo/bar.html');
  *     tmpl.set('title, 'some title');
  *     tmpl.set('description', 'description text');
  *     list.appendChild(tmpl.element);
  *   }
  *
  * @class
  */
  var Template = Class(null, {
    className: namespace + '.Template',

    __extend__: function(value){
      if (value instanceof Template)
        return value;

      if (value instanceof TemplateSwitchConfig)
        return new TemplateSwitcher(value);

      return new Template(value);
    },

   /**
    * Template source
    * @type {string|function|Array}
    */
    source: '',

   /**
    * Base url for nested resources.
    * @type {string}
    */
    baseURI: '',

   /**
    * @param {string|function()|Array} source Template source code that will be parsed
    * into DOM structure prototype. Parsing will be done on first {basis.Html.Template#createInstance}
    * or {basis.Html.Template#getBinding} call. If function passed it be called and it's result will be
    * used as template source code. If array passed that it treats as token list.
    * @constructor
    */
    init: function(source){
      this.attaches_ = [];
      this.setSource(source || '');

      this.templateId = templateList.push(this) - 1;
    },

    bindingBridge: {
      attach: function(template, handler, context){
        for (var i = 0, listener; listener = template.attaches_[i]; i++)
          if (listener.handler == handler && listener.context == context)
            return false;

        template.attaches_.push({
          handler: handler,
          context: context
        });

        return true;
      },
      detach: function(template, handler, context){
        for (var i = 0, listener; listener = template.attaches_[i]; i++)
          if (listener.handler == handler && listener.context == context)
          {
            template.attaches_.splice(i, 1);
            return true;
          }

        return false;
      },
      get: function(){}
    },

   /**
    * Create DOM structure and return object with references for it's nodes.
    * @param {Object=} node Object which templateAction method will be called on events.
    * @param {function=} actionCallback
    * @param {function=} updateCallback
    * @return {Object}
    */
    createInstance: function(node, actionCallback, updateCallback){
      buildTemplate.call(this);
      return this.createInstance(node, actionCallback, updateCallback);
    },

   /**
    * Remove reference from DOM structure
    * @param {Object=} object Storage of DOM references.
    */
    clearInstance: function(tmpl){
      tmpl.destroy_();
    },

    getBinding: function(bindings){
      buildTemplate.call(this);
      return this.getBinding(bindings);
    },

    setSource: function(source){
      var oldSource = this.source;
      if (oldSource != source)
      {
        if (typeof source == 'string')
        {
          var m = source.match(/^([a-z]+):/);
          if (m)
          {
            var prefix = m[1];

            source = source.substr(m[0].length);

            switch (prefix)
            {
              case 'file':
                source = basis.resource(source);
                break;
              case 'id':
                // source from script element
                source = resolveSourceById(source);
                break;
              case 'tokens':
                source = source.toObject();
                source.isDecl = true;
                break;
              case 'raw':
                //source = source;
                break;
              case 'path':
                source = getSourceByPath(source);
                break;
              default:
                ;;;basis.dev.warn(namespace + '.Template.setSource: Unknown prefix ' + prefix + ' for template source was ingnored.');
            }
          }
        }

        if (oldSource && oldSource.bindingBridge)
        {
          var tmplList = oldSource.url && tmplFilesMap[oldSource.url];
          if (tmplList)
          {
            tmplList.remove(this);
            if (!tmplList.length)
              delete tmplFilesMap[oldSource.url];
          }

          this.baseURI = '';
          this.source.bindingBridge.detach(oldSource, templateSourceUpdate, this);
        }

        if (source && source.bindingBridge)
        {
          if (source.url)
          {
            this.baseURI = dirname(source.url);
            if (!tmplFilesMap[source.url])
              tmplFilesMap[source.url] = [];
            tmplFilesMap[source.url].add(this);
          }

          source.bindingBridge.attach(source, templateSourceUpdate, this);
        }

        this.source = source;

        templateSourceUpdate.call(this);
      }
    }
  });


 /**
  * @class
  */
  var TemplateSwitchConfig = function(config){
    basis.object.extend(this, config);
  };


 /**
  * @class
  */
  var TemplateSwitcher = basis.Class(null, {
    className: namespace + '.TemplateSwitcher',

    ruleRet_: null,
    templates_: null,

    templateClass: Template,
    ruleEvents: null,
    rule: String,  // return empty string as template source

    init: function(config){
      this.ruleRet_ = [];
      this.templates_ = [];
      this.rule = config.rule;

      var events = config.events;
      if (events && events.length)
      {
        this.ruleEvents = {};      
        for (var i = 0, eventName; eventName = events[i]; i++)
          this.ruleEvents[eventName] = true;
      }

      cleaner.add(this);
    },
    resolve: function(object){
      var ret = this.rule(object);
      var idx = this.ruleRet_.indexOf(ret);

      if (idx == -1)
      {
        this.ruleRet_.push(ret);
        idx = this.templates_.push(new this.templateClass(ret)) - 1;
      }

      return this.templates_[idx];
    },
    destroy: function(){
      this.rule = null;
      this.templates_ = null;
      this.ruleRet_ = null;
    }
  });


 /**
  * Helper to create TemplateSwitchConfig instance
  */
  function switcher(events, rule){
    var args = basis.array(arguments);
    var rule = args.pop();

    return new TemplateSwitchConfig({
      rule: rule,
      events: args.join(' ').trim().split(/\s+/)
    });
  }


  //
  // Theme
  //

 /**
  * @class
  */
  var Theme = Class(null, {
    className: namespace + '.Theme',
    get: getSourceByPath
  });


 /**
  * @class
  */
  var SourceWrapper = Class(basis.Token, {
    className: namespace + '.SourceWrapper',

   /**
    * Template source name.
    * @type {string}
    */
    path: '',

   /**
    * Url of wrapped content, if exists.
    * @type {string}
    */
    url: '',

   /**
    * Base URI of wrapped content, if exists.
    * @type {string}
    */
    baseURI: '',

   /**
    * @constructor
    * @param {*} value
    * @param {string} path
    */ 
    init: function(value, path){
      this.path = path;
      basis.Token.prototype.init.call(this, '');
    },

   /**
    * @inheritDocs
    */
    get: function(){
      return this.value && this.value.bindingBridge
        ? this.value.bindingBridge.get(this.value)
        : this.value;
    },

   /**
    * @inheritDocs
    */ 
    set: function(){
      var content = getThemeSource(currentThemeName, this.path);

      if (this.value != content)
      {
        if (this.value && this.value.bindingBridge)
          this.value.bindingBridge.detach(this.value, this.apply, this);

        this.value = content;
        this.url = (content && content.url) || '';
        this.baseURI = (typeof content == 'object' || typeof content == 'function') && 'baseURI' in content ? content.baseURI : path.dirname(this.url) + '/';

        if (this.value && this.value.bindingBridge)
          this.value.bindingBridge.attach(this.value, this.apply, this);

        this.apply();
      }
    },

   /**
    * @destructor
    */
    destroy: function(){
      this.url = null;
      this.baseURI = null;
      
      if (this.value && this.value.bindingBridge)
        this.value.bindingBridge.detach(this.value, this.apply, this);

      basis.Token.prototype.destroy.call(this);
    }
  });


  function getSourceByPath(){
    var path = basis.array(arguments).join('.');
    var source = sourceByPath[path];

    if (!source)
    {
      source = new SourceWrapper('', path);
      sourceByPath[path] = source;
    }

    return source;
  }

  function normalize(list){
    var used = {};
    var result = [];

    for (var i = 0; i < list.length; i++)
      if (!used[list[i]])
      {
        used[list[i]] = true;
        result.push(list[i]);
      }

    return result;
  }

  function extendFallback(themeName, list){
    var result = [];
    result.source = normalize(list).join('/');

    // map for used themes
    var used = {
      base: true
    };

    for (var i = 0; i < list.length; i++)
    {
      var name = list[i] || 'base';

      // skip if theme already processed
      if (name == themeName || used[name])
        continue;

      // get or create theme
      var theme = getTheme(name);

      // mark theme as used (theme could be only once in list)
      // and add to lists
      used[name] = true;
      result.push(name);

      // add theme fallback list
      list.splice.apply(list, [i + 1, 0].concat(themes[name].fallback));
    }

    // special cases:
    // - theme itself must be the first in source list and not in fallback list
    // - base theme must be the last for both lists
    result.unshift(themeName);
    if (themeName != 'base')
      result.push('base');

    result.value = result.join('/');

    return result;
  }

  function getThemeSource(name, path){
    var sourceList = themes[name].sourcesList;

    for (var i = 0, map; map = sourceList[i]; i++)
      if (map.hasOwnProperty(path))
        return map[path];

    return '';
  }

  function themeHasEffect(themeName){
    return themes[currentThemeName].fallback.has(themeName);
  }

  function syncCurrentThemePath(path){
    getSourceByPath(path).set();
  }

  function syncCurrentTheme(changed){
    ;;;basis.dev.log('re-apply templates');

    for (var path in sourceByPath)
      syncCurrentThemePath(path);
  }

  function getTheme(name){
    if (!name)
      name = 'base';

    if (themes[name])
      return themes[name].theme;

    if (!/^([a-z0-9\_\-]+)$/.test(name))
      throw 'Bad name for theme - ' + name;

    var sources = {};
    var sourceList = [sources];
    var themeInterface = new Theme();

    themes[name] = {
      theme: themeInterface,
      sources: sources,
      sourcesList: sourceList,
      fallback: []
    };

    // closure methods

    var addSource = function(path, source){
      if (path in sources == false)
      {
        sources[path] = source;

        if (themeHasEffect(name))
          syncCurrentThemePath(path);
      }
      /** @cut */ else
      /** @cut */   basis.dev.warn('Template path `' + path + '` is already defined for theme `' + name + '` (definition ignored).');

      return getSourceByPath(path);
    };

    basis.object.extend(themeInterface, {
      name: name,
      fallback: function(value){
        if (themeInterface !== baseTheme && arguments.length > 0)
        {
          var newFallback = typeof value == 'string' ? value.split('/') : [];

          // process new fallback
          var changed = {};
          newFallback = extendFallback(name, newFallback);
          if (themes[name].fallback.source != newFallback.source)
          {
            themes[name].fallback.source = newFallback.source;
            ;;;basis.dev.log('fallback changed');
            for (var themeName in themes)
            {
              var curFallback = themes[themeName].fallback;
              var newFallback = extendFallback(themeName, (curFallback.source || '').split('/'));
              if (newFallback.value != curFallback.value)
              {
                changed[themeName] = true;
                themes[themeName].fallback = newFallback;

                var sourceList = themes[themeName].sourcesList;
                sourceList.length = newFallback.length;
                for (var i = 0; i < sourceList.length; i++)
                  sourceList[i] = themes[newFallback[i]].sources;
              }
            }
          }

          // re-compure fallback for dependant themes
          var currentFallback = themes[currentThemeName].fallback;
          for (var themeName in changed)
          {
            if (themeHasEffect(themeName))
            {
              syncCurrentTheme();
              break;
            }
          }
        }

        var result = themes[name].fallback.slice(1); // skip theme itself
        result.source = themes[name].fallback.source;
        return result;
      },
      define: function(what, wherewith){
        if (typeof what == 'function')
          what = what();

        if (typeof what == 'string')
        {
          if (typeof wherewith == 'object')
          {
            // define(namespace, dictionary): object
            // what -> path
            // wherewith -> dictionary

            var namespace = what;
            var dictionary = wherewith;
            var result = {};

            for (var key in dictionary)
              if (dictionary.hasOwnProperty(key))
                result[key] = addSource(namespace + '.' + key, dictionary[key]);

            return result;
          }
          else
          {
            if (arguments.length == 1)
            {
              // define(path): Template  === getTempalteByPath(path)

              return getSourceByPath(what);
            }
            else
            {
              // define(path, source): Template
              // what -> path
              // wherewith -> source

              return addSource(what, wherewith);
            }
          }
        }
        else
        {
          if (typeof what == 'object')
          {
            // define(dictionary): Theme
            var dictionary = what;

            for (var path in dictionary)
              if (dictionary.hasOwnProperty(path))
                addSource(path, dictionary[path]);

            return themeInterface;
          }
          else
          {
            ;;;basis.dev.warn('Wrong first argument for basis.template.Theme#define');
          }
        }
      },
      apply: function(){
        if (name != currentThemeName)
        {
          currentThemeName = name;
          syncCurrentTheme();

          for (var i = 0, handler; handler = themeChangeHandlers[i]; i++)
            handler.fn.call(handler.context, name);

          ;;;basis.dev.info('Template theme switched to `' + name + '`');
        }
        return themeInterface;
      },
      getSource: function(withFallback){
        return withFallback ? getThemeSource(name, path) : sources[path];
      },
      drop: function(path){
        if (sources.hasOwnProperty(path))
        {
          delete sources[path];
          if (themeHasEffect(name))
            syncCurrentThemePath(path);
        }
      }
    });

    themes[name].fallback = extendFallback(name, []);
    sourceList.push(themes['base'].sources);

    return themeInterface;
  }

  var themes = {};
  var sourceByPath = {};
  var baseTheme = getTheme();
  var currentThemeName = 'base';
  var themeChangeHandlers = [];

  function onThemeChange(fn, context, fire){
    themeChangeHandlers.push({
      fn: fn,
      context: context
    });

    if (fire)
      fn.call(context, currentThemeName);
  }


  //
  // cleanup on page unload
  //

  cleaner.add({
    destroy: function(){
      // clear themes
      for (var path in sourceByPath)
        sourceByPath[path].destroy();

      themes = null;
      sourceByPath = null;

      // clear templates
      for (var i = 0, template; template = templateList[i]; i++)
      {
        for (var key in template.instances_)
          template.instances_[key].destroy_();

        template.attaches_ = null;
        template.createInstance = null;
        template.getBinding = null;
        template.instances_ = null;
        template.resources = null;
        template.l10n_ = null;
        template.source = null;
      }

      templateList = null;
    }
  });


  //
  // export names
  //

  module.setWrapper(function(){
    ;;;basis.dev.warn('using basis.template as function is deprecated now, use basis.template.define instead');
    return baseTheme.define.apply(baseTheme, arguments);
  });

  module.exports = {
    DECLARATION_VERSION: DECLARATION_VERSION,
    // const
    TYPE_ELEMENT: TYPE_ELEMENT,
    TYPE_ATTRIBUTE: TYPE_ATTRIBUTE,
    TYPE_ATTRIBUTE_CLASS: TYPE_ATTRIBUTE_CLASS,
    TYPE_ATTRIBUTE_STYLE: TYPE_ATTRIBUTE_STYLE,
    TYPE_ATTRIBUTE_EVENT: TYPE_ATTRIBUTE_EVENT,
    TYPE_TEXT: TYPE_TEXT,
    TYPE_COMMENT: TYPE_COMMENT,

    TOKEN_TYPE: TOKEN_TYPE,
    TOKEN_BINDINGS: TOKEN_BINDINGS,
    TOKEN_REFS: TOKEN_REFS,

    ATTR_NAME: ATTR_NAME,
    ATTR_VALUE: ATTR_VALUE,
    ATTR_NAME_BY_TYPE: ATTR_NAME_BY_TYPE,

    ELEMENT_NAME: ELEMENT_NAME,
    ELEMENT_ATTRS: ELEMENT_ATTRS,
    ELEMENT_CHILDS: ELEMENT_CHILDS,

    TEXT_VALUE: TEXT_VALUE,
    COMMENT_VALUE: COMMENT_VALUE,

    // classes
    TemplateSwitchConfig: TemplateSwitchConfig,
    TemplateSwitcher: TemplateSwitcher,
    Template: Template,

    switcher: switcher,

    // for debug purposes
    tokenize: tokenize,
    getDeclFromSource: getDeclFromSource,
    makeDeclaration: makeDeclaration,

    // theme
    Theme: Theme,
    theme: getTheme,
    getThemeList: function(){
      return basis.object.keys(themes);
    },
    currentTheme: function(){
      return themes[currentThemeName].theme;
    },
    setTheme: function(name){
      return getTheme(name).apply();
    },
    onThemeChange: onThemeChange,

    define: baseTheme.define,

    get: getSourceByPath,
    getPathList: function(){
      return basis.object.keys(sourceByPath);
    }
  };