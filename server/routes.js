import * as fileUtils from '../services/fileUtils.js';
import * as validator from '../services/validator.js';
import * as api_controller from '../controllers/api.js';
import * as userDb_controller from '../controllers/user.js';
import * as properties from '../properties/properties.js';
import restify from 'restify';
import swaggerUi from 'swagger-ui-restify'
import openapiDocument from './openapi.js'

import { getInstance } from '../services/logger.js'; const logger = getInstance();


/**
 * @param { restify.Server } server
 */
export function initialize(server) {
    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' Initializing Routes');

    return Promise.all([
        initializeUnprotectedRoutes(server),
        initializeEsupAuthRoutes(server),
        initializeCasOtpClientRoutes(server),
        initializeWebAuthnRoutes(server),
        initializeNfcRoutes(server),
        initializeProtectedRoutes(server),
        initializeAdminRoutes(server),
    ]).then(() => {
        logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' Routes initialized');
    });
}

/**
 * @param { restify.Server } server
 */
function initializeUnprotectedRoutes(server) {
    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' Initializing "unprotected" routes');
    return Promise.all([
        initializeSocketIoRoute(server),
        initializeOpenapiRoutes(server)
    ]);
}

/**
 * @param { restify.Server } server
 */
async function initializeSocketIoRoute(server) {
    // goal: simply let esup-otp-cas get /js/socket.io.js from esup-otp-api (avoid use of cdn)
    const socketIoAbsoluteDistDirectory = fileUtils.relativeToAbsolutePath(import.meta.url, '../node_modules/socket.io-client/dist/');
    server.get("/js/socket.io.js", restify.plugins.serveStatic({
        directory: socketIoAbsoluteDistDirectory,
        file: 'socket.io.min.js',
    }));
    
    server.get("/js/socket.io.min.js.map", restify.plugins.serveStatic({
        directory: socketIoAbsoluteDistDirectory,
        file: 'socket.io.min.js.map',
    }));
}

/**
 * @param { restify.Server } server
 */
async function initializeOpenapiRoutes(server) {
    openapiDocument.info.version = properties.getProperty("package").version;
    const swaggerUiBaseURL = 'api-docs';
    server.get("/openapi.json", (req, res, next) => res.json(openapiDocument));
    server.get("/" + swaggerUiBaseURL + "/*", ...swaggerUi.serve);
    server.get('/' + swaggerUiBaseURL, swaggerUi.setup(openapiDocument, { baseURL: swaggerUiBaseURL }));
}

/**
 * @param { restify.Server } server
 */
async function initializeCasOtpClientRoutes(server) {
    server.get("/users/:uid/:hash", validator.check_hash, api_controller.get_user_infos);
    server.post("/users/:uid/methods/:method/transports/:transport/:hash", validator.check_hash, api_controller.send_message);
    // push
    server.post("/users/:uid/methods/:method/transports/push/:lt/:hash", validator.check_hash, api_controller.send_message);
    server.get("/users/:uid/methods/:method/:loginTicket/:hash", validator.check_hash, api_controller.check_accept_authentication);
    // WebAuthn
    server.post("/users/:uid/webauthn/login/:hash", validator.check_hash, api_controller.verify_webauthn_auth);
    server.post("/users/:uid/methods/webauthn/secret/:hash", validator.check_hash, api_controller.generate_webauthn_method_secret);
}

/**
 * @param { restify.Server } server
 */
async function initializeEsupAuthRoutes(server) {
    server.get("/users/:uid/methods/:method/:tokenSecret", api_controller.pending);
    server.post("/users/:uid/methods/:method/:loginTicket/:tokenSecret", api_controller.accept_authentication);
    server.post("/users/:uid/methods/:method/autoActivateTotp/:tokenSecret", api_controller.autoActivateTotp);
    server.post("/users/:uid/methods/push/activate/:activation_code/:gcm_id/:platform/:manufacturer/:model", api_controller.confirm_activate_push);
    server.post("/users/:uid/methods/:method/refresh/:tokenSecret/:gcm_id/:gcm_id_refreshed", api_controller.refresh_gcm_id_method);
    server.del("/users/:uid/methods/:method/:tokenSecret", api_controller.desync);

}

