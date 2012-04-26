require("chromie/lib/types");

var Avatar = Type.extend({
    init : function() {
        this.soc = io.connect("http://localhost:8000");
        this.soc.on('connect', function(data) {
            console.log("Connected");
        });
        this.soc.on('connect', function(data) {
            console.log("Connected again");
        });

        this.soc.on(function(data) {
            console.log("Setting services", data);
        });
    }
});

$av = Avatar();

exports.Avatar = Avatar;
