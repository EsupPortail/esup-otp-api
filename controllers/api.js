import * as utils from '../services/utils.js';
import * as fileUtils from '../services/fileUtils.js';
import * as properties from '../properties/properties.js';
import * as controllerUtils from './controllerUtils.js';
import * as errors from '../services/errors.js';
import methods, { initialize as initializeMethods } from '../methods/methods.js';
import * as transports from '../transports/transports.js';

import { logger, auditLogger } from '../services/logger.js';
import * as userUtils from '../databases/user/userUtils.js';

/**
 * @type {import('../databases/api/mongodb.js')} apiDb
 */
export let apiDb;

export async function initialize(initializedApiDb) {
    await initializeMethods();

    if (initializedApiDb) {
        apiDb = initializedApiDb;
    } else {
        const apiDbName = properties.getEsupProperty('apiDb');
        if (apiDbName) {
            apiDb = await import('../databases/api/' + apiDbName + '.js')
            return apiDb.initialize();
        } else {
            throw new Error('Unknown apiDb');
        }
    }
}

export async function get_methods(req, res) {
    const response = {
        "code": "Error",
        "message": "No method found"
    };
    response.methods = {};
    for (const method in properties.getEsupProperty('methods')) {
        response.methods[method] = properties.getMethod(method);
        response.code = "Ok";
        response.message = "Method(s) found";
    }
    delete response.methods.push?.serviceAccount;
    res.status(response.code === "Ok" ? 200 : 404);
    res.send(response);
}

/**
 * Active la méthode req.params.method
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function activate_method_admin(req, res) {
    return set_Activate_method_admin(req, res, true);
}

/**
 * Désctive la méthode req.params.method
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function deactivate_method_admin(req, res) {
    return set_Activate_method_admin(req, res, false);
}

async function set_Activate_method_admin(req, res, newValue) {
    errorIfNoMethodProperties(req);

    const method = req.params.method;
    logger.info((newValue ? "activate" : "deactivate") + " method " + method);

    properties.setMethodProperty(method, 'activate', newValue);
    await apiDb.update_api_preferences();
    controllerUtils.sendResponseOK(res);
}

/**
 * Active le transport req.params.transport pour la  méthode req.params.method
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function activate_method_transport(req, res) {
    return activate_or_deactivate_method_transport(req, res, true);
}

/**
 * Désctive le transport req.params.transport pour la  méthode req.params.method
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function deactivate_method_transport(req, res) {
    return activate_or_deactivate_method_transport(req, res, false);
}

async function activate_or_deactivate_method_transport(req, res, isActivate) {
    errorIfNoMethodProperties(req);

    const method = req.params.method;
    const transport = req.params.transport;

    logger.info((isActivate ? "activate" : "deactivate") + " transport " + transport + " for method " + method);
    if (isActivate) {
        properties.addMethodTransport(method, transport);
    } else {
        properties.removeMethodTransport(method, transport);
    }
    await apiDb.update_api_preferences();
    controllerUtils.sendResponseOK(res);
}

/**
 * Crée l'utilisateur
 *
 */
export function create_user(uid) {
    return apiDb.create_user(uid);
}

/**
 * Sauve l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export function save_user(user) {
    return apiDb.save_user(user);
}

/**
 * Supprime l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export function remove_user(uid) {
    return apiDb.remove_user(uid);
}

/**
 * Envoie le code via le transport == req.params.transport
 * Retourne la réponse du service mail
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export function transport_code(code, req, res, user) {
    const { object, message } = getTransportObjectAndMessage(req.params.transport, code);

    const opts = {
        object: object,
        message: message,
        htmlTemplate: "random_code_mail",
        code: code,
        codeRequired: properties.getMethodProperty(req.params.method, 'codeRequired'),
        waitingFor: properties.getMethodProperty(req.params.method, 'waitingFor'),
    };

    return transport(opts, req, res, user);
}

function getTransportObjectAndMessage(transport, code) {
    let transportMessageProperty = properties.getMessage('transport', 'code')[transport];

    // default : mail message if not exaclty match
    if (!transportMessageProperty) {
        transportMessageProperty = properties.getMessage('transport', 'code').mail;
    }

    const message = transportMessageProperty.pre + code + transportMessageProperty.post;
    const object = properties.getMessage('transport', 'code').object;

    return { object: object, message: message };
}

/**
 * Envoie un message de confirmation sur le transport
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function transport_test(req, res) {
    const opts = {
        object: properties.getMessage('transport', 'test').object
    };

    let transportMessageProperty = properties.getMessage('transport', 'test')[req.params.transport];

    // default : mail message if not exaclty match
    if (!transportMessageProperty) {
        transportMessageProperty = properties.getMessage('transport', 'test').mail;
    }

    opts.message = transportMessageProperty.pre + req.params.uid + transportMessageProperty.post;

    const user = await apiDb.find_user(req, res);
    return transport(opts, req, res, user);
}

/**
 * génère un code et l'envoie au nouveau transport ET en réponse à la requête
 * (ne modifie pas l'utilisateur. Le manager devra appeler userDb_controller.update_transport pour cela)
 * (cette fonction permet au manager de valider un nouveau transport avant de l'enregistrer)
 */
