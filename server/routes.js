var properties = require(process.cwd() + '/properties/properties');
var validator = require(process.cwd() + '/services/validator');
var api_controller = require(process.cwd() + '/controllers/api');
var userDb_controller = require(process.cwd() + '/databases/user/' + properties.esup.userDb);
var server;

exports.initialize = function(server, callback) {

    //user_hash
    server.get("/available_transports/:uid/:hash", validator.get_available_transports, userDb_controller.get_available_transports);
    server.get("/activate_methods/:uid/:hash", validator.get_activate_methods, api_controller.get_activate_methods);
    server.get("/send_code/:method/:transport/:uid/:hash", validator.send_code, api_controller.send_code);
    
    //api_api_password
    server.get("/protected/method/:api_password", validator.get_methods, api_controller.get_methods);
    server.get("/protected/user/:uid/method/:method/secret/:api_password", validator.get_method_secret, api_controller.get_method_secret);
    server.put("/protected/user/:uid/method/:method/deactivate/:api_password", validator.toggle_method, api_controller.deactivate_method);
    server.put("/protected/user/:uid/method/:method/activate/:api_password", validator.toggle_method, api_controller.activate_method);
    server.put("/protected/user/:uid/transport/:transport/:new_transport/:api_password", validator.update_transport, userDb_controller.update_transport);
    server.post("/protected/user/:uid/method/:method/secret/:api_password", validator.generate_method_secret, api_controller.generate_method_secret);
    server.post("/protected/user/:uid/code/verify/:otp/:api_password", validator.verify_code, api_controller.verify_code);
    
    // routes DEV/ADMIN uniquement
    //api_api_password
    server.get("admin/user/:uid/:api_password", validator.get_user, api_controller.get_user);
    server.get("admin/users/drop/:api_password", api_controller.drop); //dev
    server.get("admin/activate_methods/:uid/:api_password", validator.get_activate_methods_admin, api_controller.get_activate_methods);
    server.put("admin/deactivate/:method/:api_password", validator.toggle_method_admin, api_controller.deactivate_method_admin);
    server.put("admin/activate/:method/:api_password", validator.toggle_method_admin, api_controller.activate_method_admin);
    server.put("admin/deactivate/:method/:transport/:api_password", validator.toggle_method_transport, api_controller.deactivate_method_transport);
    server.put("admin/activate/:method/:transport/:api_password", validator.toggle_method_transport, api_controller.activate_method_transport);
    server.del("admin/delete_method_secret/:method/:uid/:api_password", validator.delete_method_secret, api_controller.delete_method_secret);

    if (typeof(callback) === "function") callback(server);
}