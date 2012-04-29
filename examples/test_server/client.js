var $av = require('chromie/avatar');
window.$av = $av;

var avStatus = (function() { this.state = ko.observable("state"); })();

$av.connect('http://localhost:8000', function() {

    console.log("CONNECTED!", $av.state);
    ko.applyBindings($av.observable);

    //create a proxy to our echo service
    var echoProxy = $av.get("echoService");

    //send some data to its echo function
    echoProxy.send("echo", "Chromie was here!").then(function(data) {
        console.log("Data from the server:", data);
    });
}, avStatus);

