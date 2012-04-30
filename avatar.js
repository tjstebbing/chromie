_ = require("underscore");
prx = require("chromie/lib/proxy");

var Avatar = chromie.Type.extend({

    init : function() {
        this.services = {};
        this.queue = prx.SendQueue(this);
    },

    connect : function(url, cb, observable) {
        var self = this;
        //optional observable will have connection status set on it
        self.observable = observable ? observable : {};
        self.observable.state = 'starting up';
        this.socket = io.connect(url);
       
        this.socket.on('$av.setService', _.bind(this.setService, this));
        this.socket.on('connect', function(data) {
            self.queue.pump();
            cb();
        });

        //XXX Not sure why these are not always fired
        this.socket.on('connect',function(){ self.observable.state = "connected"; });
        this.socket.on('connecting',function(){ self.observable.state = "connecting"; });
        this.socket.on('close',function(){ self.observable.state = "closed"; });
        this.socket.on('disconnect',function(){ self.observable.state = "disconnected"; });
        this.socket.on('reconnect',function(){ self.observable.state = "reconnected"; });
        this.socket.on('reconnecting',function(){ self.observable.state = "reconnecting"; });
        this.socket.on('reconnect_failed',function(){ self.observable.state = "failed to reconnect"; });

    },

    disconnect : function() {
        if(this.socket) this.socket.disconnect();
    },

    setService : function(data) {
        console.log('setService', data);
        var self = this;
        _.each(data, function(v,k) {
            self.services[k] = v;
        });
    },

    get : function(serviceName) {
        /* Return a new Proxy for a given service */
        if(!this.services[serviceName]) this.services[serviceName] = [];
        var proxy = prx.Proxy(this, serviceName);
        this.services[serviceName].push(proxy);
        return proxy;
    },

    updateWatchers : function() {

    }
});

module.exports = Avatar();
