/* Service host nodes */

var http = require("http");
var sio = require('socket.io');

exports.serve = function(manifest, nodeName) {

  // Identify the node we're running.
  var nodeConf = manifest.nodes[nodeName];
  if (!nodeConf) {
    console.error("node name is not in the manifest:", nodeName);
    console.error("(pass a node name as the first command line argument)");
    return; // exit.
  }

  // Create Service objects for all services on this node before we
  // initialise any of the services themselves. That way we can init
  // the services in any order, and they can have circular dependencies.
  var services = {};
  for (var name in manifest.services) {
    var servConf = manifest.services[name];
    if (servConf.host === nodeName || servConf.host === '*') {
      services[name] = Service(name, servConf);
    }
  }

  // Start all the services that we created above.
  for (var name in services) {
    services[name].start();
  }

  // Service object to manage the service.
  // Services can be created and used before the underlying service has been
  // initialised, or in the case of remote services, before the remote service
  // is connected and ready.
  function Service(serviceName, config) {
    var methods = {}, queue = [], subscribers = {}, sockets = [];
    // receive a message from a client socket.
    function receive_from_remote() {
      console.log(arguments);
    }
    // internal api for the service implementation to use.
    var internal = {
      // register a method to handle incoming messages.
      on: function(name, handler) {
        if (name in methods) {
          // only allow one handler, because clients pass a callback
          // that we are expected to call when we've handled it.
          throw "more than one method handler for message: "+name;
        }
        methods[name] = handler;
        // attach receiver to all connected client sockets.
        for (var i=0, n=sockets.length; i<n; i++) {
          sockets[i].on(name, receive_from_remote);
        }
      },
      // connect to another service by well-known name or unique id.
      connect: function(name) {
        var svc = services[name];
        // give each client its own closable proxy.
        if (svc) return ServiceProxy(svc);
        throw "no such service: "+name;
      },
      // emit an event to all current subscribers.
      emit: function(name, data) {
        var subs = subscribers[name];
        if (subs) {
          for (var i=0, n=subs.length; i<n; i++) {
            subs[i](data, name);
          }
        }
      }
    };
    // api for service management.
    var api = {
      name: serviceName,
      exports: exports,
      start: function() {
        console.log(".. starting: "+serviceName);
        // load the service code.
        var module = require(config.service);
        // initialise the service instance.
        module.init(internal, config);
      },
      // subscribe a proxy to this service.
      subscribe: function(name, handler) {
        var subs = subscribers[name] || (subscribers[name]=[]);
        subs.push(handler);
      },
      // receive a message sent through a proxy.
      receive: function(name, data, callback) {
        // always queue messages to this service for later,
        // all sends are asynchronous, even local ones.
        queue.push({name:name, data:data, callback:callback});
      },
      // bind this service to a socket.io socket.
      bind: function(socket) {
        sockets.push(socket);
        // attach all receivers to this client socket.
        for (var name in methods) {
          socket.on(name, receive_from_remote);
        }
      },
      // deliver all pending messages to this service.
      pump: function() {
        var q = queue; queue = []; // read-reset the queue.
        for (var i=0, n=q.length; i<n; i++) {
          var msg = queue[i], name = msg.name, data = msg.data;
          var callback = msg.callback || function(){};
          // look up the method handler registered by this service.
          var handler = methods[name]
          if (handler) { handler(data, callback); }
          else {
            // fall back to the wildcard method handler.
            handler = methods['*'];
            if (handler) { handler(data, callback); }
            else {
              console.log("pump: "+serviceName+": no method handler for message: "+name);
              callback(); // invariant: callback is always called.
            }
          }
        }
      }
    };
    return api;
  }

  // Create a proxy that a service can use to access another service.
  function ServiceProxy(service) {
    var events = {};
    function dispatch(data, name) {
      // dispatch the event to all local handlers.
      var subs = events[name] || [];
      for (var i=0, n=subs.length; i<n; i++) {
        subs[i](data, name);
      }
    }
    var api = {
      // subscribe to an event from the service.
      on: function(name, handler) {
        var handlers = events[name];
        if (handlers && handlers.length) { handlers.push(handler); }
        else {
          events[name] = [handler];
          service.subscribe(name, dispatch);
        }
      },
      // send a message to the service.
      // optionally provide a callback for a reply (request-response)
      send: function(name, data, callback) {
        service.receive(name, data, callback);
      },
      // dispose of this proxy.
      close: function() {
        for (var name in events) {
          service.unsubscribe(name, dispatch);
        }
        events = {};
      }
    };
    return api;
  }
  
  // Start listening on ports.
  if (nodeConf.internal) {
    var server = http.createServer();
    var io = sio.listen(server);
    // expose all services internally.
    for (var name in services) {
      var service = services[name];
      service.bind(io.of(name));
    }
    // assume IP:Port format since you must give the private IP.
    var addr = nodeConf.internal.split(':');
    server.listen(+addr[1], addr[0]);
  }

  if (nodeConf.external) {
    var server = http.createServer();
    var io = sio.listen(server);
    // expose all published services externally.
    for (var name in services) {
      var service = services[name];
      if (service.publish) {
        service.bind(io.of(name));
      }
    }
    // assume IP:Port format since you must give the public IP.
    var addr = nodeConf.external.split(':');
    server.listen(+addr[1], addr[0]);
  }

};


/*
      suspend: function() {
        // our proxy can be paused as many times as we like,
        // but we will only pause the upstream service once.
        if (!paused && socket) socket.emit("meta:suspend");
        paused++;
      },
      resume: function() {
        // our proxy can be resumed as many times as we like,
        // but we will only resume the upstream service once.
        if (!--paused && socket) socket.emit("meta:resume");
        paused++;
      },

  // Create a service
  function createService(conf, instanceName) {
    // Load the service code.
    var module = require(conf.service);
    // Make an object we will keep to track the service.
    var service = {
      name: instanceName || (conf.service + '#' + (serviceUid++)),
      methods: {}
    };
    // Make an API for the service to do stuff.
    var api = {
      name: service.name,
    };
  }

  // Represents a remote service on a local node.
  // The channel is a 
  // Handles suspending when there are no active ServiceProxy.
  function RemoteService(name, channel) {
    var clients = 0, active = 0;
    var api = {
      createProxy: function() {
        if (!channel.isOpen) {
          channel.open();
        }
        clients++;
        active++;
        return ServiceProxy(api);
      },
      proxyClosed: function() {
        if (!--clients) {
          channel.close();
        }
      }
    };
    return api;
  }

*/
