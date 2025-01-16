import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import * as errors from '../services/errors.js';
import { apiDb } from '../controllers/api.js';

import { getInstance } from '../services/logger.js';
const logger = getInstance();

export const name = "bypass";

export function send_message(user, req, res) {
    throw new errors.UnvailableMethodOperationError();
}

/**
 * Indique si le code fourni correspond à celui stocké en base de données
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function verify_code(user, req) {
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
            await apiDb.save_user(user);
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

export async function generate_method_secret(user, req, res) {
    const codes = new Array();

    const bypassProperties = properties.getMethod('bypass');
    const code_length = bypassProperties.code_length;
    const codes_number = req.query.codes_number || bypassProperties.codes_number;
    for (let it = 0; it < codes_number; it++) {
        codes.push(utils.generate_code_of_type(code_length, bypassProperties.code_type));
    }
    user.bypass.codes = codes;
    logger.log('archive', {
        message: [
            {
                req,
                action: 'generate codes'
            }
        ]
    });
    await apiDb.save_user(user);
    res.status(200);
    res.send({
        code: "Ok",
        codes: codes
    });
}

export async function delete_method_secret(user, req, res) {
    user.bypass.active = false;
    user.bypass.codes = [];
    await apiDb.save_user(user);
    res.status(200);
    res.send({
        "code": "Ok",
        "message": 'Secret removed'
    });
}

export async function user_activate(user, req, res) {
    user.bypass.active = true;
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
    user.bypass.active = false;
    await apiDb.save_user(user);
    res.status(200);
    res.send({
        "code": "Ok",
    });
}

export function user_desync(user, req, res) {
    throw new errors.UnvailableMethodOperationError();
}
