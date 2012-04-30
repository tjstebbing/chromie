require("underscore");
async = require("async");
require("./types");

var Promise = Type.extend({

    init : function(queue, signal, args) {
        this.queue = queue;
        this.signal = signal;
        this.args = args;
        this.cbs = [];
        this.sent = false;
        this.canceled = false;
        this._dequeue = function(){}; //set by the queue
    },

    _returning : function(data) {
        if(!this.canceled) {
            _.each(this.cbs, function(cb) { cb(data); });
        }
        this.dequeue();
    },

    then : function(cb) { this.cbs.push(cb); return this; },

    cancel : function(cb) {
        if(this.canceled || this.fired) {
            cb(0); // already canceled
        } else if(this.queue.isQueued(this) && !this.sent) {
            //TODO, check the queue and remove
            this.dequeue();
            this.canceled = true;
            cb(1); // canceled from the queue, never sent to server
        } else {
            this.canceled = true;
            cb(2); // canceled callbacks, however it was sent to the server
        }
    }
});


var SendQueue = Type.extend({

    /* This is a send queue for promises that uses the $av.socket to send
     * the message when the connection is up. */

    init : function($av) {
        this.$av = $av;
        this.q = [];
    },

    queue : function(signal, args) {
        var self = this, p = Promise(this, signal, args);
        this.q.push(p);
        //Add a dequeue function to remove once done
        p.dequeue = function() {
            var i = self.q.indexOf(p);
            if(!!~i) delete self.q[i];
        };
        return p;
    },

    isQueued : function(promise) {
        return !~this.q.indexOf(promise);
    },

    pump : function() {
        var self = this;
        async.nextTick(function() {
            //TODO check for connection
            _.each(this.q, function(promise) {
                promise.sent = true;
                $av.socket.emit(promise.signal, promise.args,
                    _.bind(promise._returning, promise)); 
            });
        });
    }

});


var Proxy = Type.extend({

    /* A proxy is a consumer of a service at the other end of a connection */

    init : function($av, serviceName) {
        this.$av = $av;
        this.serviceName = serviceName;
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
        return this.$av.queue.queue(this.serviceName+":"+signal, args);
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


exports.Promise = Promise;
exports.Proxy = Proxy;
exports.SendQueue = SendQueue;

