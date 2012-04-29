var path = require("path");
var connect = require("connect");
var express = require("express");
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
        this._cache = {};
    },

    cache : function(userId, $av) {
        if(!$av && this.hasOwnProperty(userId)) return this._cache[userId];
        this._cache[userId] = Avatar();
        return this._cache[userId];
    }
});
var inMemAvCacheDoNotUse = InMemAvCacheDoNotUse();
inMemAvCacheDoNotUse = _.bind(inMemAvCacheDoNotUse.cache, inMemAvCacheDoNotUse);

Options = Type.extend({

    init : function(opts) {
        this.opts = opts;
    },

    get : function(key, defaultValue) {
        return this.opts.hasOwnProperty(key) ? this.opts[key] : defaultValue
    }
});


Portal = function(app, opts) {
    /* app is an application object,
     * opts can contain the following keys:
     * 
     * REQUIRED ATTRIBUTES
     * ===================
     * avatarFactory: function(data, next)  Accesses data.$av to set up 
     *                                      app specific services to be
     *                                      available to the client, this
     *                                      is a required attribute.
     * 
     * basePath: string path                base path for app,ie: __dirname
     *
     * OPTIONAL ATTRIBUTES
     * ===================
     *
     * debug: boolean                       defaults to false, makes things
     *                                      much more verbose.
     *
     * staticDir: string path               relative to basePath, the 
     *                                      content of the directory will
     *                                      be served using connect.static,
     *                                      in production this task should
     *                                      be handled by aws.s3 or NGINX
     *
     * clientPath: string relative url      URL to serve the client js
     *                                      bundle form, defaults to
     *                                      /chromie-bundle.js
     *
     * clientRequires: array node mods      An array of required modules 
     *                                      to be bundled with the client.
     *
     * clientEntries: array js file paths   And array of files to bundle 
     *                                      and execute on the client,
     *                                      relative to basePath.
     */
    var o = Options(opts);
    var debug = o.get('debug');
    app.use(express.cookieParser());
    if(debug) {
        app.use(express.logger('dev'));
        app.use(express.errorHandler());
    }

    var avatarFactory = o.get('avatarFactory', null);
    var avatarCache = o.get('avatarCache', inMemAvCacheDoNotUse);
    var handshake = function(data, next) {
        console.log("HANDSHAKING", data.address);
        var cred = [-1]; 
        //check if the client has a crumpet to offer and if it is valid
        if (data.headers.cookie) {
            data.cookie = connect.utils.parseCookie(data.headers.cookie);
            data.crumpet = data.cookie['chromie.crumpet'];
            //cred = validateCredentials(data.crumpet, data.address.address);
        }
        data.authenticated = ~cred[0] ? true : false;
        data.userId = data.authenticated ? cred[0] : '';
        data.$av = avatarCache(data.userId);
        avatarFactory(data, function(){ next(null, true) });
    }

    //setup socket.io
    var io = sio.listen(app);
    var log = io.log;
    if(debug) { 
        log.warn("Debugging enabled");
        io.configure(function() { 
            io.set('authorization', handshake); 
            io.set('transports', ['websocket', 'flashsocket', 'htmlfile', 
                'xhr-polling', 'jsonp-polling']);
        });
    } else {
        io.configure(function() { 
            io.set('authorization', handshake); 
            io.enable('browser client minification'); 
            io.enable('browser client etag');     
            io.enable('browser client gzip');    
            io.set('log level', 1);             
            io.set('transports', ['websocket', 'flashsocket', 'htmlfile', 
                'xhr-polling', 'jsonp-polling']);
        });
    }

    io.sockets.on('connection', function(socket) {
        socket.handshake.$av.connected(socket);
    });

    var basePath = path.normalize(o.get('basePath'));
    if(!basePath) log.warn("You must provide a basePath to chromie");

    //setup static content
    var staticDir = path.join(basePath, o.get('staticDir'));
    if(o.get('staticDir')) {
        log.info("Serving static files from: "+staticDir);
        app.use(express.static(staticDir));
    }

    //setup browserify client bundle
    bOpts = {};
    bOpts.mount = o.get('clientPath', '/chromie-bundle.js'),
        bOpts.entry = o.get('clientEntries', []);
    bOpts.require = o.get('clientRequires', []);
    if(debug) bOpts.debug = bOpts.watch = true; 
    //clientEntries are relative to basePath so join them together
    bOpts.entry = _.map(bOpts.entry, function(p){
        return path.join(o.get('basePath'),p); });
    //add in the chromie client code
    bOpts.entry.push(path.join(__dirname, '../avatar.js'));
    app.use(browserify(bOpts));

    //Log what we're bundling
    var bundled = "";
    _.each(bOpts.entry, function(e) { bundled+= "\n\t - "+e; });
    log.info("Client script "+bOpts.mount+" contains:"+ bundled);
};


Avatar = Type.extend({

    init : function() {
        this.services = {};
        this.queue = [];
        this.firstConnected = false;
    },

    connected : function(socket) {
        this.socket = socket;
        this.firstConnected = true;
        this.setRemoteServices();
    },

    _qRemote : function(funcName, args, next) {
        var self = this;
        //TODO replace with proxy.js stuff
        var d = {name : funcName, args : args, next : next, 
            cancelled : false, recieved : false};

        function dequeue() {
            delete self.queue[self.queue.indexOf(d)];
        }

        this.queue.push(function() {
            if(!d.cancelled) {
                self.socket.emit(d.name, d.args, function(response) {
                    dequeue();
                    if(!d.cancelled) d.next(response);
                });
            }
        });
        self.pushQueue();
        //return a canceller function
        return function() { 
            d.cancelled = true;
            dequeue();
        }
    },

    pushQueue : function() {
        //TODO handle not being connected
        for(var i=0; i<this.queue.length; i++) {
            console.log("pushing queue!", i, this.queue.length);
            this.queue[i]();
        }
    },

    setRemoteServices : function() {
        console.log("setting remote services");
        var manifest = {};
        _.each(this.services, function(funcs, serviceName) {
            manifest[serviceName] = [];
            _.each(funcs, function(f, name){manifest[serviceName].push(name);});
        });
        return this._qRemote('$av.setService', manifest);
    },

    addService : function(name, service) {
         /*  an object with remote:foo functions
         */
        var funcs = _.filter( _.keys(this),
            function(k){ return !!~k.search("remote:") ? 1 : 0 });
        this.services[name] = funcs;
        if(this.firstConnected) this.setRemoteServices();
    }

});

Service = Type.extend({

    init : function(name) {

    },

    'remote:foo' : function(data) {

    }
});

exports.Portal = Portal;
exports.Avatar = Avatar;
