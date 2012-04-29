#!/usr/bin/node
connect = require("connect");
chromie = require("./lib");
test_server = require("./test_server");


app = connect();
app.use(connect.errorHandler());
portal = chromie.Portal(app, test_server.settings);
app.listen(8000);
