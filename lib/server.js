/* Refactor Notes:
 *
 * Portal is gone, replace with AvatarServer and ServiceServer.
 *
 * AvatarServer is what the user connects to, it serves client code and
 * a socket.io connection. AvatarServers are configured with a list of
 * Services which can either be hosted locally or be a URL to a remote 
 * ServiceServer. Clients make requests and listen to events from these
 * Services.
 *
 * Services are created by a ServiceServer or an AvatarServer and are passed 
 * to am app-specific setup function  which configures the service to do
 * particular tasks.
 */ 

var path = require("path");
var connect = require("connect");
var express = require("express");
var sio = require('socket.io');
var browserify = require('browserify');
var _ = require("underscore");
require("./types");
require("./session");


/* An Avatar represents a specific user's connection to an AvatarServer and
 * restricts a users access to particular services available through the 
 * AvatarServer. 
 */

var Avatar = Type.extend({

    init : function() {
        this.services = {};
        this.queue = prx.SendQueue();
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

    makeService : function(name, serviceFactory, serviceURL) {
        var s = Service(name, this.queue);
        serviceFactory(s, function() { 
            self.services[name] = s; 
        });
    }

});


/* A Service is the engine of your application doing the heavy lifting 
 * logic for all clients. Your application should provide one or more 
 * services, usually one per feature such as a forum, chat service, auth etc.
 *
 * A Service is handed a queue for "send"ing signals out on and registers
 * signals using "on" which can be invoked by clients (avatar servers). 
 *
 * Services can be configured to run locally on an Avatar Server or run
 * as their own process and be connected to by one or more Avatar Servers.
 *
 * Services access and store session information using set and get, which 
 * take the client's session key. Session information is shared between all
 * services, this means if your Auth service were to set some 'permissions' 
 * your chat service could read those if it needed to and so on.
 */
var Service = Type.extend({

    init : function(serviceName, queue) {
        this.serviceName = serviceName;
        this.queue = queue; 
        this.signals = [];
    },

    on : function(signal, cb) {
        if(!this.signals[signal]) {
            this.signals[signal] = [];
        }
        this.signals[signal].push(cb);
    },

    send : function(signal, args) {
        return this.queue.queue(signal, args);
    }

});


/* AvatarServer is the front-end server which your clients connect to, it
 * is responsible for serving connections (via socket.io) to each client
 * as well as serving the application's static content. Usually you would 
 * have many AvatarServers configured to connect to several ServiceServers
 * which run Services to do the app-specific work, however for convenience 
 * AvatarServers can host Services locally which is great for development as
 * well as small deployments.
 *
 * arguments:
 * app is an http server application object (connect, express etc)
 * opts is an object and can contain the following keys:
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
 * services: object                     keys are names for a service, value
 *                                      is either a serviceFactory which 
 *                                      takes a Service object and configures
 *                                      it to run as a local service, or a
 *                                      URL to a configured ServiceServer
 *                                      to which this AvatarServer should
 *                                      rout signals.
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

var AvatarServer = function(app, opts) {

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


/* ServiceServers are used for hosting Services as standalone processes which
 * AvatarServers can connect to and proxy requests to from clients.
 */
var ServiceServer = Type.extend({
    //TODO
});


/* ServiceServerProxy is a shim used by an AvatarServer to transparently proxy
 * requests to a local Service as if it were being connected to remotely.
 * You should have no need to create one of these yourself as they are used 
 * internally.
 */

var ServiceServerProxy = Type.extend({
    // TODO
});


/* Misc */

var InMemAvCacheDoNotUse = Type.extend({
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

var Options = Type.extend({

    init : function(opts) {
        this.opts = opts;
    },

    get : function(key, defaultValue) {
        return this.opts.hasOwnProperty(key) ? this.opts[key] : defaultValue
    }
});

exports.AvatarServer = AvatarServer;
exports.ServiceServer = ServiceServer;
exports.Avatar = Avatar;
exports.Service = Service;