/**
 * @param { restify.Server } server
 */
async function initializeNfcRoutes(server) {
    server.get("/esupnfc/locations", validator.esupnfc_check_server_ip, api_controller.esupnfc_locations);
    server.post("/esupnfc/isTagable", validator.esupnfc_check_server_ip, api_controller.esupnfc_check_accept_authentication);
    server.post("/esupnfc/validateTag", validator.esupnfc_check_server_ip, api_controller.esupnfc_accept_authentication);
    server.post("/esupnfc/display", validator.esupnfc_check_server_ip, api_controller.esupnfc_send_message);
}

/**
 * @param { restify.Server } server
 */
async function initializeWebAuthnRoutes(server) {
    // MANAGER
    server.post("/protected/users/:uid/methods/:method/confirm_activate", validator.check_api_password, api_controller.confirm_activate_method);
    server.post("/protected/users/:uid/methods/:method/auth/:authenticator_id", validator.check_api_password, api_controller.change_method_special);
    server.del("/protected/users/:uid/methods/:method/auth/:authenticator_id", validator.check_api_password, api_controller.delete_method_special);
}

/**
 * routes used by manager or simple user in esup-otp-manager
 * @param { restify.Server } server
 */
async function initializeProtectedRoutes(server) {
    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' Initializing protected routes');
    //api_api_password
    server.get("/protected/methods", validator.check_api_password, api_controller.get_methods);
    server.get("/protected/users/:uid", validator.check_api_password, api_controller.get_user_infos);
    server.get("/protected/users/:uid/transports/:transport/test", validator.check_api_password, api_controller.transport_test);
    server.put("/protected/users/:uid/methods/:method/deactivate", validator.check_api_password, api_controller.deactivate_method);
    server.put("/protected/users/:uid/methods/:method/activate", validator.check_api_password, api_controller.activate_method);
    server.post("/protected/users/:uid/methods/:method/activate/:activation_code", validator.check_api_password, api_controller.confirm_activate_method);
    server.put("/protected/users/:uid/transports/:transport/:new_transport", validator.check_api_password, userDb_controller.update_transport);
    server.get("/protected/users/:uid/transports/:transport/:new_transport/test", validator.check_api_password, api_controller.new_transport_test);
    server.post("/protected/users/:uid/methods/:method/secret", validator.check_api_password, api_controller.generate_method_secret);
    server.post("/protected/users/:uid/:otp/:api_password?", validator.check_api_password, api_controller.verify_code);
    server.del("/protected/users/:uid/transports/:transport", validator.check_api_password, userDb_controller.delete_transport);
}

/**
 * @param { restify.Server } server
 */
async function initializeAdminRoutes(server) {
    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' Initializing admin routes');
    server.get("/admin/users/:uid", validator.check_api_password, api_controller.get_user);
    server.get("/admin/users", validator.check_api_password, api_controller.get_uids);
    server.get("/admin/users/:uid/methods", validator.check_api_password, api_controller.get_activate_methods);
    server.put("/admin/methods/:method/transports/:transport/deactivate", validator.check_api_password, api_controller.deactivate_method_transport);
    server.put("/admin/methods/:method/transports/:transport/activate", validator.check_api_password, api_controller.activate_method_transport);
    server.put("/admin/methods/:method/deactivate", validator.check_api_password, api_controller.deactivate_method_admin);
    server.put("/admin/methods/:method/activate", validator.check_api_password, api_controller.activate_method_admin);
    server.del("/admin/users/:uid/methods/:method/secret", validator.check_api_password, api_controller.delete_method_secret);
}
