/* Login service using Django backend.
 *
 * This service is a stub.
 */

exports.init = function(service, config) {

  service.on('login', function(data, reply) {
    // check credentials, return the django session key for SSO.
    reply({authenticated:true, sessionKey:'here-is-your-key'});
  });

};
