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

