var restify = require('restify');
var winston = require('winston');
global.properties = require(__dirname + '/../properties/properties');
var fs = require('fs');

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({ filename: __dirname+'/../logs/server.log' })
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
    logger.info(new Date(Date.now())+' : Initialize the userDB controller');
    if (global.properties.esup.userDb) {
        userDb_controller = require(__dirname+ '/../controllers/user');
        userDb_controller.initialize(initialize_apiController);
    } else logger.error(new Date(Date.now())+' : Unknown userDb');
}

var api_controller;

function initialize_apiController() {
    logger.info(new Date(Date.now())+' : Initialize the api controller');
    if (global.properties.esup.apiDb) {
        api_controller = require(__dirname + '/../controllers/api');
        api_controller.initialize(initialize_routes(launch_server));
    } else logger.error(new Date(Date.now())+' : Unknown apiDb');
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
            logger.error(new Date(Date.now())+' : '+ err);
        else {
            logger.info(new Date(Date.now())+' : App is ready at : ' + port);
        }
    });
}

exports.start = function() {
    initialize_userDBController();
}