connect = require("connect");
require("underscore");
require("./types");
require("./session");


InMemAvCacheDoNotUse = type.extend({
    /* example of a simple in memory avatar cache, you'll want to write 
     * your own, it simply needs to be a callable that takes a key and 
     * a value, if called with a value then it sets, if called without
     * then it gets, if no key matches it returns a new Avatar.
     */
    init : function() {
        this.cache = {};
    };

    cache : function(userId, $av) {
        if(!$av && this.hasOwnProperty(userId)) return this.cache[userId];
        return Avatar();
    }
});

Portal = Type.extend({

    init : function(app, avatarFactory, avatarCache) {
        this.avatarFactory = avatarFactory ? avatarFactory : null;
        this.avatarCache = avatarCache ? avatarCache : InMemAvCacheDoNotUse().cache;
        app.use(connect.cookieParser());
        this.io = require('socket.io').listen(app);
        io.configure(function(){ io.set('authorization', this.handshake); });
        this.io.sockets.on('connection', function(socket) {
            socket.handshake.$av.connect(socket);
        });
    },

    handshake : function(data, next) {
        var cred = [-1]; 
        //check if the client has a crumpet to offer and if it is valid
        if (data.headers.cookie) {
            data.cookie = connect.utils.parseCookie(data.headers.cookie);
            data.crumpet = data.cookie['chromie.crumpet'];
            cred = validateCredentials(data.crumpet, data.address.address);
        }
        data.authenticated = ~cred[0] ? true : false;
        data.userId = data.authenticated ? cred[0] : '';
        data.$av = this.avatarCache(data.userId);
        this.avatarFactory(data, function(){ next(null, true) });
    }

});


Avatar = Type.extend({

    init : function() {
        this.services = {};
        this.queue = [];
    },

    connect : function(socket) {
        this.setRemoteServices();
    },

    _qRemote : function(funcName, args, next) {
        var d = {name : funcName, args : args, next : next, 
            cancelled : false, recieved : false};

        this.queue.push(function() {
            if(!d.cancelled) {
                socket.emit(d.name, args, function(response) {
                    this.queue.splice(this.queue.indexOf(d), 1);
                    if(!d.cancelled) d.next(response);
                }
        });
        //return a canceller function
        return function() { 
            d.cancelled = true;
            this.queue.splice(this.queue.indexOf(d), 1);
        }
    };

    setRemoteServices : function() {
        var manifest = {};
        _.each(this.services, function(funcs, serviceName) {
            manifest[serviceName] = [];
            _.each(funcs, function(f, name){manifest[serviceName].push(name);});
        }
        this.qRemote('$av:setService', manifest);
    },

    addService : function(name, service) {
         /*  an object with remote:foo functions
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
