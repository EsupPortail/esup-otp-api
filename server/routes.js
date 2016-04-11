var properties = require(process.cwd() + '/properties/properties');
var validator = require(process.cwd() + '/services/validator');
var utils = require(process.cwd() + '/services/utils');

var server;

exports.initialize = function(server, userDb_controller, apiDB_controller, callback) {

    //user_hash
    server.get("/available_transports/:uid/:hash", validator.get_available_transports, userDb_controller.get_available_transports);
    server.get("/activate_methods/:uid/:hash", validator.get_activate_methods, apiDB_controller.get_activate_methods);
    server.get("/send_code/:method/:transport/:uid/:hash", validator.send_code, apiDB_controller.send_code);
    
    //api_api_password
    server.get("/methods/:api_password", validator.get_methods, utils.get_methods);
    server.get("/generate/:method/:uid/:api_password", validator.generate, apiDB_controller.generate);
    server.get("/secret/google_authenticator/:uid/:api_password", validator.get_google_authenticator_secret, apiDB_controller.get_google_authenticator_secret);
    server.put("/deactivate/:method/:uid/:api_password", validator.toggle_method, apiDB_controller.deactivate_method);
    server.put("/activate/:method/:uid/:api_password", validator.toggle_method, apiDB_controller.activate_method);
    server.put("/transport/:transport/:uid/:new_transport/:api_password", validator.update_transport, userDb_controller.update_transport);
    server.post("/verify_code/:uid/:otp/:api_password", validator.verify_code, apiDB_controller.verify_code);
    
    // routes DEV/ADMIN uniquement
    //api_api_password
    server.get("admin/user/:uid/:api_password", validator.get_user, apiDB_controller.get_user);
    server.get("admin/users/drop/:api_password", apiDB_controller.drop); //dev
    server.put("admin/deactivate/:method/:api_password", validator.toggle_method_admin, utils.deactivate_method_admin);
    server.put("admin/activate/:method/:api_password", validator.toggle_method_admin, utils.activate_method_admin);
    server.put("admin/deactivate/:method/:transport/:api_password", validator.toggle_method_transport, utils.deactivate_method_transport);
    server.put("admin/activate/:method/:transport/:api_password", validator.toggle_method_transport, utils.activate_method_transport);

    if (typeof(callback) === "function") callback(server);
}
