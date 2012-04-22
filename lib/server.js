_ = require("underscore");
detectSeries = require("async").detectSeries;

_.extend(this, require("./types"));

AuthenticationError = Err.extend({name:"AuthenticationError"});

Portal = Type.extend({

    init : function(app, sessionManagerInstance, avatarFactory) {
        this.sessionManager = sessionManagerInstance 
        this.credentialCheckers = credentialCheckers ? transport : [];
        this.avatarFactory = avatarFactory ? avatarFactory : null;
        this.io = require('socket.io').listen(app);
        this.io.sockets.on('connection', this.connect);
    },

    connect : function(socket) {
        socket.on('auth', 
    },

    login : function(request, credentials, next) {
        detectSeries(this.credentialCheckers, 
            function(check, cb) { check(request, credentials, cb); },
            function(authenticatedUser) { 
                this.avatarFactory(Avatar(authenticatedUser), next);
            }
    }

});


Avatar = Type.extend({

    init : function() {
        this.services = {};
    },

    addService : function(name, service) {
        /* service is either an array of functions to expose to the client, or 
         * an object with remote:foo functions
         */
        var funcs = service;
        if(typeof service == "object") { 
            var funcs = _.filter( _.keys(this),
                function(k){ return ~ k.search("remote:") ? 1 : 0 });
        } 
        this.services[name] = funcs;
    },

    callRemote : function(args) {

    }

});



if(require.main === module) {

    p = Portal();
    p.avatarFactory = function(u) { return u; };
    p.credentialCheckers = [
        function(request, cred) { 
            console.log("checking failing creds", cred);
            return false; 
        },
        function(request, cred) { 
            console.log("checking passing creds", cred);
            return {username: "pomke"} 
        } 
    ];
    try {
        var av = p.login({}, {username:"pomke", password:"password"});
        console.log("Authenticated!", av);
    } catch(e) {
        if(e instanceof AuthenticationError) {
            console.log("Failed to authenticate");
        } else {
            throw e;
        }

    }
    
}
