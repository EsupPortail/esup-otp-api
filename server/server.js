var restify = require('restify');
var properties = require(process.cwd() + '/properties/properties');

var fs = require('fs');

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
var apiDb_controller;
var routes;

function initialize_userDB() {
    if (properties.esup.userDb) {
        userDb_controller = require(process.cwd() + '/controllers/user/' + properties.esup.userDb);
        userDb_controller.initialize(initialize_apiDb());
    } else console.log("Unknown userDb");
}

function initialize_apiDb() {
    if (properties.esup.apiDb) {
        apiDb_controller = require(process.cwd() + '/controllers/api/' + properties.esup.apiDb);
        apiDb_controller.initialize(initialize_routes(launch_server));
    } else console.log("Unknown apiDb");
}


function initialize_routes(callback) {
    routes = require(process.cwd() + '/server/routes');
    routes.initialize(server, userDb_controller, apiDb_controller, function(routed_server) {
        server = routed_server;
        if (typeof(callback) === "function") callback();
    })
}


function launch_server() {
    var port = properties.esup.port || 3000;
    server.listen(port, function(err) {
        if (err)
            console.error(err)
        else {
            console.log('App is ready at : ' + properties.esup.port || 3000);
        }
    });
}

exports.start = function() {
    initialize_userDB();
}
