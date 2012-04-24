var path = require("path");
var connect = require("connect");
var sio = require('socket.io');
var browserify = require('browserify');
var _ = require("underscore");
require("./types");
require("./session");


InMemAvCacheDoNotUse = Type.extend({
    /* example of a simple in memory avatar cache, you'll want to write 
     * your own, it simply needs to be a callable that takes a key and 
     * a value, if called with a value then it sets, if called without
     * then it gets, if no key matches it returns a new Avatar.
     */
    init : function() {
        this.cache = {};
    },

    cache : function(userId, $av) {
        if(!$av && this.hasOwnProperty(userId)) return this.cache[userId];
        return Avatar();
    }
});

Options = Type.extend({

    init : function(opts) {
        this.opts = opts;
    },

    get : function(key, defaultValue) {
        return this.opts.hasOwnProperty(key) ? this.opts[key] : defaultValue
    }
});


Portal = Type.extend({

    init : function(app, opts) {
        var o = Options(opts);
        this.avatarFactory = o.get('avatarFactory', null);
        this.avatarCache = o.get('avatarCache', InMemAvCacheDoNotUse().cache);

        //setup socket.io
        app.use(connect.cookieParser());
        this.io= io = sio.listen(app);
        var log = io.log;
        this.io.configure(function() { 
            io.set('authorization', this.handshake); 
        });
        this.io.sockets.on('connection', function(socket) {
            socket.handshake.$av.connect(socket);
        });

        var basePath = o.get('basePath');
        if(!basePath) log.warn("You must provide a basePath to chromie");

        //setup static content
        var staticDir = path.join(basePath, o.get('staticDir'));
        if(staticDir) {
            log.info("Serving static files from: "+staticDir);
            app.use(connect.static(staticDir));
        }

        //setup browserify bundle
        var bOpts = o.get('browserify');
        if(bOpts) {
            if(o.get('debug')) bOpts.watch = true;
            if(bOpts.entry) {
                bOpts.entry = _.map(bOpts.entry, 
                    function(p) { return path.join(o.get('basePath'),p); });
            }
            app.use(browserify(bOpts));
            var s = "";
            _.each(bOpts.entry, function(e) { s+= "\n\t - "+e; });
            log.info("Client script served from "+bOpts.mount+" contains:"+s);
        }

        //setup extra debugging
        if(o.get('debug')) {
            log.warn("Debugging enabled");
            app.use(connect.errorHandler());
        }
        
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
        this.firstConnected = false;
    },

    connect : function(socket) {
        this.firstConnected = true;
        this.setRemoteServices();
    },

    _qRemote : function(funcName, args, next) {
        var self = this;
        var d = {name : funcName, args : args, next : next, 
            cancelled : false, recieved : false};

        function dequeue() {
            var pos = self.queue.indexOf(d);
            if (pos >= 0) self.queue.splice(pos, 1);
        }

        this.queue.push(function() {
            if(!d.cancelled) {
                socket.emit(d.name, d.args, function(response) {
                    dequeue();
                    if(!d.cancelled) d.next(response);
                });
            }
        });
        //return a canceller function
        return function() { 
            d.cancelled = true;
            dequeue();
        }
    },

    setRemoteServices : function() {
        var manifest = {};
        _.each(this.services, function(funcs, serviceName) {
            manifest[serviceName] = [];
            _.each(funcs, function(f, name){manifest[serviceName].push(name);});
        });
        return this.qRemote('$av:setService', manifest);
    },

    addService : function(name, service) {
         /*  an object with remote:foo functions
         */
        var funcs = _.filter( _.keys(this),
            function(k){ return ~ k.search("remote:") ? 1 : 0 });
        this.services[name] = funcs;
        if(this.firstConnected) this.setRemoteServices();
    }

});

exports.Portal = Portal;
exports.Avatar = Avatar;
