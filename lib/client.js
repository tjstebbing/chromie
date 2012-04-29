require("underscore");
require("./types");

var Promise = Type.extend({

    init : function(proxy, signal, args) {
        this.proxy = proxy;
        this.signal = signal;
        this.args = args;
        this.cbs = [];
        this.sent = false;
        this.canceled = false;
    },

    _dequeue : function() {
        var i = this.proxy.queue.indexOf(this);
        if(!!~i) delete this.proxy.queue[i];
    },

    _returning : function(data) {
        if(!this.canceled) {
            _.each(this.cbs, function(cb) { cb(data); });
        }
        this._dequeue();
    },

    then : function(cb) { this.cbs.push(cb); return this; },

    cancel : function(cb) {
        var queued = !~this.proxy.queue.indexOf(this);
        if(this.canceled || this.fired) {
            cb(0); // already canceled
        } else if(queued && !this.sent) {
            //TODO, check the queue and remove
            this._dequeue();
            this.canceled = true;
            cb(1); // canceled from the queue, never sent to server
        } else {
            this.canceled = true;
            cb(2); // canceled callbacks, however it was sent to the server
        }
    }
});

var ServiceProxy = Type.extend({

    init : function($av) {
        this.$av = $av;
        this.signals = {};
        this.queue = [];
        this.listening = true;
    },

    on : function(signal, cb) {
        if(!this.signals[signal]) {
            this.signals[signal] = [];
            this.$av.updateWatchers();
        }
        this.signals[signal].push(cb);
    },

    send : function(signal, args) {
        var p = Promise(this, signal, args);
        this.queue.push(p);
        return p;
    },

    close : function(next) {
        this.$av._deleteServiceProxy(this, next);
    },

    suspend : function(next) {
        this.listening = false;
        next();
    },

    resume : function(next) {
        this.listening = true;
        next();
    }

});

var Avatar = Type.extend({

    init : function() {

        this.services = {};
        this.soc = io.connect("http://localhost:8000");
        this.soc.on('connect', function(data) {
            console.log("Connected");
        });

    },

   get : function(serviceName) {
        /* Return a new ServiceProxy for a given service */
        if(!this.services[serviceName]) this.services[serviceName] = [];
        var proxy = ServiceProxy(this);
        this.services[serviceName].push(proxy);
        return proxy;
    },

    updateWatchers : function() {
        
    }
});

$av = Avatar();

exports.Avatar = Avatar;
