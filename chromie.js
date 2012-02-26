/* Chromie is (c) 2012 Pangur Pty Ltd 
 * Chromie is available for use under the MIT license
 */

chromie = {version : 0.1};

// Inspired by John Resig, base2 and Prototype
(function(){
  var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
  this.Type = function(){};
  Type.extend = function(prop) {
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
  this.Type = Type.extend({});
})();

chromie.Type = Type;

chromie.Model = chromie.Type.extend({

    init : function(attrs /*extra options mapping*/) {
        var opts = arguments.lenth > 1 ? arguments[1] : {}; 
        if(opts.syncBackend) this.syncBackend = opts.syncBackend;
        this._watchers = {'change' : []};
        //set initial attributes
        if(attrs) {
            for(k in attrs) {
                this[k] = attrs[k];
            }
        }
    },

    watch : function(/* callback or attributeName, callback */) {
        /* watch(func) will be called on any change
         * watch('foo', func) will be called if foo changes
         * watch('foo bar', func) will be called if foo or bar change
         *
         * all callbacks are called with two arguments, the model and the event
         */
    },

    unwatch : function() {

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

Car = chromie.Model.extend({
    horn : 10,  //default values
    wheels : 2, //default values
    init : function() {
        console.log("init car");
    }

});

c = Car({horn:1});
console.log(c.horn, "should be 1 not 10");




