import * as userDb_controller from './user.js';
import * as utils from '../services/utils.js';
import * as mailer from '../services/mailer.js';
import * as sms from '../services/sms.js';
import * as properties from '../properties/properties.js';
import methods from '../methods/methods.js';

import { getInstance } from '../services/logger.js';
const logger = getInstance();

export let apiDb;

export function initialize(callback) {
    if (properties.getEsupProperty('apiDb')) {
        import('../databases/api/' + properties.getEsupProperty('apiDb') + '.js')
            .then((apiDbModule) => {
                apiDb = apiDbModule;
                apiDb.initialize(callback);
            })
    } else logger.error(utils.getFileNameFromUrl(import.meta.url) + ' ' + "Unknown apiDb");
}

export function get_methods(req, res, next) {
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
    res.status(response.code === "Ok" ? 200 : 404);
    res.send(response);
}

/**
 * Active la méthode req.params.method
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function activate_method_admin(req, res, next) {
    if (properties.getMethod(req.params.method)) {
        properties.setMethodProperty(req.params.method, 'activate', true);
        apiDb.update_api_preferences();
        res.status(200);
        res.send({
            code: 'Ok',
            message: ''
        });
    } else {
        res.status(404);
        res.send({
            "code": "Error",
            "message": properties.getMessage('error', 'method_not_found')
        });
    }
}

/**
 * Désctive la méthode req.params.method
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function deactivate_method_admin(req, res, next) {
    if (properties.getMethod(req.params.method)) {
        properties.setMethodProperty(req.params.method, 'activate', false);
        apiDb.update_api_preferences();
        res.status(200);
        res.send({
            code: 'Ok',
            message: ''
        });
    } else {
        res.status(404);
        res.send({
            "code": "Error",
            "message": properties.getMessage('error', 'method_not_found')
        });
    }
}

/**
 * Active le transport req.params.transport pour la  méthode req.params.method
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function activate_method_transport(req, res, next) {
    if (properties.getMethod(req.params.method)) {
        properties.addMethodTransport(req.params.method, req.params.transport);
        apiDb.update_api_preferences();
        res.status(200);
        res.send({
            code: 'Ok',
            message: ''
        });
    } else {
        res.status(404);
        res.send({
            "code": "Error",
            "message": properties.getMessage('error', 'method_not_found')
        });
    }
}

/**
 * Désctive le transport req.params.transport pour la  méthode req.params.method
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function deactivate_method_transport(req, res, next) {
    if (properties.getMethod(req.params.method)) {
        properties.removeMethodTransport(req.params.method, req.params.transport);
        apiDb.update_api_preferences();
        res.status(200);
        res.send({
            code: 'Ok',
            message: ''
        });
    } else {
        res.status(404);
        res.send({
            "code": "Error",
            "message": properties.getMessage('error', 'method_not_found')
        });
    }
}

/**
 * Crée l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function create_user(uid, callback) {
    apiDb.create_user(uid, callback);
}

/**
 * Sauve l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function save_user(user, callback) {
    apiDb.save_user(user, callback);
}

/**
 * Supprime l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function remove_user(uid, callback) {
    apiDb.remove_user(uid, callback);
}

export function updateDeviceModelToUserFriendlyName(req, res, next) {
	apiDb.forEachPushUser(methods["push"].updateDeviceModelToUserFriendlyName)
		.then(() => {
			res.status(200);
			res.send({ code: 'Ok' });
		});
}

/**
 * Envoie le code via le transport == req.params.transport
 * Retourne la réponse du service mail
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function transport_code(code, req, res, next) {
    const opts = {};
    opts.object = properties.getMessage('transport', 'code').object;
    opts.message = code;
    opts.codeRequired = properties.getMethodProperty(req.params.method, 'codeRequired');
    opts.waitingFor = properties.getMethodProperty(req.params.method, 'waitingFor');
    switch (req.params.transport) {
        case 'mail':
            opts.message = properties.getMessage('transport', 'code').mail.pre + code + properties.getMessage('transport', 'code').mail.post;
            break;
        case 'sms':
            opts.message = properties.getMessage('transport', 'code').sms.pre + code + properties.getMessage('transport', 'code').sms.post;
            break;
        default:
            opts.message = properties.getMessage('transport', 'code').mail.pre + code + properties.getMessage('transport', 'code').mail.post;
            break;
    }
    transport(opts, req, res, next);
}

/**
 * Envoie un message de confirmation sur le transport
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function transport_test(req, res, next) {
    const opts = {};
    opts.object = properties.getMessage('transport', 'test').object;
    opts.message = '';
    switch (req.params.transport) {
        case 'mail':
            opts.message = properties.getMessage('transport', 'test').mail.pre + req.params.uid + properties.getMessage('transport', 'test').mail.post;
            break;
        case 'sms':
            opts.message = properties.getMessage('transport', 'test').sms.pre + req.params.uid + properties.getMessage('transport', 'test').sms.post;
            break;
        default:
            opts.message = properties.getMessage('transport', 'test').mail.pre + req.params.uid + properties.getMessage('transport', 'test').mail.post;
            break;
    }
    transport(opts, req, res, next);
}

/**
 * Envoie un message
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
function transport(opts, req, res, next) {
    switch (req.params.transport) {
        case 'mail':
            userDb_controller.send_mail(req, res, function (mail) {
                mailer.send_message(mail, opts, res);
            });
            break;
        case 'sms':
            userDb_controller.send_sms(req, res, function (num) {
                sms.send_message(num, opts, res);
            });
            break;
        default:
            res.status(404);
            res.send({
                code: 'Error',
                message: properties.getMessage('error', 'unvailable_method_transport')
            });
            break;
    }
}


/**
 * Renvoie l'utilisateur avec l'uid == req.params.uid
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function get_user(req, res, next) {
    apiDb.find_user(req, res, function (user) {
        const response = {};
        response.code = 'Ok';
        response.message = '';
        response.user = apiDb.parse_user(user);

        res.status(200);
        res.send(response);
    });
}

/**
 * Renvoie les infos (methodes activees, transports) de utilisateur avec l'uid == req.params.uid
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function get_user_infos(req, res, next) {
    apiDb.find_user(req, res, function (user) {
        userDb_controller.get_available_transports(req, res, function (data) {
            deactivateRandomCodeIfNoTransport(user,data,"");//nettoyage des random_code activés sans transport
            deactivateRandomCodeIfNoTransport(user,data,"_mail"); // pour random_code_mail

            data.push = user.push.device.manufacturer+' '+user.push.device.model;
            res.status(200);
            res.send({
                code: "Ok",
                message: '',
                user: {
                    methods: apiDb.parse_user(user),
                    transports: data,
                    last_send_message: user.last_send_message,
                }
            });
        });
    });
}

/**
 * Désactivation de la méthode random_code si aucun transport renseigné
 * On ne doit pas avoir de random_code activé sans transport.
**/

