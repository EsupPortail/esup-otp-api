var properties = require(__dirname + '/../properties/properties');
var utils = require(__dirname + '/../services/utils');
var validator = require(__dirname + '/../services/validator');
var api_controller = require(__dirname + '/../controllers/api');
var userDb_controller = require(__dirname + '/../controllers/user');

var logger = require(__dirname + '/../services/logger').getInstance();

exports.initialize = function (server, callback) {
    logger.info(utils.getFileName(__filename)+' '+'Initializing Routes');

    logger.info(utils.getFileName(__filename)+' '+'Initializing "unprotected" routes');

    //app
    server.get("/users/:uid/methods/:method/:loginTicket/:hash", validator.check_hash, api_controller.check_accept_authentication);
    server.post("/users/:uid/methods/:method/:loginTicket/:tokenSecret", api_controller.accept_authentication);
    server.post("/users/:uid/methods/:method/transports/push/:lt/:hash", validator.check_hash, api_controller.send_message_push);
    server.post("/users/:uid/methods/:method/transports/push/:hash", validator.check_hash, api_controller.send_message_push);
    server.post("/users/:uid/methods/:method/activate/:activation_code/:gcm_id/:platform/:manufacturer/:model", api_controller.confirm_activate_method);
    server.del("/users/:uid/methods/:method/:tokenSecret", api_controller.desync);

    //esup-nfc
    server.get("/esupnfc/locations", validator.esupnfc_check_server_ip, api_controller.esupnfc_locations);
    server.post("/esupnfc/isTagable", validator.esupnfc_check_server_ip, api_controller.esupnfc_check_accept_authentication);    
    server.post("/esupnfc/validateTag", validator.esupnfc_check_server_ip, api_controller.esupnfc_accept_authentication);    
    server.post("/esupnfc/display", validator.esupnfc_check_server_ip, api_controller.esupnfc_send_message);

    //user_hash
    server.get("/users/:uid/:hash", validator.check_hash, api_controller.get_user_infos);
    server.post("/users/:uid/methods/:method/transports/:transport/:hash", validator.check_hash, api_controller.send_message);

    logger.info(utils.getFileName(__filename)+' '+'Initializing protected routes');
    //api_api_password
    server.get("/protected/methods/:api_password", validator.check_api_password, api_controller.get_methods);
    server.get("/protected/users/:uid/transports/:transport/test/:api_password", validator.check_api_password, api_controller.transport_test);
    server.get("/protected/users/:uid/methods/:method/secret/:api_password", validator.check_api_password, api_controller.get_method_secret);
    server.put("/protected/users/:uid/methods/:method/deactivate/:api_password", validator.check_api_password, api_controller.deactivate_method);
    server.put("/protected/users/:uid/methods/:method/activate/:api_password", validator.check_api_password, api_controller.activate_method);
    server.put("/protected/users/:uid/transports/:transport/:new_transport/:api_password", validator.check_api_password, userDb_controller.update_transport);
    server.post("/protected/users/:uid/methods/:method/secret/:api_password", validator.check_api_password, api_controller.generate_method_secret);
    server.post("/protected/users/:uid/:otp/:api_password", validator.check_api_password, api_controller.verify_code);
    server.del("/protected/users/:uid/transports/:transport/:api_password", validator.check_api_password, userDb_controller.delete_transport);

    logger.info(utils.getFileName(__filename)+' '+'Initializing admin routes');
    // routes DEV/ADMIN uniquement
    //api_api_password
    server.get("/admin/users/:uid/:api_password", validator.check_api_password, api_controller.get_user);
    server.get("/admin/users/:api_password",validator.check_api_password, api_controller.get_uids);
    server.del("/admin/users/:api_password", api_controller.drop); //dev
    server.get("/admin/users/:uid/methods/:api_password", validator.check_api_password, api_controller.get_activate_methods);
    server.put("/admin/methods/:method/transports/:transport/deactivate/:api_password", validator.check_api_password, api_controller.deactivate_method_transport);
    server.put("/admin/methods/:method/transports/:transport/activate/:api_password", validator.check_api_password, api_controller.activate_method_transport);
    server.put("/admin/methods/:method/deactivate/:api_password", validator.check_api_password, api_controller.deactivate_method_admin);
    server.put("/admin/methods/:method/activate/:api_password", validator.check_api_password, api_controller.activate_method_admin);
    server.del("/admin/users/:uid/methods/:method/secret/:api_password", validator.check_api_password, api_controller.delete_method_secret);

    logger.info(utils.getFileName(__filename)+' '+'Initializing test routes');
    //tests routes
    server.put("/test/auto_create/activate/:api_password", function (req, res, next) {
        properties.setEsupProperty('auto_create_user', true);
        res.send({
            code: 'Ok'
        });
    });
    server.put("/test/auto_create/deactivate/:api_password", function (req, res, next) {
        properties.setEsupProperty('auto_create_user', false);
        res.send({
            code: 'Ok'
        });
    });
    server.post("/test/users/:uid/:api_password", function (req, res, next) {
        userDb_controller.create_user(req.params.uid, function () {
            api_controller.create_user(req.params.uid, function () {
                res.send({
                    code: 'Ok'
                });
            })
        })
    });
    server.del("/test/users/:uid/:api_password", function (req, res, next) {
        userDb_controller.remove_user(req.params.uid, function () {
            api_controller.remove_user(req.params.uid, function () {
                res.send({
                    code: 'Ok'
                });
            })
        })
    });
    if (typeof(callback) === "function") callback(server);
    logger.info(utils.getFileName(__filename)+' '+'Routes initialized');
}
