import * as properties from '../properties/properties.js';
import * as api_controller from '../controllers/api.js';
import * as utils from '../services/utils.js';
import * as errors from '../services/errors.js';
import { apiDb } from '../controllers/api.js';

export const name = "random_code";

export async function send_message(user, req, res) {
    const new_otp = user.random_code;

    const code_length = properties.getMethod('random_code').code_length;
    const code_type = properties.getMethod('random_code').code_type;
    new_otp.code = utils.generate_code_of_type(code_length, code_type);

    let validity_time = properties.getMethod('random_code').validity_time * 60 * 1000;
    validity_time += new Date().getTime();
    new_otp.validity_time = validity_time;
    user.random_code = new_otp;
    await apiDb.save_user(user);
    return api_controller.transport_code(new_otp.code, req, res);
}

/**
 * Indique si le code fourni correspond à celui stocké en base de données
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function verify_code(user, req) {
    if (user.random_code.code == req.params.otp && Date.now() < user.random_code.validity_time) {
        user.random_code.code = null;
        user.random_code.validity_time = null;
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
    user.random_code.active = true;
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
    user.random_code.active = false;
    await apiDb.save_user(user);
    res.status(200);
    res.send({
        "code": "Ok",
    });
}

export function user_desync(user, req, res) {
    throw new errors.UnvailableMethodOperationError();
}
