/* Redis session service.
 *
 * This service runs on each node and connects to a shared redis session store.
 * 
 * When asked to validate a session id, it will get the user id from redis
 * for the session key given, and return that id?
 *
 * If there is no session, it creates one in redis and uses the named login
 * service to authenticate the credentials, which it must get from the client
 * somehow...
 */

exports.init = function(service, config) {
  
  var login = service.connect(config.login || 'login'); // get the login service.

  service.on('validate', function(data) {

    // do some redis stuff...
    
  });

};
