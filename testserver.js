connect = require("connect");
chromie = require("./lib");
test_server = require("./test_server");


app = connect();
portal = chromie.Portal(app, test_server.settings);
app.listen(8000);