export async function new_transport_test(req, res) {
    const code = utils.generate_digit_code(6);
    const opts = getTransportObjectAndMessage(req.params.transport, code);
    opts.code = code;
    opts.userTransport = req.params.new_transport;

    await transport(opts, req);

    res.send({
        code: 'Ok',
        otp: code
    });
}

/**
 * Envoie un message
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
function transport(opts, req, res, user) {
    const transport = transports.getTransport([req.params.transport]);
    if (transport) {
        return transport.send_message(req, opts, res, user);
    } else {
        throw new errors.UnvailableMethodTransportError();
    }
}

/**
 * Renvoie les infos (methodes activees, transports) de utilisateur avec l'uid == req.params.uid
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function get_user_infos(req, res) {
    const user = await apiDb.find_user(req, res);
    const transports = {
        sms: utils.cover_sms(userUtils.getSms(user.userDb)),
        mail: utils.cover_mail(userUtils.getMail(user.userDb)),
        push: user.push.device.manufacturer + ' ' + user.push.device.model,
    }

    res.status(200);
    res.send({
        code: "Ok",
        user: {
            methods: apiDb.parse_user(user),
            transports: transports,
            last_send_message: user.last_send_message,
            last_validated: user.last_validated,
        }
    });
}

/**
 * Envoie un code à l'utilisateur avec l'uid == req.params.uid et via la method == req.params.method
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function send_message(req, res) {
    errorIfNoMethodProperties(req);

    if (req.params.method == 'push') {
        logger.debug("send_message_push : " + req.params.method + " - " + properties.getMethod(req.params.method));
    }

    const { user, method } = await getUserAndMethodModule(req, { checkUserMethodActive: true, checkMethodPropertyActivate: true });

    user.last_send_message = { method: req.params.method, time: Date.now(), auto: "auto" in req.query };
    return method.send_message(user, req, res);
}

export async function accept_authentication(req, res) {
    errorIfNotPushMethod(req);
    const { user, method } = await getUserAndMethodModule(req, { checkUserMethodActive: true, checkMethodPropertyActivate: true });
    return method.accept_authentication(user, req, res);
}

export async function reject_authentication(req, res) {
    errorIfNotPushMethod(req);
    const { user, method } = await getUserAndMethodModule(req, { checkUserMethodActive: true, checkMethodPropertyActivate: true });
    return method.reject_authentication(user, req, res);
}

export async function pending(req, res) {
    errorIfNotPushMethod(req);
    const { user, method } = await getUserAndMethodModule(req, { checkMethodPropertyPending: true });
    return method.pending(user, req, res);
}

export async function check_accept_authentication(req, res) {
    errorIfNotPushMethod(req);
    const { user, method } = await getUserAndMethodModule(req, { checkUserMethodActive: true, checkMethodPropertyActivate: true });
    return method.check_accept_authentication(user, req, res);
}

/**
 * Vérifie si le code fourni correspond à celui stocké en base de données
 * si oui: on retourne un réponse positive et on supprime l'otp de la base de donnée
 * sinon: on renvoie une erreur 401 InvalidCredentialsError
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function verify_code(req, res) {
    const user = await apiDb.find_user(req, res);
    if (user.last_send_message) user.last_send_message.verified = true;

    logger.debug("verify_code: " + user.uid);

    for (const method in methods) {
        if (user[method].active && properties.getMethodProperty(method, 'activate')) {
            logger.debug(method + " verify_code: " + user.uid);

            if (await methods[method].verify_code(user, req)) {
                logger.info(method + " Valid credentials by " + user.uid);

                res.send({
                    "code": "Ok",
                    "method": method,
                    "message": properties.getMessage('success', 'valid_credentials')
                });

                user.last_validated = {
                    method: method,
                    time: Date.now(),
                }
                await apiDb.save_user(user);

                return;
            }
        }
    }

    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' Invalid credentials submit for user with uid : ' + user.uid);
    throw new errors.InvalidCredentialsError();
}

/**
 * Génére un nouvel attribut d'auth (secret key ou matrice ou bypass codes)
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function generate_method_secret(req, res) {
    const { user, method } = await getUserAndMethodModule(req, { checkMethodPropertiesExists: true, checkMethodPropertyActivate: true });
    return method.generate_method_secret(user, req, res);
}

export async function change_method_special(req, res) {
    const { user, method } = await getUserAndMethodModule(req, { checkMethodPropertiesExists: true });
    return method.change_method_special(user, req, res);
}

export async function delete_method_special(req, res) {
    const { user, method } = await getUserAndMethodModule(req, { checkMethodPropertiesExists: true });
    return method.delete_method_special(user, req, res);
}

/**
 * Supprime l'attribut d'auth (secret key ou matrice ou bypass codes)
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function delete_method_secret(req, res) {
    const { user, method } = await getUserAndMethodModule(req, { checkMethodPropertiesExists: true });
    return method.delete_method_secret(user, req, res);
}

export async function generate_webauthn_method_secret(req, res) {
    req.params.method = "webauthn";
    return generate_method_secret(req, res);
}

export async function verify_webauthn_auth(req, res) {
    req.params.method = "webauthn";
    const { user, method } = await getUserAndMethodModule(req);
    return method.verify_webauthn_auth(user, req, res);
}

/**
 * Active la méthode l'utilisateur ayant l'uid req.params.uid
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function activate_method(req, res) {
    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' ' + req.params.uid + " activate_method " + req.params.method);
    if (req.params.method !== 'push') {
        auditLogger.info({
            message: [
                {
                    req,
                    action: 'activate_method',
                    method: req.params.method
                }
            ]
        });
    }
    const { user, method } = await getUserAndMethodModule(req, { checkMethodPropertiesExists: true, checkMethodPropertyActivate: true });
    return method.user_activate(user, req, res);
}

export async function confirm_activate_push(req, res) {
    req.params.method = 'push';
    return confirm_activate_method(req, res);
}

/**
 * Certaine méthode (push) nécessite une activation en deux étapes
 * Confirme l'activation de la méthode l'utilisateur ayant l'uid req.params.uid
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function confirm_activate_method(req, res) {
    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' ' + req.params.uid + " confirm_activate_method " + req.params.method);
    if (req.params.method === 'push') {
        auditLogger.info({
            message: [
                {
                    req,
                    action: 'activate_method',
                    method: req.params.method,
                    Phone: `${req.params.platform} ${req.params.manufacturer} ${req.params.model}`,
                }
            ]
        });
    }
    const { user, method } = await getUserAndMethodModule(req, { checkMethodPropertiesExists: true, checkMethodPropertyActivate: true });
    return method.confirm_user_activate(user, req, res);
}

export async function autoActivateWithPush(req, res) {
    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' ' + req.params.uid + " autoActivateWithPush " + req.params.method);
    const { user, method } = await getUserAndMethodModule(req);
    methods.push.checkTokenSecret("autoActivateWithPush", user, req, res)
    return method.autoActivateWithPush(user, req, res);
}

export async function refresh_gcm_id_method(req, res) {
    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' ' + req.params.uid + " refresh_push " + req.params.method);
    const { user, method } = await getUserAndMethodModule(req);
    return method.refresh_user_gcm_id(user, req, res);
}

/**
 * Désactive la méthode l'utilisateur ayant l'uid req.params.uid
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function deactivate_method(req, res) {
    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' ' + req.params.uid + " deactivate_method " + req.params.method);
    auditLogger.info({
        message: [
            {
                req,
                action: 'deactivate_method',
                method: req.params.method
            }
        ]
    });
    const { user, method } = await getUserAndMethodModule(req);
    return method.user_deactivate(user, req, res);
}

/**
 * Certaine méthode (push) peuvent être désactiver sans passer par le manager
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function desync(req, res) {
    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' ' + req.params.uid + " desync " + req.params.method);
    auditLogger.info({
        message: [
            {
                req,
                action: 'desync',
                method: req.params.method
            }
        ]
    });

    const { user, method } = await getUserAndMethodModule(req);
    return method.user_desync(user, req, res);
}

/**
 * Get all UserPreferences, list of uid
 */