function deactivateRandomCodeIfNoTransport(user, data, suffixe) {
	if (user['random_code' + suffixe]?.active) {
		let deactivate = true;
		logger.debug("Active transports for randomCode" + suffixe);
		const randomCode = apiDb.parse_user(user)["random_code" + suffixe];
		const randomCodeTransports = randomCode?.transports;
		if (randomCodeTransports && typeof randomCodeTransports[Symbol.iterator] === 'function')
			transportLoop: for (const transport of randomCodeTransports) {
				logger.debug("check if transport is defined: data[" + transport + "]=" + data[transport]);
				if (data[transport]) {
					deactivate = false;
					break transportLoop;
				}
			}

		if (deactivate) {
			user["random_code" + suffixe].active = false;
			save_user(user, () => {
				logger.info('No transport is set. Auto deactivate random_code' + suffixe + ' for ' + user.uid);
			});
		}
	}
}

/**
 * Envoie un code à l'utilisateur avec l'uid == req.params.uid et via la method == req.params.method
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function send_message(req, res, next) {
	if (req.params.method == 'push') {
		logger.debug("send_message_push : " + req.params.method + " - " + properties.getMethod(req.params.method));
	}
    if (properties.getMethod(req.params.method)) {
        apiDb.find_user(req, res, function (user) {
            if (user[req.params.method].active && properties.getMethodProperty(req.params.method, 'activate') && methods[req.params.method]) {
                user.last_send_message = { method: req.params.method, time: Date.now(), auto: "auto" in req.query };
                methods[req.params.method].send_message(user, req, res, next);
            } else {
                res.status(404);
                res.send({code: "Error", message: properties.getMessage('error', 'method_not_found')});
            }
        });
    } else {
        res.status(404);
        res.send({code: "Error", message: properties.getMessage('error', 'method_not_found')});
    }
}

export function accept_authentication(req, res, next) {
    if (properties.getMethod(req.params.method) && req.params.method=='push') {
        apiDb.find_user(req, res, function (user) {
            if (user[req.params.method].active && properties.getMethodProperty(req.params.method, 'activate') && methods[req.params.method]) {
                methods[req.params.method].accept_authentication(user, req, res, next);
            } else {
                res.status(404);
                res.send({code: "Error", message: properties.getMessage('error', 'method_not_found')});
            }
        });
    } else {
        res.status(404);
        res.send({code: "Error", message: properties.getMessage('error', 'method_not_found')});
    }
}

export function pending(req, res, next) {
    if (properties.getMethod(req.params.method) && req.params.method=='push') {
        apiDb.find_user(req, res, function (user) {
            if (properties.getMethodProperty(req.params.method, 'pending')&& methods[req.params.method]) {
                methods[req.params.method].pending(user, req, res, next);
            } else {
                res.status(404);
                res.send({code: "Error", message: properties.getMessage('error', 'method_not_found')});
            }
        });
    } else {
        res.status(404);
        res.send({code: "Error", message: properties.getMessage('error', 'method_not_found')});
    }
}

export function check_accept_authentication(req, res, next) {
    if (properties.getMethod(req.params.method) && req.params.method=='push') {
        apiDb.find_user(req, res, function (user) {
            if (user[req.params.method].active && properties.getMethodProperty(req.params.method, 'activate') && methods[req.params.method]) {
                methods[req.params.method].check_accept_authentication(user, req, res, next);
            } else {
                res.status(404);
                res.send({code: "Error", message: properties.getMessage('error', 'method_not_found')});
            }
        });
    } else {
        res.status(404);
        res.send({code: "Error", message: properties.getMessage('error', 'method_not_found')});
    }
}


/**
 * Vérifie si le code fourni correspond à celui stocké en base de données
 * si oui: on retourne un réponse positive et on supprime l'otp de la base de donnée
 * sinon: on renvoie une erreur 401 InvalidCredentialsError
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function verify_code(req, res, next) {
    apiDb.find_user(req, res, function (user) {
        if (user.last_send_message) user.last_send_message.verified = true;

        logger.debug("verify_code: " + user.uid);

        const callbacks = [function () {
            logger.info(utils.getFileNameFromUrl(import.meta.url) + ' ' + "Invalid credentials submit for user with uid : " + user.uid);

            res.status(401);
            res.send({
                "code": "Error",
                "message": properties.getMessage('error', 'invalid_credentials')
            });
        }];

        for (const method in methods){
            if(user[method].active && properties.getMethodProperty(method, 'activate')) {
                callbacks.push(methods[method].verify_code);
            }
        }

        const next = callbacks.pop();
        next(user, req, res, callbacks);
    });
}


/**
 * Génére un nouvel attribut d'auth (secret key ou matrice ou bypass codes)
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function generate_method_secret(req, res, next) {
    if (properties.getMethod(req.params.method)) {
        apiDb.find_user(req, res, function (user) {
            if (methods[req.params.method] && properties.getMethodProperty(req.params.method, 'activate')) {
                methods[req.params.method].generate_method_secret(user, req, res, next);
            } else {
                res.status(404);
                res.send({code: "Error", message: properties.getMessage('error', 'method_not_found')});
            }
        });
    } else {
        res.status(404);
        res.send({code: "Error", message: properties.getMessage('error', 'method_not_found')});
    }
}


/**
 * Supprime l'attribut d'auth (secret key ou matrice ou bypass codes)
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function delete_method_secret(req, res, next) {
    if (properties.getMethod(req.params.method)) {
        apiDb.find_user(req, res, function (user) {
            methods[req.params.method].delete_method_secret(user, req, res, next);
        });
    } else {
        res.status(404);
        res.send({code: "Error", message: properties.getMessage('error', 'method_not_found')});
    }
}

/**
 * Renvoie le secret de l'utilisateur afin qu'il puisse l'entrer dans son appli smartphone
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function get_method_secret(req, res, next) {
    if (properties.getMethod(req.params.method)) {
        apiDb.find_user(req, res, function (user) {
            methods[req.params.method].get_method_secret(user, req, res, next);
        });
    } else {
        res.status(404);
        res.send({code: "Error", message: properties.getMessage('error', 'method_not_found')});
    }
}

/**
 * Renvoie les méthodes activées de l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function get_activate_methods(req, res, next) {
    apiDb.find_user(req, res, function (user) {
        const response = {};
        const result = {};
        for (const method in properties.getEsupProperty('methods')) {
            result[method] = user[method].active;
        }
        response.code = "Ok";
        response.message = properties.getMessage('success', 'methods_found');
        response.methods = result;

        res.status(200);
        res.send(response);
    });

}


/**
 * Active la méthode l'utilisateur ayant l'uid req.params.uid
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function activate_method(req, res, next) {
    logger.info(utils.getFileNameFromUrl(import.meta.url) + ' ' + req.params.uid + " activate_method " + req.params.method);
    if (req.params.method !== 'push') {
        logger.log('archive', {
            message: [
                {
                    uid: req.params.uid,
                    clientIp: req.headers['x-client-ip'],
                    clientUserAgent: req.headers['client-user-agent'],
                    action: 'activate_method',
                    method: req.params.method
                }
            ]
        });
    }
    if (methods[req.params.method]) {
        apiDb.find_user(req, res, function (user) {
			const method = methods[req.params.method]
            method.user_activate(user, req, res, next);
        });
    } else {
      res.status(404);
      res.send({
        "message": properties.getMessage('error', 'method_not_found')
      });
    }
}

/**
 * Certaine méthode (push) nécessite une activation en deux étapes
 * Confirme l'activation de la méthode l'utilisateur ayant l'uid req.params.uid
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function confirm_activate_method(req, res, next) {
    logger.info(utils.getFileNameFromUrl(import.meta.url) + ' ' + req.params.uid + " activate_method " + req.params.method);
    if (req.params.method === 'push') {
        logger.log('archive', {
            message: [
                {
                    uid: req.params.uid,
                    clientIp: req.headers['x-real-ip'] || req.connection.remoteAddress,
                    clientUserAgent: req.headers['user-agent'],
                    action: 'activate_method',
                    method: req.params.method,
                    Phone: `${req.params.platform} ${req.params.manufacturer} ${req.params.model}`,
                }
            ]
        });
        }
    if (methods[req.params.method]) {
        apiDb.find_user(req, res, function (user) {
            methods[req.params.method].confirm_user_activate(user, req, res, next);
        });
    } else {
        res.status(404);
        res.send({
            "code": "Error",
            "message": properties.getMessage('error', 'method_not_found')
        });
    }
}

export function autoActivateTotp(req, res, next) {
    logger.info(utils.getFileNameFromUrl(import.meta.url) + ' ' + req.params.uid + " autoActivateTotp " + req.params.method);
    if (methods[req.params.method]) {
        apiDb.find_user(req, res, function (user) {
            methods[req.params.method].autoActivateTotp(user, req, res, next);
        });
    } else {
        res.status(404);
        res.send({
            "code": "Error",
            "message": properties.getMessage('error', 'method_not_found')
        });
    }
}

export function refresh_gcm_id_method(req, res, next) {
    logger.info(utils.getFileNameFromUrl(import.meta.url) + ' ' + req.params.uid + " refresh_push " + req.params.method);
    logger.log('archive', {
        message: [
            {
                uid: req.params.uid,
                clientIp: req.headers['x-client-ip'],
                clientUserAgent: req.headers['user-agent'],
                action: 'refresh_push',
                method: req.params.method
            }
        ]
    });
    if (methods[req.params.method]) {
        apiDb.find_user(req, res, function (user) {
            methods[req.params.method].refresh_user_gcm_id(user, req, res, next);
        });
    } else {
        res.status(404);
        res.send({
            "code": "Error",
            "message": properties.getMessage('error', 'method_not_found')
        });
    }
}

/**
 * Désctive la méthode l'utilisateur ayant l'uid req.params.uid
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function deactivate_method(req, res, next) {
    logger.info(utils.getFileNameFromUrl(import.meta.url) + ' ' + req.params.uid + " deactivate_method " + req.params.method);
    logger.log('archive', {
        message: [
            {
                uid: req.params.uid,
                clientIp: req.headers['x-client-ip'],
                clientUserAgent: req.headers['client-user-agent'],
                action: 'deactivate_method',
                method: req.params.method
            }
        ]
    });
    if (methods[req.params.method]) {
        apiDb.find_user(req, res, function (user) {
            methods[req.params.method].user_deactivate(user, req, res, next);
        });
    } else {
        res.status(404);
        res.send({
            "code": "Error",
            "message": properties.getMessage('error', 'method_not_found')
        });
    }
}

/**
 * Certaine méthode (push) peuvent être désactiver sans passer par le manager
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function desync(req, res, next) {
    logger.info(utils.getFileNameFromUrl(import.meta.url) + ' ' + req.params.uid + " desync " + req.params.method);
    logger.log('archive', {
        message: [
            {
                uid: req.params.uid,
                clientIp: req.headers['x-real-ip'] || req.connection.remoteAddress,
                clientUserAgent: req.headers['user-agent'],
                action: 'desync',
                method: req.params.method
            }
        ]
    });
    if (methods[req.params.method]) {
        apiDb.find_user(req, res, function (user) {
            methods[req.params.method].user_desync(user, req, res, next);
        });
    } else {
        res.status(404);
        res.send({
            "code": "Error",
            "message": properties.getMessage('error', 'method_not_found')
        });
    }
}

/**
 * Get all UserPreferences, list of uid
 */
