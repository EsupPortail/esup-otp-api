var properties = require(__dirname + '/../properties/properties');
var validator = require(__dirname + '/../services/validator');
var api_controller = require(__dirname + '/../controllers/api');
var userDb_controller = require(__dirname + '/../controllers/user');

exports.initialize = function (server, callback) {

    //user_hash
    server.get("/user/:uid/:hash", validator.get_user_infos, api_controller.get_user_infos);
    server.get("/user/:uid/method/:method/transport/:transport/code/send/:hash", validator.send_message, api_controller.send_message);

    //api_api_password
    server.get("/protected/method/:api_password", validator.get_methods, api_controller.get_methods);
    server.get("/protected/user/:uid/transport/:transport/test/:api_password", validator.transport_test, api_controller.transport_test);
    server.get("/protected/user/:uid/method/:method/secret/:api_password", validator.get_method_secret, api_controller.get_method_secret);
    server.put("/protected/user/:uid/method/:method/deactivate/:api_password", validator.toggle_method, api_controller.deactivate_method);
    server.put("/protected/user/:uid/method/:method/activate/:api_password", validator.toggle_method, api_controller.activate_method);
    server.put("/protected/user/:uid/transport/:transport/:new_transport/:api_password", validator.update_transport, userDb_controller.update_transport);
    server.post("/protected/user/:uid/method/:method/secret/:api_password", validator.generate_method_secret, api_controller.generate_method_secret);
    server.post("/protected/user/:uid/code/verify/:otp/:api_password", validator.verify_code, api_controller.verify_code);
    server.del("/protected/user/:uid/transport/:transport/:api_password", validator.delete_transport, userDb_controller.delete_transport);

    // routes DEV/ADMIN uniquement
    //api_api_password
    server.get("/protected/admin/user/:uid/:api_password", validator.get_user, api_controller.get_user);
    server.get("/protected/admin/user/:api_password", validator.get_uids, api_controller.get_uids);
    server.del("/protected/admin/user/:api_password", api_controller.drop); //dev
    server.get("/protected/admin/user/:uid/method/:api_password", validator.get_activate_methods_admin, api_controller.get_activate_methods);
    server.put("/protected/admin/method/:method/transport/:transport/deactivate/:api_password", validator.toggle_method_transport, api_controller.deactivate_method_transport);
    server.put("/protected/admin/method/:method/transport/:transport/activate/:api_password", validator.toggle_method_transport, api_controller.activate_method_transport);
    server.put("/protected/admin/method/:method/deactivate/:api_password", validator.toggle_method_admin, api_controller.deactivate_method_admin);
    server.put("/protected/admin/method/:method/activate/:api_password", validator.toggle_method_admin, api_controller.activate_method_admin);
    server.del("/protected/admin/user/:uid/method/:method/secret/:api_password", validator.delete_method_secret, api_controller.delete_method_secret);

    //tests routes
    server.put("/test/auto_create/activate/:api_password", function (req, res, next) {
        global.properties.esup.auto_create_user = true;
        res.send({
            code: 'Ok'
        });
    });
    server.put("/test/auto_create/deactivate/:api_password", function (req, res, next) {
        global.properties.esup.auto_create_user = false;
        res.send({
            code: 'Ok'
        });
    });
    server.post("/test/user/:uid/:api_password", function (req, res, next) {
        userDb_controller.create_user(req.params.uid, function () {
            api_controller.create_user(req.params.uid, function () {
                res.send({
                    code: 'Ok'
                });
            })
        })
    });
    server.del("/test/user/:uid/:api_password", function (req, res, next) {
        userDb_controller.remove_user(req.params.uid, function () {
            api_controller.remove_user(req.params.uid, function () {
                res.send({
                    code: 'Ok'
                });
            })
        })
    });
    if (typeof(callback) === "function") callback(server);
}