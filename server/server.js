var restify = require('restify');
var winston = require('winston');
global.properties = require(__dirname + '/../properties/properties');
var fs = require('fs');

global.base_dir = __dirname.split('/')[__dirname.split('/').length-2];

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            timestamp: function() {
                return new Date(Date.now());
            },
            formatter: function(options) {
                // Return string will be passed to logger.
                return options.timestamp() +' '+ options.level.toUpperCase() +' '+__filename.split(global.base_dir)[1]+' '+ (undefined !== options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
            }
        }),
        new (winston.transports.File)({
            timestamp: function() {
                return ''+new Date(Date.now());
            },
            name: 'info-file',
            filename: __dirname+'/../logs/server.log',
            json: false,
            formatter: function(options) {
                // Return string will be passed to logger.
                return options.timestamp() +' '+ options.level.toUpperCase() +' '+__filename.split(global.base_dir)[1]+' '+ (undefined !== options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
            }
        }),
        new (winston.transports.File)({
            timestamp: function() {
                return ''+new Date(Date.now());
            },
            name: 'debug-file',
            level: 'debug',
            filename: __dirname+'/../logs/debug.log',
            json: false,
            formatter: function(options) {
                // Return string will be passed to logger.
                return options.timestamp() +' '+ options.level.toUpperCase() +' '+__filename.split(global.base_dir)[1]+' '+ (undefined !== options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
            }
        })
    ]
});

var server = restify.createServer({
    name: 'esup-otp',
    version: '0.0.1'
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

//CORS middleware
server.use(
  function crossOrigin(req,res,next){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    return next();
  }
);

var userDb_controller;
var routes;

function initialize_userDBController() {
    logger.info('Initializing the userDB controller');
    if (global.properties.esup.userDb) {
        userDb_controller = require(__dirname+ '/../controllers/user');
        userDb_controller.initialize(initialize_apiController);
    } else logger.error('Unknown userDb');
}

var api_controller;

function initialize_apiController() {
    logger.info('Initializing the api controller');
    if (global.properties.esup.apiDb) {
        api_controller = require(__dirname + '/../controllers/api');
        api_controller.initialize(initialize_routes(launch_server));
    } else logger.error('Unknown apiDb');
}

function initialize_routes(callback) {
    routes = require(__dirname + '/../server/routes');
    routes.initialize(server, function(routed_server) {
        server = routed_server;
        if (typeof(callback) === "function") callback();
    })
}


function launch_server() {
    var port = process.env.PORT || 3000;
    server.listen(port, function(err) {
        if (err)
            logger.error(err);
        else {
            logger.info('App is ready at : ' + port);
        }
    });
}

exports.start = function() {
    initialize_userDBController();
}