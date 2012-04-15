_ = require("underscore");

_.extend(this, require("./types"));

AuthenticationError = Err.extend({name:"AuthenticationError"});

Portal = Type.extend({

    init : function(transport, credentialCheckers, avatarFactory) {
        this.transport = transport ? transport : "poll";
        this.credentialCheckers = credentialCheckers ? transport : [];
        this.avatarFactory = avatarFactory ? avatarFactory : null;
    },

    login : function(request, credentials) {
        authenticatedUser = _.find(_.map(this.credentialCheckers, 
                function(check){ return check(request, credentials);}),
            function(user) { return user ? user : false });
        if(authenticatedUser) return this.avatarFactory(Avatar(authenticatedUser));
        throw AuthenticationError();
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
