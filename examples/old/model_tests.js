//connect = require("connect");
//app = connect();
//sessions = new
//
//portal = chromie.Portal(app, new connect.MemoryStore());
//
//portal.credentialCheckers = [checkCookie, checkPassword];
//portal.avatarFactory = function(user, avatar) {
//    avatar.addService("forum", require("forumService").service);
//    avatar.addService("chat", require("chatService").service);
//
//    // if avatars worked like chromie models we culd have 'live' attributes at
//    // both ends like twisted PB RemoteReference..  
//    avatar.set({username : user.username, email : user.email});
//    avatar.watch('email', sendEmailConfirmation);
//};
//app.use(portal);
//
//

if(require.main == module) {
    chromie = require("./lib");

    queue = function(f) {
        setTimeout(f, 0);
    };

    Horse = chromie.Model.extend({
        name : 'nag',
          water : 10,
          food : 10,
          sex : 'male',
          shoes : 0
    });
    
    
    HorseView = chromie.View.extend({
    
        init : function() { console.log("new horse view watching "+
                   arguments[0].models.horse.name);},
             'horse:shoes' : function(horse, changes) {
                 console.log(horse.name+"'s shoes have changed to", changes.shoes);
             }
    
    });
    
    HerdView = chromie.View.extend({
    
        init : function(options) {
                   this.name = options.name || 'herd';
               },
    
             'herd:add' : function(herd, newHorses) {
                 if(!this.horseViews) this.horseViews = [];
                 for(var i=0; i < newHorses.length; i++) {
                     this.horseViews.push(HorseView({models:{horse:newHorses[i]}}));
                 }
                 var names = newHorses.map(function(h) { return h.name; });
                 if(names.length == 1) {
                     console.log(this.name, "A new horse, "+names[0]+" has joined the herd.");
                 } else {
                     var n1 = names.slice(0,-1).join(', ');
                     var names = n1+" and "+names.slice(-1)[0];
                     console.log(this.name, newHorses.length+" new horses, "+names+" have joined the herd.");
                 }
             }
    
    });
    
    /* TODO LIST
     *
     * templates to coordinate views {{view model }} {{ model.foo }} 
     *
     * view/model? track their watchers so they can destroy themselves and
     * remove themselves from collections etc?
     *
     * event order with deep chains is not right:
     *
     * watcher which calls other watchers which add events followed by 
     * chromie.queue which should fire the new events does not because 
     * of the setTimeout
     */
    
    Backend = chromie.Type.extend({ 
        sync : function(obj, changes) {
                   console.log("CHANGE", obj, changes);
               }
    });
    chromie.syncBackend = Backend();
    
    herd = chromie.Collection();
    
    mares = herd.filter(function(h) { return h.sex == 'female'; });
    herdview = HerdView({name:"HERD", models:{herd:herd}});
    mareview = HerdView({name:"MARES", models:{herd:mares}});
    
    h1 = Horse({name : 'Epona', shoes:4, sex : 'female'});
    h2 = Horse({name : 'Bella', shoes:4, sex : 'female'});
    h3 = Horse({name : 'Clara', shoes:0, sex : 'female'});
    herd.push(h1,h2,h3);
    h4 = Horse({name : 'Bruce', shoes:2});
    h5 = Horse({name : 'Bronwyn', shoes:4, sex : 'female'});
    
    queue(function(){h1.update({shoes:8});});
    // what are we missing here? neither option seems to do the useful thing.
    // perhaps this is why sproutcore has an event loop? 
    if(1) {
        queue(function(){herd.push(h4, h5);});
    } else {
        herd.push(h4, h5);;
    }
    queue(function(){herd.map(function(h, n){ h.update({shoes:n}); }); });
    
} 
