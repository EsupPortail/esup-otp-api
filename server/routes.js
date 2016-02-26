var restify = require('restify');
var properties = require(process.cwd() + '/properties/properties');
var validator = require(process.cwd() + '/services/validator');

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
            uri: 'ldap://192.168.56.101', // string
            base: 'dc=univ-lr,dc=fr', // default base for all future searches
            scope: LDAP.SUBTREE, // default scope for all future searches    
        }, function(err) {
            if (err) console.log(err);
            else { // bind
                ldap.bind({
                    binddn: 'cn=admin,dc=univ-lr,dc=fr',
                    password: 'changeit'
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

server.get("/send_code/google_authenticator/mail/:uid", validator.send_code, connector_controller.schemas.user.send_google_authenticator_mail);
server.get("/send_code/google_authenticator/sms/:uid", validator.send_code, connector_controller.schemas.user.send_google_authenticator_sms);
server.get("/send_code/google_authenticator/app/:uid", validator.send_code, connector_controller.schemas.user.send_google_authenticator_app);

// server.get("/verify_code/simple_otp/:uid/:otp", validator.verify, controller.schemas.user.verify);
server.get("/verify_code/google_authenticator/:uid/:otp", validator.verify_code, connector_controller.schemas.user.verify_google_authenticator);

server.get("/regenerate_secret/google_authenticator/:uid", validator.regenerate_secret, connector_controller.schemas.user.regenerate_secret);

// routes DEV uniquement

// server.post("/user", validator.create_user, connector_controller.schemas.user.create);
// server.get("/user/:uid", connector_controller.schemas.user.get);
server.get("/users/drop", connector_controller.schemas.user.drop);
// server.put("/user/otp", validator.set_otp, connector_controller.schemas.user.otp);
// server.get("/user/:uid/google_authenticator", validator.get_google_secret, connector_controller.schemas.user.get_google_secret);

var launch_server = function() {
    var port = properties.esup.port || 3000;
    server.listen(port, function(err) {
        if (err)
            console.error(err)
        else {
            console.log('App is ready at : ' + port);
        }
    });
}


exports.server = server;
