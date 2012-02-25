Model = Type.extend({

    init : function(/* initial attributes array */) {
        this.watchers = {'change' : []};
        this.attrs = {};
        //set default attributes
        for(var key in this) {
            if(this.hasOwnProperty(key) && typeof this[key] != 'function') {
                this.attrs[key] = this[key];
            }
        }
        //set initial attributes
        if(arguments.length > 0) {
            var attrs = arguments[0];
            for(k in attrs) {
                this.attrs[k] = attrs[k];
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
        this.watchers;  
    },

    unwatch : function() {

    },

    fire : function(key) {
        var q = this.watchers[key] || [];
        for(var i=0; i < q.length; i++) {
            setTimeout(q[i], 0, this);
        }
    },
 
    get : function(key) { return this.attrs[key]; },

    set : function(mapping /* optional options array */) {
         /* options array can contain:
          * silent : true   this will update without calling any watchers
          */
        var opts = arguments.lenth < 2 ? arguments[1] : { silent : false }; 
        if(arguments.length > 0) {
            var attrs = arguments[0];
            for(k in attrs) {
                this.attrs[k] = attrs[k];
            }
        }
        
    },   

});

Car = Model.extend({
    horn : 10,  //default values
    wheels : 2, //default values
    init : function() {
        console.log("init car");
    }

});

c = Car({horn:1});
console.log(c.get('horn'), "should be 1 not 10");


