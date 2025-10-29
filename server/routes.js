import * as fileUtils from '../services/fileUtils.js';
import * as validator from '../services/validator.js';
import * as api_controller from '../controllers/api.js';
import * as esupnfc_controller from '../controllers/esupnfc.js';
import * as tenants_controller from '../controllers/tenants.js';
import * as userDb_controller from '../controllers/user.js';
import * as properties from '../properties/properties.js';
import restify from 'restify';
import swaggerUi from 'swagger-ui-restify'
import openapiDocument from './openapi.js'

import { logger } from '../services/logger.js';


/**
 * @param { restify.Server } server
 */
export function initialize(server) {
    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' Initializing Routes');

    return Promise.all([
        initializeUnprotectedRoutes(server),
        initializeEsupAuthRoutes(server),
        initializeCasOtpClientRoutes(server),
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
    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' Initializing unprotected routes');
    server.get('/public/*', restify.plugins.serveStaticFiles('./public', { 
        // force a specific cache-control max-age: do not rely on browser heuristic cache!
        maxage: 1/*hour*/ * 60*60*1000 
    }))
    return Promise.all([
        initializeSocketIoRoute(server),
        initializeOpenapiRoutes(server),
        initializeStatusRoute(server)
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
    server.get("/openapi.json", async (req, res) => res.json(openapiDocument));
    server.get("/" + swaggerUiBaseURL + "/*", ...swaggerUi.serve);
    server.get('/' + swaggerUiBaseURL, swaggerUi.setup(openapiDocument, { baseURL: swaggerUiBaseURL }));
}

/**
 * @param { restify.Server } server
 */
async function initializeStatusRoute(server) {
    server.get("/status", async (req, res) => {
        res.status(200);
        res.send({
           code: 'Ok',
       });
    });
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
    server.post("/users/:uid/methods/:method/:loginTicket/:tokenSecret/reject", api_controller.reject_authentication);
    server.post("/users/:uid/methods/:method/autoActivateTotp/:tokenSecret", api_controller.autoActivateWithPush);
    server.post("/users/:uid/methods/:method/autoActivateWithPush/:tokenSecret", api_controller.autoActivateWithPush);
    server.post("/users/:uid/methods/push/activate/:activation_code/:gcm_id/:platform/:manufacturer/:model", api_controller.confirm_activate_push);
    server.post("/users/:uid/methods/:method/refresh/:tokenSecret/:gcm_id/:gcm_id_refreshed", api_controller.refresh_gcm_id_method);
    server.del("/users/:uid/methods/:method/:tokenSecret", api_controller.desync);

}

/**
 * @param { restify.Server } server
 */
async function initializeNfcRoutes(server) {
    server.get("/esupnfc/locations", validator.esupnfc_check_server_ip, esupnfc_controller.esupnfc_locations);
    server.post("/esupnfc/isTagable", validator.esupnfc_check_server_ip, esupnfc_controller.esupnfc_check_accept_authentication);
    server.post("/esupnfc/validateTag", validator.esupnfc_check_server_ip, esupnfc_controller.esupnfc_accept_authentication);
    server.post("/esupnfc/display", validator.esupnfc_check_server_ip, esupnfc_controller.esupnfc_send_message);
    // unprotected route for esup-otp-cas, and esup-auth
    server.get("/esupnfc/infos", esupnfc_controller.getServerInfos);
}

/**
 * routes used by manager or simple user in esup-otp-manager
 * @param { restify.Server } server
 */
async function initializeProtectedRoutes(server) {
    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' Initializing protected routes');
    server.get("/protected/methods", validator.check_protected_access, api_controller.get_methods);
    server.get("/protected/users", validator.check_protected_access, userDb_controller.search_users);
    server.get("/protected/users/:uid", validator.check_protected_access, api_controller.get_user_infos);
    server.get("/protected/users/:uid/exists", validator.check_protected_access, userDb_controller.user_exists);
    server.get("/protected/users/:uid/transports/:transport/test", validator.check_protected_access, api_controller.transport_test);
    server.put("/protected/users/:uid/methods/:method/deactivate", validator.check_protected_access, api_controller.deactivate_method);
    server.put("/protected/users/:uid/methods/:method/activate", validator.check_protected_access, api_controller.activate_method);
    server.post("/protected/users/:uid/methods/:method/activate/:activation_code", validator.check_protected_access, api_controller.confirm_activate_method);
    server.put("/protected/users/:uid/transports/:transport/:new_transport", validator.check_protected_access, userDb_controller.update_transport);
    server.get("/protected/users/:uid/transports/:transport/:new_transport/test", validator.check_protected_access, api_controller.new_transport_test);
    server.post("/protected/users/:uid/methods/:method/secret", validator.check_protected_access, api_controller.generate_method_secret);
    server.del("/protected/users/:uid/methods/:method/secret", validator.check_protected_access, api_controller.delete_method_secret);
    server.post("/protected/users/:uid/:otp/:api_password?", validator.check_protected_access, api_controller.verify_code);
    server.del("/protected/users/:uid/transports/:transport", validator.check_protected_access, userDb_controller.delete_transport);
    server.put("/protected/users/:uid", validator.check_protected_access, userDb_controller.update_user);
    // WebAuthn routes
    server.post("/protected/users/:uid/methods/:method/confirm_activate", validator.check_protected_access, api_controller.confirm_activate_method);
    server.post("/protected/users/:uid/methods/:method/auth/:authenticator_id", validator.check_protected_access, api_controller.change_method_special);
    server.del("/protected/users/:uid/methods/:method/auth/:authenticator_id", validator.check_protected_access, api_controller.delete_method_special);
}

/**
 * @param { restify.Server } server
 */
async function initializeAdminRoutes(server) {
    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' Initializing admin routes');
    server.get("/admin/users", validator.check_admin_access, api_controller.get_uids);
    server.put("/admin/methods/:method/transports/:transport/deactivate", validator.check_admin_access, api_controller.deactivate_method_transport);
    server.put("/admin/methods/:method/transports/:transport/activate", validator.check_admin_access, api_controller.activate_method_transport);
    server.put("/admin/methods/:method/deactivate", validator.check_admin_access, api_controller.deactivate_method_admin);
    server.put("/admin/methods/:method/activate", validator.check_admin_access, api_controller.activate_method_admin);
    server.get("/admin/tenants", validator.check_admin_access, tenants_controller.get_tenants);
    server.get("/admin/tenants/:id", validator.check_admin_access, tenants_controller.get_tenant);
    server.post("/admin/tenants", validator.check_admin_access, tenants_controller.create_tenant);
    server.put("/admin/tenants/:id", validator.check_admin_access, tenants_controller.update_tenant);
    server.del("/admin/tenants/:id", validator.check_admin_access, tenants_controller.delete_tenant);
    server.get("/admin/stats", validator.check_admin_access, api_controller.stats);
}
