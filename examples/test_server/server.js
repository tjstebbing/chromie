#!/usr/bin/node
chromie = require("chromie");

//create a basic service that we can call from the client.
myService = {

    'remote:echo' : function(data, cb) {
        console.log("echoing: ", data);
        db(data);
    }

};

// settings to tell chromie where to find our app and what to serve.
var settings = {
    debug : true,
    avatarFactory : function(data, next) {
        data.$av.addService('echoService', myService);
        next();
    },
    basePath : __dirname,
    staticDir : 'static',
    clientEntries : ['client.js']
};

//Create a server using express and connect it to a Portal
express = require("express");
app = express.createServer();
portal = chromie.Portal(app, settings);
app.listen(8000);

