var properties = require(process.cwd() + '/properties/properties');
var validator = require(process.cwd() + '/services/validator');
var utils = require(process.cwd() + '/services/utils');

var server;

exports.initialize = function(server, userDb_controller, apiDB_controller, callback) {
    server.get("/get_methods/", utils.get_methods);

    server.get("/get_available_transports/:uid", validator.get_available_transports, userDb_controller.get_available_transports);

    //TO DO
    //gestion des droits, quand ce sera fait, à voir la disparition du paramètre uid
    server.get("/get_activate_methods/:uid", validator.get_activate_methods, apiDB_controller.get_activate_methods);
    server.get("/send_code/:method/:transport/:uid", validator.send_code, apiDB_controller.send_code);
    server.get("/deactivate/:method/:uid", validator.toggle_method, apiDB_controller.deactivate_method);
    server.get("/activate/:method/:uid", validator.toggle_method, apiDB_controller.activate_method);
    server.get("/generate/:method/:uid", validator.generate, apiDB_controller.generate);
    server.get("/verify_code/:uid/:otp", validator.verify_code, apiDB_controller.verify_code);
    server.get("/get_secret/google_authenticator/:uid", validator.get_google_authenticator_secret, apiDB_controller.get_google_authenticator_secret);

    // routes DEV/ADMIN uniquement
    server.get("admin/get_methods/", utils.get_methods_admin);
    server.get("admin/get_user/:uid", validator.get_user, apiDB_controller.get_user);
    server.get("admin/deactivate/:method", validator.toggle_method_admin, apiDB_controller.deactivate_method_admin);
    server.get("admin/activate/:method", validator.toggle_method_admin, apiDB_controller.activate_method_admin);
    server.get("admin/users/drop", apiDB_controller.drop);

    if (typeof(callback) === "function") callback(server);
}
