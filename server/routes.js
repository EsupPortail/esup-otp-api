var restify = require('restify');
var properties = require(process.cwd() + '/properties/properties');
var validator = require(process.cwd() + '/services/validator');
var fs = require('fs');
var api = require(process.cwd() + '/controllers/api');

var server = restify.createServer({
    name: 'esup-otp',
    version: '0.0.1'
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

var userDb_controller = require(process.cwd() + '/controllers/' + properties.esup.userDb);
if (properties.esup.userDb) {
    userDb_controller.initialize();
} else console.log("Unkown userDb");

// var mysql = require(process.cwd() + '/controllers/mysql');
// mysql.initialize();
// server.get("/mysql/get_user/:uid", validator.get_available_transports, mysql.get_available_transports);

var connector_controller = require(process.cwd() + '/controllers/' + properties.esup.connector);
switch (properties.esup.connector) {
    case "mongoose":
        var connector = require(properties.esup.connector);
        connector.connect('mongodb://' + properties.esup.mongodb.address + '/' + properties.esup.mongodb.db, function(error) {
            if (error) {
                console.log(error);
            } else {
                connector_controller.initialize(connector, launch_server);
            }
        });
        break;
    default:
        console.log("Unkown connector");
        break;
}

server.get("/get_available_methods/", api.get_available_methods);
server.get("/get_available_transports/:uid", validator.get_available_transports, userDb_controller.get_available_transports);

// Google Authenticator
if (properties.esup.methods.google_authenticator) {
    server.get("/send_code/google_authenticator/mail/:uid", validator.send_code, connector_controller.send_google_authenticator_mail);
    server.get("/send_code/google_authenticator/sms/:uid", validator.send_code, connector_controller.send_google_authenticator_sms);
    server.get("/generate/google_authenticator/:uid", validator.generate_google_authenticator_secret, connector_controller.generate_google_authenticator_secret);
}

// Simple generator
if (properties.esup.methods.simple_generator) {
    server.get("/send_code/simple_generator/mail/:uid", validator.send_code, connector_controller.send_simple_generator_mail);
    server.get("/send_code/simple_generator/sms/:uid", validator.send_code, connector_controller.send_simple_generator_sms);
}

// Bypass
if (properties.esup.methods.bypass) {
    server.get("/generate/bypass/:uid", validator.generate_bypass_codes, connector_controller.generate_bypass_codes);
}

server.get("/verify_code/:uid/:otp", validator.verify_code, connector_controller.verify_code);

// routes DEV uniquement

server.get("/deactivate/:method/:uid", validator.toggle_method, connector_controller.deactivate_method);
server.get("/activate/:method/:uid", validator.toggle_method, connector_controller.activate_method);
server.get("/users/drop", connector_controller.drop);
// server.get("/user/:uid/google_authenticator", validator.get_google_authenticator_secret, connector_controller.get_google_authenticator_secret);

var launch_server = function() {
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
