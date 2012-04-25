var avFactory = function(data, next) {
    //nothing interesting yet!
    next();
};

exports.settings = {
    debug : true,
    avatarFactory : avFactory,
    basePath : __dirname,
    staticDir : 'static',
    clientEntries : ['static/js/test.js']
};

