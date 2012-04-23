
![Chromie](https://github.com/pomke/chromie/raw/master/docs/chromie-logo-github.png)

## What is Chromie?

Chromie is an attempt to develop an easy to use, horazontally scalable backend 
for the kinds of applications you might build using [knockout.js](http://knockoutjs.com/)
or [Ember.js](https://github.com/emberjs/ember.js) (Although you can use it with
any client side javascript). 

Chromie is written for [Node.js](http://nodejs.org) and stands on the shoulders
of [connect](http://www.senchalabs.org/connect/) and [socket.io](http://socket.io).

## Concepts:

An Avatar is a collection of remote Services which can be invoked within the 
context of a given user's session. The Avatar is present at both ends of a 
connection between the client and the server and knows which services the user
has access to and acts as a broker between those services and the client.

Services are a collection of functions which are made available to a 
client according to application logic, permissions etc. Services are deployable 
together in a single process or spread across many processes transparently. 
Some good examples of services might be a forum, authentication and logging 
services.

Application logic dictates (via the Avatar) how a client should access services
as best suits the needs of the task at hand, you might have all of your services
running on a single server or spread out across different servers as apropriate.

Chromie also has the concept of Client Services, these are fundamentally the 
same as regular services however they exist in the client and provide an API 
that the server can call, 

### on the client:

Chromie is designed to work with any client side library you care to use, we're
particularly fond of knockout.js which allows you to update models of your data
on the client and have the UI update itself, check it out if you have not 
already.

todo 

### on the server:

todo

### example server:

```javascript
var app = require("connect")();
var chromie = require("chromie");

var portal = chromie.Portal(app, function(data) {
        data.$av.addService("authentication", authService);
        data.$av.addService("forum", forumService);
        data.$av.addService("core", myCoreService);
        });

app.listen(8000);
```

### example client:

```javascript

chromie.connect("http://example.com/service", function(data) {
        data.$av.addService("chatList", chatListModel);
        data.$av.addService("alterts", alertsModel);
        data.$av.authentication.login(credentials, function(){...});
    });
```

