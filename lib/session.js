var crypto = require('crypto');

var secret = "The quick spotted skunk jumps over the lazy dog.";
var delim = "::";
var oneHour = 3600000;

var pad = function(n) { var s=''+n; return s.length===1 ? '0'+s : s; }

var sec = function(now, offset) {
    if (offset) now = new Date(now.getTime() + offset * oneHour);
    return secret + now.getUTCFullYear() + pad(now.getUTCMonth()) + 
        pad(now.getUTCDate()) + pad(now.getUTCHours());
};

var hash = function(str, now, offset) {
    var hmac = crypto.createHmac('md5', sec(now, offset));
    return hmac.update(str).digest('hex');
};

var compare = function(str, h, now, offset) {
    return hash(str, now, offset) === h;
};

var newCredentials = function(userId, IPAddr) {
    /* returns a crumpet with encoded string or numeric userid with a TOTP
     * token we use to verify the session with a 1 hour granularity,
     * we also encode the client IP and check that as well on 
     * reconnect to prevent session hijacking.
     */
    userId = typeof(userId) === 'number' ? userId.toString(16) : "~"+userId;
    var token = userId + delim + IPAddr;
    return userId + delim + hash(token, new Date());
}

var validateCredentials = function(crumpet, IPAddr) {
    /* Takes a crumpet (usually stored in a cookie) and the IP address for 
     * the current request and returns an array of two values: 
     *
     * First is the encoded userId or -1 if the credentials have expired 
     * or IP has changed from the one the crumpet was issued to. 
     *
     * Second is a boolean 'isOld'; if true the crumpet is going stale and
     * the server needs to issue a fresh one, false and the crumpet is fine.
     */
    var bits = crumpet.split(delim);
    var userId = bits[0], frob = bits[1];
    var token = userId + delim + IPAddr;
    var now = new Date(); // must use the same time for both compares...
    if(compare(token, frob, now)) {
        return [userId.search('~') == 0 ? userId.slice(1) : parseInt(userId,16),
            false];
    } else if(compare(token, frob, now, -1)) {
        return [userId.search('~') == 0 ? userId.slice(1) : parseInt(userId,16),
            true];
    } else {
        return [-1, false]; 
    }
};

if(require.main == module) {
    // TESTING
    var strumpet = newCredentials('pomke', '127.0.0.1'); 
    var vstrumpet = validateCredentials(strumpet, '127.0.0.1');

    var numpet = newCredentials(123, '127.0.0.1');
    var vnumpet = validateCredentials(numpet, '127.0.0.1');
    var fnumpet = validateCredentials(numpet, '10.0.0.1');

    // make an old crumpet, almost one hour old.
    var soggy = '~pomke'+delim+hash('~pomke'+delim+'127.0.0.1', new Date(), -0.9);
    var vsoggy = validateCredentials(soggy, '127.0.0.1');

    // make a mouldy crumpet.
    var mumpet = '~pomke'+delim+hash('~pomke'+delim+'127.0.0.1', new Date(), -2.1);
    var vmumpet = validateCredentials(mumpet, '127.0.0.1');
  
    console.log('Example cookie value with string userId:\n'+strumpet);
    console.log('Example cookie value with numeric userId:\n'+numpet);
    console.log('Verifying string userId:\n'+vstrumpet); 
    console.log('Verifying numeric userId:\n'+vnumpet); 
    console.log('Verifying soggy crumpet:\n'+vsoggy); 
    console.log('Failing verification with stale crumpet:\n'+vmumpet); 
    console.log('Failing verification with bogus IP:\n'+fnumpet); 

};
