_ = require("underscore");
prx = require("chromie/lib/proxy");

var Avatar = chromie.Type.extend({

    init : function() {
        this.services = {};
    },

    connect : function(url, cb, observable) {
        var self = this;
        //optional observable will have connection status set on it
        self.observable = observable ? observable : {};
        self.observable.state = 'starting up';
        this.soc = io.connect(url);
       
        this.soc.on('$av.setService', _.bind(this.setService, this));
        this.soc.on('connect', function(data) {
            cb();
        });

        //XXX Not sure why these are not fired
        this.soc.on('connect',function(){ self.observable.state = "connected"; });
        this.soc.on('connecting',function(){ self.observable.state = "connecting"; });
        this.soc.on('close',function(){ self.observable.state = "closed"; });
        this.soc.on('disconnect',function(){ self.observable.state = "disconnected"; });
        this.soc.on('reconnect',function(){ self.observable.state = "reconnected"; });
        this.soc.on('reconnecting',function(){ self.observable.state = "reconnecting"; });
        this.soc.on('reconnect_failed',function(){ self.observable.state = "failed to reconnect"; });

    },

    disconnect : function() {
        if(this.soc) this.soc.disconnect();
    },

    setService : function(data) {
        console.log('setService', data);
        var self = this;
        _.each(data, function(v,k) {
            self.services[k] = v;
        });
    },

    get : function(serviceName) {
        /* Return a new ServiceProxy for a given service */
        if(!this.services[serviceName]) this.services[serviceName] = [];
        var proxy = prx.ServiceProxy(this);
        this.services[serviceName].push(proxy);
        return proxy;
    },

    updateWatchers : function() {

    }
});

module.exports = Avatar();
