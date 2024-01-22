import * as properties from '../properties/properties.js';
import * as api_controller from '../controllers/api.js';
import * as utils from '../services/utils.js';
import { apiDb } from '../controllers/api.js';
import { getInstance } from '../services/logger.js'; const logger = getInstance();

export const name = "random_code_mail";

export function send_message(user, req, res, next) {
    const new_otp = user.random_code_mail;
    
    const code_length = properties.getMethod('random_code_mail').code_length;
    const code_type = properties.getMethod('random_code_mail').code_type;
    new_otp.code = utils.generate_code_of_type(code_length, code_type);
    
    let validity_time = properties.getMethod('random_code_mail').validity_time * 60 * 1000;
    validity_time += new Date().getTime();
    new_otp.validity_time = validity_time;
    user.random_code_mail = new_otp;
    apiDb.save_user(user, () => {
        api_controller.transport_code(new_otp.code, req, res, next);
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
    if (user.random_code_mail.code == req.params.otp && Date.now() < user.random_code_mail.validity_time) {
        user.random_code_mail.code=null;
        user.random_code_mail.validity_time=null;
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
        next(user, req, res, callbacks)
    }
}

export function generate_method_secret(user, req, res, next) {
    res.status(404);
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}

export function delete_method_secret(user, req, res, next) {
    res.status(404);
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}

export function user_activate(user, req, res, next) {
    user.random_code_mail.active = true;
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
    user.random_code_mail.active = false;
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
