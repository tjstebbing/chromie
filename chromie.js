/* Chromie is (c) 2012 Pangur Pty Ltd 
 * Chromie is available for use under the MIT license
 */

chromie = {version : 0.1};

// Inspired by John Resig, base2 and Prototype
(function(){
  var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
  chromie.Type = function(){};
  chromie.Type.extend = function(prop) {
    var _super = this.prototype;
    initializing = true;
    var prototype = new this();
    initializing = false;
    for (var name in prop) {
      prototype[name] = name == "init" && typeof prop[name] == "function" && 
        typeof _super[name] == "function" ?
        (function(super_init, init){
          function callinit() {
            super_init.apply(this, arguments);
            init.apply(this, arguments);
          }
          return callinit;
        })(_super[name], prop[name]) :
        prop[name];
    }
    var marker = {};
    function Type(mark, args) {
      if ( !initializing ) {
        if ( this instanceof Type ) {
          if ( this.init )
            this.init.apply(this, mark===marker ? args : arguments);
        } else {
          return new Type(marker, arguments);
        }
      }
    }
    Type.prototype = prototype;
    Type.prototype.constructor = Type;
    Type.extend = arguments.callee;
    return Type;
  };
  chromie.Type = chromie.Type.extend({});
})();

chromie.Model = chromie.Type.extend({

    init : function(attrs /*extra options mapping*/) {
        var opts = arguments.lenth > 1 ? arguments[1] : {}; 
        if(opts.syncBackend) this.syncBackend = opts.syncBackend;
        this._watchers = {changed : []};
        //set initial attributes
        if(attrs) {
            for(k in attrs) {
                this[k] = attrs[k];
            }
        }
    },

    watch : function() {
        /* watch('changed', func) will be called on any change
         * watch(func) is a shortcut for watch('changed', func)
         * watch('foo', func) will be called if foo changes
         * all callbacks are called with two arguments, the model and changes 
         */
        if(arguments.length == 1) {
            this._watchers['changed'].push(arguments[0]);
        } else if( arguments.length == 2) {
            this._watchers[arguments[0]].push(arguments[1]);
        }
    },

    unwatch : function() {
        /* unwatch('changed', func) will be called on any change
         * unwatch(func) is a shortcut for watch('changed', func)
         * unwatch('foo', func) will be called if foo changes
         * all callbacks are called with two arguments, the model and changes 
         */
 
    },

  
    fire : function(key) {
        var q = this.watchers[key] || [];
        for(var i=0; i < q.length; i++) {
            setTimeout(q[i], 0, this, key);
        }
    },
 
    update : function(mapping /* optional options array */) {
         /* options array can contain:
          * silent : true   this will update without calling any watchers
          */
        var opts = arguments.lenth > 1 ? arguments[1] : { silent : false }; 
        if(arguments.length > 0) {
            var attrs = arguments[0];
            for(k in mapping) {
                this[k] = mapping[k];
            }
            if(this.syncBackend) {
                this.syncBackend.sync(changes);
            }
        }
        
    }   

});