export function get_uids(req, res, next) {
    apiDb.get_uids(req, res, next);
}

/**
 * Drop Users
 */
export function drop(req, res, next) {
    apiDb.drop(req, res, next);
}

/**
 * ESUPNFC
 */
export function esupnfc_locations(req, res, next) {
    req.params.uid = req.params.eppn.split('@').shift();
    apiDb.find_user(req, res, function (user) {
	methods['esupnfc'].locations(user, req, res, next);
    });
}

export function esupnfc_check_accept_authentication(req, res, next) {
    methods['esupnfc'].check_accept_authentication(req, res, next);
}

export function esupnfc_accept_authentication(req, res, next) {
    const eppn = req.body.eppn;
    const uid = eppn.replace(/@.*/,'');
    logger.debug("user uid: " + uid);
    req.params.uid = uid;
    apiDb.find_user(req, res, function (user) {
	methods['esupnfc'].accept_authentication(user, req, res, next);
    });
}

export function esupnfc_send_message(req, res, next) {
    const eppn = req.body.eppn;
    const uid = eppn.replace(/@.*/,'');
    logger.debug("user uid: " + uid);
    req.params.uid = uid;
    apiDb.find_user(req, res, function (user) {
	methods['esupnfc'].send_message(user, req, res, next);
    });
}

