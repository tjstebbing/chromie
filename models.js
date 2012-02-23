Model = Type.extend({

    attributes : {},

    init : function(/* initial attributes array */) {
        if(arguments.length > 0) {
            var attrs = arguments[0];
            for(k in attrs) {
                this[k] = attrs[k];
            }
        }
    },

    update : function(/* array of values to update, optional options array */) {
         if(arguments.length > 0) {
            var attrs = arguments[0];
            for(k in attrs) {
                this[k] = attrs[k];
            }
        }
        
    },

    change : function(/* callback or attributeName, callback */) {

    }

    

});


Car = Model.extend({
    horn : 10,
    wheels : 2
});

c = Car({horn:1});

