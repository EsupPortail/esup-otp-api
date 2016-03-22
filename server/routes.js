var restify = require('restify');
var properties = require(process.cwd() + '/properties/properties');
var validator = require(process.cwd() + '/services/validator');
var fs = require('fs');
var utils = require(process.cwd() + '/services/utils');

var server = restify.createServer({
    name: 'esup-otp',
    version: '0.0.1'
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

var userDb_controller;
if (properties.esup.userDb) {
    userDb_controller = require(process.cwd() + '/controllers/' + properties.esup.userDb);
    userDb_controller.initialize();
} else console.log("Unknown userDb");

// var mysql = require(process.cwd() + '/controllers/mysql');
// mysql.initialize();
// server.get("/mysql/get_user/:uid", validator.get_available_transports, mysql.get_available_transports);

var apiDB_controller;
if (properties.esup.apiDB) {
    apiDB_controller = require(process.cwd() + '/controllers/' + properties.esup.apiDB);
    apiDB_controller.initialize(launch_server);
}else console.log("Unknown apiDb");

server.get("/get_available_transports/:uid", validator.get_available_transports, userDb_controller.get_available_transports);

server.get("/get_activate_methods/:uid", validator.get_activate_methods, apiDB_controller.get_activate_methods);
server.get("/send_code/:method/:transport/:uid", validator.send_code, apiDB_controller.send_code);
server.get("/deactivate/:method/:uid", validator.toggle_method, apiDB_controller.deactivate_method);
server.get("/activate/:method/:uid", validator.toggle_method, apiDB_controller.activate_method);
server.get("/generate/:method/:uid", validator.generate, apiDB_controller.generate);
server.get("/verify_code/:uid/:otp", validator.verify_code, apiDB_controller.verify_code);


// routes DEV/ADMIN uniquement

server.get("/get_methods/", utils.get_methods);
server.get("/users/drop", apiDB_controller.drop);
// server.get("/user/:uid/google_authenticator", validator.get_google_authenticator_secret, apiDB_controller.get_google_authenticator_secret);

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

exports.server = server;