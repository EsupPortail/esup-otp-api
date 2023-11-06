import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import * as validator from '../services/validator.js';
import * as api_controller from '../controllers/api.js';
import * as userDb_controller from '../controllers/user.js';
import restify from 'restify';
import swaggerUi from 'swagger-ui-restify'
import openapiDocument from './openapi.js'

import { getInstance } from '../services/logger.js'; const logger = getInstance();

/**
 * @param { restify.Server } server
 * @param { Function } callback 
 */
export function initialize(server, version, callback) {
    logger.info(utils.getFileNameFromUrl(import.meta.url)+' '+'Initializing Routes');

    logger.info(utils.getFileNameFromUrl(import.meta.url)+' '+'Initializing "unprotected" routes');

    // goal: simply let esup-otp-cas get /js/socket.io.js from esup-otp-api (avoid use of cdn)
    const socketIoAbsoluteDistDirectory = utils.relativeToAbsolutePath(import.meta.url, '../node_modules/socket.io-client/dist/');
	server.get("/js/socket.io.js", restify.plugins.serveStatic({
		directory: socketIoAbsoluteDistDirectory,
		file: 'socket.io.min.js',
	}));
    
    openapiDocument.info.version = version;
    const swaggerUiBaseURL = 'api-docs';
    server.get("/openapi.json", (req, res, next) => res.json(openapiDocument));
    server.get("/" + swaggerUiBaseURL + "/*", ...swaggerUi.serve);
    server.get('/' + swaggerUiBaseURL, swaggerUi.setup(openapiDocument, { baseURL: swaggerUiBaseURL }));

    //app
    server.get("/users/:uid/methods/:method/:loginTicket/:hash", validator.check_hash, api_controller.check_accept_authentication);
    server.post("/users/:uid/methods/:method/:loginTicket/:tokenSecret", api_controller.accept_authentication);
    server.post("/users/:uid/methods/:method/transports/push/:lt/:hash", validator.check_hash, api_controller.send_message);
    server.post("/users/:uid/methods/:method/transports/push/:hash", validator.check_hash, api_controller.send_message);
    server.post("/users/:uid/methods/:method/activate/:activation_code/:gcm_id/:platform/:manufacturer/:model", api_controller.confirm_activate_method);
    server.post("/users/:uid/methods/:method/refresh/:tokenSecret/:gcm_id/:gcm_id_refreshed", api_controller.refresh_gcm_id_method);
    server.del("/users/:uid/methods/:method/:tokenSecret", api_controller.desync);

    //esup-nfc
    server.get("/esupnfc/locations", validator.esupnfc_check_server_ip, api_controller.esupnfc_locations);
    server.post("/esupnfc/isTagable", validator.esupnfc_check_server_ip, api_controller.esupnfc_check_accept_authentication);    
    server.post("/esupnfc/validateTag", validator.esupnfc_check_server_ip, api_controller.esupnfc_accept_authentication);    
    server.post("/esupnfc/display", validator.esupnfc_check_server_ip, api_controller.esupnfc_send_message);

    //user_hash
    server.get("/users/:uid/:hash", validator.check_hash, api_controller.get_user_infos);
    server.post("/users/:uid/methods/:method/transports/:transport/:hash", validator.check_hash, api_controller.send_message);

    logger.info(utils.getFileNameFromUrl(import.meta.url)+' '+'Initializing protected routes');
    //api_api_password
    server.get("/protected/methods", validator.check_api_password, api_controller.get_methods);
    server.get("/protected/users/:uid", validator.check_api_password, api_controller.get_user_infos);
    server.get("/protected/users/:uid/transports/:transport/test", validator.check_api_password, api_controller.transport_test);
    server.get("/protected/users/:uid/methods/:method/secret", validator.check_api_password, api_controller.get_method_secret);
    server.put("/protected/users/:uid/methods/:method/deactivate", validator.check_api_password, api_controller.deactivate_method);
    server.put("/protected/users/:uid/methods/:method/activate", validator.check_api_password, api_controller.activate_method);
    server.put("/protected/users/:uid/transports/:transport/:new_transport", validator.check_api_password, userDb_controller.update_transport);
    server.post("/protected/users/:uid/methods/:method/secret", validator.check_api_password, api_controller.generate_method_secret);
    server.post("/protected/users/:uid/:otp/:api_password?", validator.check_api_password, api_controller.verify_code);
    server.del("/protected/users/:uid/transports/:transport", validator.check_api_password, userDb_controller.delete_transport);

    logger.info(utils.getFileNameFromUrl(import.meta.url)+' '+'Initializing admin routes');
    // routes DEV/ADMIN uniquement
    //api_api_password
    server.get("/admin/users/:uid", validator.check_api_password, api_controller.get_user);
    server.get("/admin/users", validator.check_api_password, api_controller.get_uids);
    server.get("/admin/users/:uid/methods", validator.check_api_password, api_controller.get_activate_methods);
    server.put("/admin/methods/:method/transports/:transport/deactivate", validator.check_api_password, api_controller.deactivate_method_transport);
    server.put("/admin/methods/:method/transports/:transport/activate", validator.check_api_password, api_controller.activate_method_transport);
    server.put("/admin/methods/:method/deactivate", validator.check_api_password, api_controller.deactivate_method_admin);
    server.put("/admin/methods/:method/activate", validator.check_api_password, api_controller.activate_method_admin);
    server.del("/admin/users/:uid/methods/:method/secret", validator.check_api_password, api_controller.delete_method_secret);

    logger.info(utils.getFileNameFromUrl(import.meta.url)+' '+'Initializing test routes');
    //tests routes
    server.put("/test/auto_create/activate/", validator.check_api_password, (req, res, next) => {
        properties.setEsupProperty('auto_create_user', true);
        res.send({
            code: 'Ok'
        });
    });
    server.put("/test/auto_create/deactivate/", validator.check_api_password, (req, res, next) => {
        properties.setEsupProperty('auto_create_user', false);
        res.send({
            code: 'Ok'
        });
    });
    server.post("/test/users/:uid/", validator.check_api_password, (req, res, next) => {
        userDb_controller.create_user(req.params.uid, function () {
            api_controller.create_user(req.params.uid, function () {
                res.send({
                    code: 'Ok'
                });
            })
        })
    });
    server.del("/test/users/:uid/", validator.check_api_password, (req, res, next) => {
        userDb_controller.remove_user(req.params.uid, function () {
            api_controller.remove_user(req.params.uid, function () {
                res.send({
                    code: 'Ok'
                });
            })
        })
    });
    if (typeof(callback) === "function") callback(server);
    logger.info(utils.getFileNameFromUrl(import.meta.url)+' '+'Routes initialized');
}
