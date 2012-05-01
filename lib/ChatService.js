/* The chat service.
 * 
 * The client must provide a userId, or the service must come pre-configured
 * with the user avatar... or the client joins the avatar to the chat, which
 * makes a great deal of sense really.
 *
 * Depends on:
 *   auth - the user must be pre-authenticated.
 *   avatar service - must provide displayName, can provide avatarImage.
 * 
 * So the first thing you'd do is request to join the chat, the chat service
 * would check sesskey:user and if it is defined then you are allowed to join,
 * it would respond with data containing a list of current users, perhaps the
 * last 20 lines of chat history.
 * Then you'd begin listening for chat events like joined, left, msg
 * you'd probably listen for those even before you request to join
 * they will only fire once the service starts.
 * when you wanted to send a message you'd send('msg', 'mymessage')
 * I was also thinking, join/leave/msg events should all have a timestamp
 * and the client resolves the order.
 * So when you send() a msg, your client can insert it into the UI immedately,
 * when the msg arrives for your sent message from the server, you'd remove
 * the one you added up front and let them reorder themselves.
 * 
 * If the service responded that you were unauthenticated (your avatar should
 * just know if you're authed or not) it could suspend the proxy
 * So yo're reconnecting, and its been 5 minutes, so the server still knows
 * about your avatar, .. then you're still authenticated
 * if you're reconnecting after a week, your avatar is gone.. the server 
 * would give you a new one.
 */

exports.init = function(service, config) {
  
  var auth = service.connect(config.auth || 'auth'); // get the auth service.

  var rooms = {
    lobby: {name:"The Lobby", users:[]}
  };

  // Enter a chat room.
  // user: the user id token.
  // client: an endpoint to receive room notifications.
  service.on('enter', function(data) {

    var user = data.user, client = data.client;

    // request to enter a room and provide an endpoint,
    //   pre-subscribe to events like auth-required, connected, message,
    //   pre-send events to it like chat commands.

    auth.send("verify", {user: data.user}, function(valid) {
      if (valid) {
      }
    });

    var room = rooms[data.room];
    if (!room) { reply("no such room"); return; }
    
  });

  service.on('msg', function(data) {
  });

};
