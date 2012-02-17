connect = require('connect');

var server = connect.createServer(
    connect.favicon(), 
    connect.logger(), 
    connect.static(__dirname + '/public')
);


//server.use('/js/myapp.min.js', ender.prod(['bean','qwery'], '/mystuff'));
//server.use('/js/', ender.dev(['bean','qwery'], '/mystuff'));


server.listen(8000);
