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
        console.log("fire:", this, key, updates);
        var q = this._watchers[key] || [];
        for(var i=0; i < q.length; i++) {
            //setTimeout(q[i], 0, this, updates);
            this.seq = (this.seq||0)+1;
            (function(cb,model,seq){
                setTimeout(function(){
                    console.log("event:", model, key, updates, seq);
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
                this.syncBackend.sync(this, changes);
            }
        }
        
    }   

});

chromie.Collection = chromie.Model.extend({

    init : function(options) {
        this.items = [];
    },

    push : function(/*item1, item2, ...*/) {
        var newItems = [];
        for(var i=0; i < arguments.length; i++) {
            newItems.push(arguments[i]);
        }
        this.items = this.items.concat(newItems);
        this.fire('add', newItems);
    },

    pop : function() { },
    shift : function() { },
    splice : function() { },
    
});

chromie.View = chromie.Type.extend({

    init : function(options) {
        //set any models passed so we can connect handlers
        if(options && options.models) {
            for(var k in options.models) {
                this[k] = options.models[k];
            }
        }
        //connect any model:event handlers
        for(var k in this) {
            var bits = k.split(':');
            if(bits.length > 1) {
                try {
                    this[bits[0]].watch(bits[1], this[k]);
                } catch(e) {
                    console.log("err connecting", k);
                }
            }
        }
    },

});


var debug = 1;

if(debug) {

    Horse = chromie.Model.extend({
        name : 'nag',
        water : 10,
        food : 10,
        shoes : 0
    });


    HorseView = chromie.View.extend({
        
        'horse:shoes' : function(horse, changes) {
            console.log(horse.name+"'s shoes have changed to", changes.shoes);
        }


    });

    HerdView = chromie.View.extend({
       
        'herd:add' : function(herd, newHorses) {
            if(!this.horseViews) this.horseViews = [];
            for(var i=0; i < newHorses.length; i++) {
                this.horseViews.push(HorseView({models:{horse:newHorses[i]}}));
            }
            var names = newHorses.map(function(h) { return h.name; });
            if(names.length == 1) {
                console.log("A new horse, "+names[0]+" has joined the herd.");
            } else {
                var n1 = names.slice(0,-1).join(', ');
                var names = n1+" and "+names.slice(-1)[0];
                console.log(newHorses.length+" new horses, "+names+", have joined the herd.");
            }
        }

    });


    herd = chromie.Collection();
    HerdView({models:{herd:herd}});
    h1 = Horse({name : 'Epona', shoes:4});
    h2 = Horse({name : 'Bella', shoes:4});
    h3 = Horse({name : 'Clara', shoes:0});
    herd.push(h1,h2,h3);
    h4 = Horse({name : 'Bruce', shoes:2});
    herd.push(h4);
    h1.update({shoes:8});

}

