NOINIT = {};  

/* Decorators for javascript:
 *
 * (function() { 
 *     //do something interesting to this
 *     return this;  //You should return a callable
 * }).$('decorated');  
 *     
 *
 * someFunc.$decorated();
 */
Function.prototype['$'] = function(name) {
    Function.prototype['$'+name] = this;
    return this;
}

/* a basic export helper: decorator for node's special 'exports' object, simply
 * call func.$public('name') to add it to the exports object
 */
public = function(publicName) {
    exports[publicName] = this; 
    return this;
}
public.$('public');


/* update an object with one or more other objects */
update = function (self, obj/*, ... */) {
    if (self === null || self === undefined) {
        self = {};
    }
    for (var i = 1; i < arguments.length; i++) {
        var o = arguments[i];
        if (typeof(o) != 'undefined' && o !== null) {
            for (var k in o) {
                self[k] = o[k];
            }
        }
    }
    return self;
}.$public('update');


/* get an array from an arguments list, using skip as the starting point */
arrayFromArgs = function(args, skip) {
    if(!skip) { skip = 0; }
    var a = [];
    for (var i = skip; i < args.length; i++) {
        a.push(args[i]);
    }
    return a;
}

bind = function(obj, func) {
    function boundMethod() { return func.apply(obj, arguments); }
    boundMethod.__wrapped__ = func;
    return boundMethod;
}.$public('bind');

bindAll = function(obj) {
    for (var k in obj) {
        var func = obj[k];
        if(typeof(func) == 'function') {
            obj[k] = bind(obj, func);
        }
    }
}.$public('bindAll');

flattenedMethods = function(cls) {
    if (cls.__flattened__) {
        return cls.__flattened__; // cached
    }
    var proto = {};
    for(var i=0; i < cls.__bases__.length; i++) {
        var base = cls.__bases__[i];
        if(typeof(base) == "string") {
            var baseObj = eval(base);
            if(typeof(baseObj) == "undefined") {
                console.log("base class not found: "+base);
            }
            base = baseObj;
            cls.__bases__[i] = base;
        } if(typeof(base) == "undefined") {
            console.log("base class not found (undefined)");
        } else if(typeof(base.__methods__) == "undefined") {
            console.log("broken base class (no methods attribute)");
        }
        update(proto, flattenedMethods(base));
    }
    var methods = cls.__methods__;
    for (var k in methods) {
        if (typeof(methods[k]) == 'function')
            methods[k].__name__ = k;
        proto[k] = methods[k];
    }
    cls.__flattened__ = proto;
    return cls.__flattened__;
}

/* implements this.super('funcname', ...) for instances */
_super = function(caller /*args*/) {
    while (caller.__wrapped__) caller = caller.__wrapped__; // un-bind/partial
    var f = _findSuper(this.__class__, caller, 0);
    if (typeof(f) != "undefined") {
        var args = arrayFromArgs(arguments, 1);
        f.apply(this, args);
    }
    else {
        //pomke.trace("super: no method found.");
    }
}
_super.__name__ = "_super"; 

_findSuper = function(cls, caller, found) {
    var f = cls.__methods__[caller.__name__];
    if (f) {
        if (found) return f;
        while (f.__wrapped__) f = f.__wrapped__; // un-bind/partial
        if (f == caller) {
            found = 1;
        }
    }
    var bases = cls.__bases__;
    for(var i=0; i<bases.length; i++) {
        f = _findSuper(bases[i], caller, found);
        if (f) return f;
    }
}

class = function() {
    var methods = arguments[arguments.length-1];
    var cls = function() {
        if (arguments[0] == NOINIT) return;
        if(this instanceof cls) {
            var self = this;
        } else {
            var self = new cls(NOINIT);
        }
        update(self, flattenedMethods(cls));
        self._super = _super; // super is a reserved word
        bindAll(self);
        self.__class__ = cls;
        if(typeof(self.__init__) == 'function') {
            self.__init__.apply(self, arguments);
        }
        return self;
    }
    var bases = [];
    for(var i=arguments.length-2; i>=0; i--) {
        bases.push(arguments[i]);
    }
    cls.__bases__ = bases;
    cls.__methods__ = methods;
    return cls;
}.$public('class')




