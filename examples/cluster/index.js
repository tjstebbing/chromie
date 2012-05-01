/* Example chromie server deployment.
 */ 

var chromie = require("chromie");
var os = require("os");

var config = {

  /* This manifest identifies all the well-known nodes in the system.
   * These nodes have an IP address and Port listening with socket.io.
   * A well-known service will have a 'host' from this manifest.
   */
  nodes: {
    'eric': {internal:'127.0.0.1:8001', external:'0.0.0.0:8000'},
    'frodo': {internal:'127.0.0.1:8002'},
  },

  /* This manifest describes all the well-known services in the system.
   * Any module on any node can connect to a service by is unique name and
   * the host node will connect to the node that is hosting that service.
   */
  services: {

    /* The avatar service runs on eric and is exposed to the internet.
    // It requires the login service to create new sessions.
    avatar: {
      service:'chromie.AvatarService', host:'eric', publish:true,
      provides:[
        'chat'
      ]
    },
    */

    // The chat service runs on Eric.
    // It uses the 'session' service to identify a user.
    chat: {
      service:'./ChatService', host:'eric', auth:'session'
    },

    // The session service runs on every node since it uses redis.
    // It requires the login service to create new sessions.
    session: {
      service:'./RedisSession', host:'eric', login:'login'
    },

    // Our login service uses django for single-sign-on.
    login: {
      service:'./DjangoLogin', host:'eric',
      url:'http://newbalance.smallworldsocial.com/accounts/login/'
    }

  }

};

// Identify the node we're running,
// either the first command line argument or the hostname.
var nodeName = process.argv[2] || os.hostname();
chromie.serve(config, nodeName);