export async function get_uids(req, res) {
    return apiDb.get_uids(req, res);
}

function getMethodPropertiesIfExists(req) {
    return properties.getMethod(req.params.method) || errors.MethodNotFoundError.throw();
}

function errorIfNoMethodProperties(req) {
    return getMethodPropertiesIfExists(req);
}

/**
 * @returns {Promise<{user, method}>}
 */
export async function getUserAndMethodModule(req, { checkUserMethodActive, checkMethodPropertiesExists, checkMethodPropertyActivate, checkMethodPropertyPending } = {}) {
    const reqMethod = req.params.method;
    const methodModule = methods[reqMethod];
    const user = await apiDb.find_user(req);

    if (!methodModule) {
        throw new errors.MethodNotFoundError();
    } else if (checkUserMethodActive && !user[reqMethod].active) {
        throw new errors.MethodNotFoundError();
    } else if (checkMethodPropertiesExists && !properties.getMethod(reqMethod)) {
        throw new errors.MethodNotFoundError();
    } else if (checkMethodPropertyActivate && !properties.getMethodProperty(reqMethod, 'activate')) {
        throw new errors.MethodNotFoundError();
    } else if (checkMethodPropertyPending && !properties.getMethodProperty(reqMethod, 'pending')) {
        throw new errors.MethodNotFoundError();
    }
    return {
        method: methodModule,
        user: user
    };
}

function errorIfNotPushMethod(req) {
    if (!(properties.getMethod(req.params.method) && req.params.method == 'push')) {
        throw new errors.MethodNotFoundError();
    }
}
