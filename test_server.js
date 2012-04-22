connect = require("connect");
chromie = require("./lib");


fakeService = {
    "remote:foo" : function(socket, args) {
        console.log("remote client called the foo function");
        return "foo";
    }
};

myFactory = function(data, next) {
    avatar.addService("test", fakeService);
};

if(require.main == module) {
    app = connect();
    portal = chromie.Portal(app, myFactory);
    app.listen(8000);
}
