_ = require("underscore");
prx = require("chromie/lib/proxy");

var Avatar = chromie.Type.extend({

    init : function() {
        this.services = {};
    },

    connect : function(url, cb) {
        this.soc = io.connect("http://localhost:8000");
        this.soc.on('$av.setService', _.bind(this.setService, this));
        this.soc.on('connect', function(data) {
            cb();
        });

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
