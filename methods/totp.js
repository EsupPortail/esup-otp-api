import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import * as fileUtils from '../services/fileUtils.js';
import { apiDb } from '../controllers/api.js';
import logger from '../services/logger.js';
import * as OTPAuth from "otpauth";
import * as errors from '../services/errors.js';

export const name = "totp";

export function send_message(user, req, res) {
    throw new errors.UnvailableMethodOperationError();
}

/**
 * Indique si l'otp fourni correspond à celui généré
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function verify_code(user, req) {
    if (Date.now() > user.totp.expiry_time_of_last_code_used && verify_token(req.params.otp, user.totp.secret.base32)) {
        user.totp.expiry_time_of_last_code_used = getCurrentPeriodEnd();
        await apiDb.save_user(user);
        return true;
    }
    return false;
}

function getCurrentPeriodEnd() {
    const now = Date.now();
    const periodDuration = OTPAuth.TOTP.defaults.period * 1000;
    const currentPeriodStart = now - (now % periodDuration);
    return currentPeriodStart + periodDuration;
}

function verify_token(token, base32_secret) {
    return OTPAuth.TOTP.validate({
        token: token,
        secret: OTPAuth.Secret.fromBase32(base32_secret),
        digits: 6,
    }) !== null;
}

function generateSecret(user) {
    const totp = new OTPAuth.TOTP({
      issuer: properties.getMethod('totp').name,
      label: user.uid,
    });

    return {
        base32: totp.secret.base32,
        otpauth_url: totp.toString(),
    };
}

export async function autoActivateTotpReady(user, res, data) {
    if (!user.totp.active && properties.getMethodProperty('totp', 'activate') && properties.getMethodProperty('totp', 'autoActivate')) {
        user.totp.secret = generateSecret(user);
        data.autoActivateTotp = true;
        data.totpKey = user.totp.secret.base32;
        data.totpName = properties.getMethod('totp').name;
        logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + " autoActivateTotpReady " + user.uid);
        await apiDb.save_user(user);
    }
    else {
        data.autoActivateTotp = false;
        logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + " autoActivateTotpReady is false");
    }
}

export async function autoActivateTotp(user, req, res) {
    if (!user.totp.active && properties.getMethodProperty('totp', 'activate') && properties.getMethodProperty('totp', 'autoActivate') && user.totp.secret != null) {
        user.totp.active = true;
        await apiDb.save_user(user);
        res.send({
            "code": "Ok"
        })
        logger.log('archive', {
            message: [
                {
                    req,
                    action: 'activate_totp_auto'
                }
            ]
        });
    }
    else res.send({
        "code": "Ko"
    })
}

export async function generate_method_secret(user, req, res) {
    if (req.query.require_method_validation === 'true' && user.totp.active) {
        user.totp.active = false;
        logger.log('archive', {
            message: [
                {
                    req,
                    action: 'deactivate_method',
                    method: req.params.method,
                }
            ]
        });
    }
    user.totp.secret = generateSecret(user);
    logger.log('archive', {
        message: [
            {
                req,
                action: 'generate_secret',
                method: req.params.method,
            }
        ]
    });
    await apiDb.save_user(user);

    res.status(200);
    res.send({
        code: 'Ok',
        message: user.totp.secret.base32,
        qrCode: await utils.generateQrCode(user.totp.secret.otpauth_url, 164)
    });
}

export async function delete_method_secret(user, req, res) {
    user.totp.active = false;
    user.totp.secret = {};
    await apiDb.save_user(user);
    res.status(200);
    res.send({
        "code": "Ok",
        "message": 'Secret removed'
    });
}

export async function user_activate(user, req, res) {
    // used only by manager <= v1.1.6
    // more recent versions directly use generate_method_secret (with req.query.require_method_validation)
    user.totp.active = true;
    await apiDb.save_user(user);
    res.status(200);
    res.send({
        "code": "Ok",
    });
}

export async function confirm_user_activate(user, req, res) {
    if (!user.totp.active && req.params.activation_code && verify_token(req.params.activation_code, user.totp.secret.base32)) {
        user.totp.active = true;
        logger.log('archive', {
            message: [
                {
                    req,
                    action: 'activate_method',
                    method: req.params.method,
                }
            ]
        });
        await apiDb.save_user(user);
        res.status(200);
        res.send({
            "code": "Ok",
        });
    } else {
        throw new errors.InvalidCredentialsError();
    }
}

export async function user_deactivate(user, req, res) {
    user.totp.active = false;
    await apiDb.save_user(user);
    res.status(200);
    res.send({
        "code": "Ok",
    });
}

export function user_desync(user, req, res) {
    throw new errors.UnvailableMethodOperationError();
}
