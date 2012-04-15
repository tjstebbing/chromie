/* Chromie is (c) 2012 Pangur Pty Ltd 
 * Chromie is available for use under the MIT license
 */

syncBackend = null;
chromie = {};
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
          if ( this.init ) {
            this.init.apply(this, mark===marker ? args : arguments);
            if ( this._afterInit ) this._afterInit();
          }
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

Type = chromie.Type;

Err = Type.extend({
    name : "Error",
    init : function(message) {
        this.message = message ? message : "An error occurred";
        this.prototype = new Error();
    }

});

Model = Type.extend({

    init : function(attrs /*extra options mapping*/) {
        var opts = arguments.lenth > 1 ? arguments[1] : {}; 
        if(opts.syncBackend) this.syncBackend = opts.syncBackend;
        this._watchers = {changed : []};
        //set initial attributes
        if(attrs) {
            for(var k in attrs) {
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
            var k = arguments[0];
            if(this._watchers[k] === undefined) this._watchers[k] = [];
            this._watchers[arguments[0]].push(arguments[1]);
        }
    },

    unwatch : function() {
        /* unwatch('foo', func) removes one instance of func from 'foo'
         * unwatch('foo') removes all watchers for 'foo'
         */
    },

  
    fire : function(key, updates) {
        //console.log("fire:", this, key, updates);
        var q = this._watchers[key] || [];
        for(var i=0; i < q.length; i++) {
            //setTimeout(q[i], 0, this, updates);
            this.seq = (this.seq||0)+1;
            (function(cb,model,seq){
                setTimeout(function(){
                    //console.log("event:", model, key, updates, seq);
                    cb(model, updates);
                }, 0);
            })(q[i], this, this.seq);
        }
    },
 
    update : function(/* optional options array */) {
         /* options array can contain:
          * silent : true   this will update without calling any watchers
          */
        var opts = arguments.lenth > 1 ? arguments[1] : { silent : false }; 
        if(arguments.length > 0) {
            var attrs = arguments[0];
            //discard any updates that result in no change
            var validatedAttrs = {};
            for(var k in attrs) {
                if(this[k] != attrs[k]) { //TODO deep eq check
                    validatedAttrs[k] = attrs[k];
                }
            }
            //call watchers
            var count = 0;
            for(var k in validatedAttrs) {
                count += 1;
                this.fire(k, validatedAttrs);
                this[k] = attrs[k];
            }
            if(count) this.fire('changed', validatedAttrs);
            
            if(this.syncBackend) {
                this.syncBackend.sync(this, validatedAttrs);
            } else if (syncBackend) {
                syncBackend.sync(this, validatedAttrs);
            }
        }
        
    }   

});

Collection = Model.extend({
    /* A collection is a model which contains other models and who's api
     * borrows many useful methods of an Array.
     *
     * Collections can be configured as a view (in the database sense) of
     * another collection by passing that collection and optionally a filter
     * function, ie:
     *
     * Collection({viewOf : srcCollection, viewFilter : func});
     *
     * As a convenience the filter method takes a filter function and optional
     * Collection sub type and returns a filtered collection:
     *
     * children = people.filter(function(person){return person.age<13;});
     *
     * children will now be a collection which stays up to date with people
     * and only contains persons under the age of 13.
     *
     * It is important to note that Collections which are viewing another 
     * collection in this way are immutable.
     */
    init : function(options) {
        this._items = [];
        this._options = options;
        if(this._options && this._options.viewOf) this.setupViewing();
    },

    setupViewing : function() {
        //This collection is a view of another collection, we need to watch
        //that collection for changes and update ourselves.
        var src = this._options.viewOf;
        src.watch('add', function(m, updates) {
            if(this._options.viewFilter) updates = updates.filter(this._options.viewFilter);
            if(updates.length > 0) this._push.apply(this, updates);
        }.bind(this));
        //TODO hookup splice, pop, etc.
    },

    mutablityCheck : function() {
        if(this._options && this._options.viewOf) throw "collection is immutable";   
    },

    _push : function(/*item1, item2, ...*/) {
        var newItems = [];
        for(var i=0; i < arguments.length; i++) {
            newItems.push(arguments[i]);
        }
        this._items = this._items.concat(newItems);
        this.fire('add', newItems);
        this.fire('changed', ['add', newItems]);
    },

    push : function(/*item1, item2, ...*/) {
        this.mutablityCheck();
        this._push.apply(this, arguments);
    },

    map : function(f) {
        //apply a function to each item in the container
        return this._items.map(f);
    },

    filter : function(f/*, Collection Type, defaults to this.prototype */) {
        //filter the container returning a new container who's contents 
        //will stay up to date with the contents of this container using
        //the supplied filter function.
        var cont = arguments.length==1 ? this.__proto__.constructor:arguments[1];
        return cont({ viewOf : this, viewFilter : f});
    },

    pop : function() { 
        this.mutablityCheck();
        this._pop.apply(this, arguments);
    },
    
    shift : function() { 
        this.mutablityCheck();
        this._shift.apply(this, arguments);
    },

    splice : function() { 
        this.mutablityCheck();
        this._splice.apply(this, arguments);
    },
    
});

View = Type.extend({

    init : function(options) {
        //set any models passed so we can connect handlers
        if(options && options.models) {
            for(var k in options.models) {
                this[k] = options.models[k];
            }
        }
    },

    _afterInit : function() {
        //connect any model:event handlers
        for(var k in this) {
            var bits = k.split(':');
            if(bits.length > 1) {
                try {
                    this[bits[0]].watch(bits[1], this[k].bind(this));
                } catch(e) {
                    console.log("err connecting", k);
                }
            }
        }
    },

});


exports.Type = Type;
exports.Model = Model;
exports.Collection = Collection;
exports.View = View;
exports.Err = Err;

