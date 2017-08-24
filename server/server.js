var restify = require('restify');
var properties = require(__dirname + '/../properties/properties');
var utils = require(__dirname + '/../services/utils');
var fs = require('fs');
var sockets = require('./sockets');

global.base_dir = __dirname.split('/')[__dirname.split('/').length-2];

var logger = require(__dirname + '/../services/logger').getInstance();

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

server.use(
    function logRequestUrl(req,res,next){
        logger.debug(req.url);
        return next();
    }
);

var userDb_controller;
var routes;

function initialize_userDBController() {
    logger.info(utils.getFileName(__filename)+' '+'Initializing the userDB controller');
    if (properties.getEsupProperty('userDb')) {
        userDb_controller = require(__dirname+ '/../controllers/user');
        userDb_controller.initialize(initialize_apiController);
    } else logger.error('Unknown userDb');
}

var api_controller;

function initialize_apiController() {
    logger.info(utils.getFileName(__filename)+' '+'Initializing the api controller');
    if (properties.getEsupProperty('apiDb')) {
        api_controller = require(__dirname + '/../controllers/api');
        api_controller.initialize(initialize_routes(launch_server));
    } else logger.error(utils.getFileName(__filename)+' '+'Unknown apiDb');
}

function initialize_routes(callback) {
    routes = require(__dirname + '/../server/routes');
    routes.initialize(server, function(routed_server) {
        server = routed_server;
        if (typeof(callback) === "function") callback();
    })
}


function launch_server() {
    var port = properties.getEsupProperty('port') || process.env.PORT || 3000;
    server.listen(port, function(err) {
        if (err)
            logger.error(utils.getFileName(__filename)+' '+err);
        else {
            sockets.attach(server);
            logger.info(utils.getFileName(__filename)+' '+'App is ready at : ' + port);
        }
    });
}

exports.start = function() {
    initialize_userDBController();
}