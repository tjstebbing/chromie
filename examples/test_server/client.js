var $av = require('chromie/avatar');

$av.connect('http://localhost:8000', function() {

    console.log("CONNECTED!");

    //create a proxy to our echo service
    var echoProxy = $av.get("echoService");

    //send some data to its echo function
    echoProxy.send("echo", "Chromie was here!").then(function(data) {
        console.log("Data from the server:", data);
    });
});

