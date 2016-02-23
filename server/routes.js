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

var controller = require(process.cwd() + '/controllers/' + properties.esup.connector);
var connector = require(properties.esup.connector);

switch (properties.esup.connector) {
    case "mongoose":
        connector.connect('mongodb://' + properties.esup.mongodb.address + '/' + properties.esup.mongodb.db, function(error) {
            if (error) {
                console.log(error);
            } else {
                controller.initialize(connector, launch_server);
            }
        });
        break;
    default:
        console.log("Unkown connector");
        break;
}

server.post("/user", validator.create_user, controller.schemas.user.create);
server.get("/user/:uid", controller.schemas.user.get);
server.get("/users/drop", controller.schemas.user.drop);
server.put("/user/otp", validator.set_otp, controller.schemas.user.otp);
server.get("/user/:uid/otp/:otp", validator.verify, controller.schemas.user.verify);
server.get("/user/:uid/google_authenticator/:otp", validator.verify, controller.schemas.user.verify_google_authenticator);
server.get("/user/:uid/google_authenticator", validator.get_google_secret, controller.schemas.user.get_google_secret);

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
