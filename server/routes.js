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
switch (properties.esup.userDb) {
    case "ldap":
        var LDAP = require('ldap-client');
        var ldap = new LDAP({
            uri: properties.esup.ldap.uri, // string
            base: properties.esup.ldap.baseDn, // default base for all future searches
            scope: LDAP.SUBTREE, // default scope for all future searches    
        }, function(err) {
            if (err) console.log(err);
            else { // bind
                ldap.bind({
                    binddn: properties.esup.ldap.adminDn,
                    password: properties.esup.ldap.password
                }, function(err) {
                    if (err) console.log(err);
                    else {
                        userDb_controller.initialize(ldap, function() {
                            console.log("ldap controller initialized");
                        });
                    }
                });
            }
        });
        break;
    default:
        console.log("Unkown userDb");
        break;
}

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

if(properties.esup.methods.google_authenticator){
    // Google Authenticator
    server.get("/send_code/google_authenticator/mail/:uid", validator.send_code, connector_controller.schemas.user.send_google_authenticator_mail);
    server.get("/send_code/google_authenticator/sms/:uid", validator.send_code, connector_controller.schemas.user.send_google_authenticator_sms);
    server.get("/regenerate_secret/google_authenticator/:uid", validator.regenerate_secret, connector_controller.schemas.user.regenerate_secret);
}

if(properties.esup.methods.simple_generator){
    // Simple generator
    server.get("/send_code/simple_generator/mail/:uid", validator.send_code, connector_controller.schemas.user.send_simple_generator_mail);
    server.get("/send_code/simple_generator/sms/:uid", validator.send_code, connector_controller.schemas.user.send_simple_generator_sms);
}

server.get("/verify_code/:uid/:otp", validator.verify_code, connector_controller.schemas.user.verify_code);

// routes DEV uniquement

server.get("/users/drop", connector_controller.schemas.user.drop);
// server.get("/user/:uid/google_authenticator", validator.get_google_authenticator_secret, connector_controller.schemas.user.get_google_authenticator_secret);

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