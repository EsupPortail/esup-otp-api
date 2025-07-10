import * as properties from '../properties/properties.js';
import * as api_controller from '../controllers/api.js';
import * as utils from '../services/utils.js';
import * as errors from '../services/errors.js';
import { apiDb } from '../controllers/api.js';

export const name = "random_code_mail";

export async function send_message(user, req, res) {
    const new_otp = user.random_code_mail;

    const code_length = properties.getMethod('random_code_mail').code_length;
    const code_type = properties.getMethod('random_code_mail').code_type;
    new_otp.code = utils.generate_code_of_type(code_length, code_type);

    let validity_time = properties.getMethod('random_code_mail').validity_time * 60 * 1000;
    validity_time += new Date().getTime();
    new_otp.validity_time = validity_time;
    user.random_code_mail = new_otp;
    await apiDb.save_user(user);
    return api_controller.transport_code(new_otp.code, req, res, user);
}

/**
 * Indique si le code fourni correspond à celui stocké en base de données
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function verify_code(user, req) {
    if (user.random_code_mail.code == req.params.otp && Date.now() < user.random_code_mail.validity_time) {
        user.random_code_mail.code = null;
        user.random_code_mail.validity_time = null;
        await apiDb.save_user(user);
        return true;
    } else {
        return false;
    }
}

export function generate_method_secret(user, req, res) {
    throw new errors.UnvailableMethodOperationError();
}

export function delete_method_secret(user, req, res) {
    throw new errors.UnvailableMethodOperationError();
}

export async function user_activate(user, req, res) {
    user.random_code_mail.internally_activated = true;
    await apiDb.save_user(user);
    res.status(200);
    res.send({
        "code": "Ok",
    });
}

export function confirm_user_activate(user, req, res) {
    throw new errors.UnvailableMethodOperationError();
}

export async function user_deactivate(user, req, res) {
    user.random_code_mail.internally_activated = false;
    await apiDb.save_user(user);
    res.status(200);
    res.send({
        "code": "Ok",
    });
}

export function user_desync(user, req, res) {
    throw new errors.UnvailableMethodOperationError();
}
