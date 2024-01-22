import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import { apiDb } from '../controllers/api.js';

import { getInstance } from '../services/logger.js';
const logger = getInstance();
import * as sockets from '../server/sockets.js';

export const name = "esupnfc";

export function locations(user, req, res, next) {
    if(user.esupnfc.active) {
	logger.debug("locations: [ESUP-OTP]");
	res.send(["ESUP-OTP"]);
    } else {
	logger.debug("locations: []");
	res.send([]);
    }
}

export function check_accept_authentication(req, res, next) {
    logger.debug("check_accept_authentication: ESUP-OTP");
    res.send("OK");
}

export function accept_authentication(user, req, res, next) {
    logger.debug("accept_authentication: ESUP-OTP");
    user.esupnfc.code = utils.generate_digit_code(properties.getMethod('random_code').code_length);
    let validity_time = properties.getMethod('esupnfc').validity_time * 60 * 1000;
    validity_time += new Date().getTime();
    user.esupnfc.validity_time = validity_time;
    apiDb.save_user(user, () => {
	sockets.emitCas(user.uid,'userAuth', {"code": "Ok", "otp": user.esupnfc.code});
	logger.debug("sockets.emitCas OK : otp = " + user.esupnfc.code);    
	res.send({
            "code": "Ok",
            "message": properties.getMessage('success', 'valid_credentials')
	});
    });
}

export function send_message(user, req, res, next) {
    logger.debug("send_message: ESUP-OTP");
    //res.send("<h1>Code :</h1><p>" + user.esupnfc.code + "</p>");
    // autologin
    res.send("");
}

export function generate_method_secret(user, req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}

export function delete_method_secret(user, req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}

export function user_activate(user, req, res, next) {
    user.esupnfc.active = true;
    apiDb.save_user(user, () => {
        res.send({
            "code": "Ok",
            "message": ""
        });
    });
}

export function confirm_user_activate(user, req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}

export function user_deactivate(user, req, res, next) {
    user.esupnfc.active = false;
    apiDb.save_user(user, () => {
        res.send({
            "code": "Ok",
            "message": ""
        });
    });
}

export function admin_activate(req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}

export function user_desync(user, req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}

/**
 * Vérifie si l'otp fourni correspond à celui généré
 * si oui: on retourne un réponse positive
 * sinon: on renvoie une erreur 401 InvalidCredentialsError
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function verify_code(user, req, res, callbacks) {
    logger.debug(utils.getFileNameFromUrl(import.meta.url) + ' ' + "verify_code: " + user.uid);
    if (user.esupnfc.code == req.params.otp && Date.now() < user.esupnfc.validity_time) {
        user.esupnfc.code=null;
        user.esupnfc.validity_time=null;
        apiDb.save_user(user, () => {
            logger.info(utils.getFileNameFromUrl(import.meta.url)+" valid credentials by " + user.uid);
            res.send({
                "code": "Ok",
                "message": properties.getMessage('success', 'valid_credentials')
            });
        });
    } else {
        const next = callbacks.pop();
        next(user, req, res, callbacks)
    }
}
