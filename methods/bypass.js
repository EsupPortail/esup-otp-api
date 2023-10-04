import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import { apiDb } from '../controllers/api.js';

import { getInstance } from '../services/logger.js';
const logger = getInstance();

export const name = "bypass";

export function send_message(user, req, res, next) {
    res.status(404);
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}

/**
 * Vérifie si le code fourni correspond à celui stocké en base de données
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function verify_code(user, req, res, callbacks) {
    logger.debug(utils.getFileNameFromUrl(import.meta.url)+' '+"verify_code: "+user.uid);
    if (user.bypass.codes) {
        let checkOtp = false;
        const codes = user.bypass.codes;
        for (const code in codes) {
            if (user.bypass.codes[code] == req.params.otp) {
                checkOtp = true;
                codes.splice(code, 1);
                user.bypass.codes = codes;
                user.bypass.used_codes += 1;
            }
        }
        if (checkOtp) {
            apiDb.save_user(user, () => {
                logger.info(utils.getFileNameFromUrl(import.meta.url)+" Valid credentials by "+user.uid);
                res.status(200);
                res.send({
                    "code": "Ok",
                    "message": properties.getMessage('success','valid_credentials')
                });
            });
        } else {
            const next = callbacks.pop();
            next(user, req, res, callbacks);
        }
    } else {
        const next = callbacks.pop();
        next(user, req, res, callbacks);
    }
}

export function generate_method_secret(user, req, res, next) {
    const codes = new Array();
    
    const bypassProperties = properties.getMethod('bypass');
    const code_length = bypassProperties.code_length;
    // on emplit `codes` avec `codes_number` codes différents
    for (let it = 0; it < bypassProperties.codes_number; it++) {
		codes.push(utils.generate_code_of_type(code_length, bypassProperties.code_type));
    }
    user.bypass.codes = codes;
    logger.log('archive', {
        message: [
            {
                uid: req.params.uid,
                clientIp: req.headers['x-client-ip'],
                clientUserAgent: req.headers['client-user-agent'],
                action: 'generate codes'
            }
        ]
    });
    apiDb.save_user(user, () => {
        res.status(200);
        res.send({
            code: "Ok",
            message: "",
            codes: codes

        });
    });
}

export function delete_method_secret(user, req, res, next) {
    user.bypass.active = false;
    user.bypass.codes = [];
    apiDb.save_user(user, () => {
        res.status(200);
        res.send({
            "code": "Ok",
            "message": 'Secret removed'
        });
    });
}

export function get_method_secret(user, req, res, next) {
    res.status(404);
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}

export function user_activate(user, req, res, next) {
    user.bypass.active = true;
    apiDb.save_user(user, () => {
        res.status(200);
        res.send({
            "code": "Ok",
            "message": ""
        });
    });
}

export function confirm_user_activate(user, req, res, next) {
    res.status(404);
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}

export function user_deactivate(user, req, res, next) {
    user.bypass.active = false;
    apiDb.save_user(user, () => {
        res.status(200);
        res.send({
            "code": "Ok",
            "message": ""
        });
    });
}

export function admin_activate(req, res, next) {
    res.status(404);
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}

export function user_desync(user, req, res, next) {
    res.status(404);
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}