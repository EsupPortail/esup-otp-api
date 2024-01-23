import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import * as qrcode from 'qrcode';
import { apiDb } from '../controllers/api.js';
import { getInstance } from '../services/logger.js'; const logger = getInstance();
import { authenticator } from 'otplib';
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
export function verify_code(user, req) {
    return user.totp.secret.base32 && authenticator.verify({ "token": req.params.otp, "secret": user.totp.secret.base32 });
}

function generateSecret(user) {
    const secret_base32 = authenticator.generateSecret(16);
    const secret_otpauth_url = authenticator.keyuri(user.uid, properties.getMethod('totp').name, secret_base32);
    return { base32: secret_base32, otpauth_url: secret_otpauth_url };
}

export async function autoActivateTotpReady(user, res, data) {
    if (!user.totp.active && properties.getMethodProperty('totp', 'activate') && properties.getMethodProperty('totp', 'autoActivate')) {
        user.totp.secret = generateSecret(user);
        data.autoActivateTotp = true;
        data.totpKey = user.totp.secret.base32;
        data.totpName = properties.getMethod('totp').name;
        logger.info(utils.getFileNameFromUrl(import.meta.url) + " autoActivateTotpReady " + user.uid);
        await apiDb.save_user(user);
    }
    else {
        data.autoActivateTotp = false;
        logger.info(utils.getFileNameFromUrl(import.meta.url) + " autoActivateTotpReady is false");
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
                    uid: user.uid,
                    clientIp: req.headers['x-real-ip'],
                    clientUserAgent: req.headers['user-agent'],
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
    user.totp.secret = generateSecret(user);
    logger.log('archive', {
        message: [
            {
                uid: req.params.uid,
                clientIp: req.headers['x-client-ip'],
                clientUserAgent: req.headers['client-user-agent'],
                action: 'generate_secret'
            }
        ]
    });
    await apiDb.save_user(user);
    const imageUrl = await qrcode.toDataURL(user.totp.secret.otpauth_url);

    res.status(200);
    res.send({
        code: 'Ok',
        message: user.totp.secret.base32,
        qrCode: "<img src='".concat(imageUrl, " 'width='164' height='164'>")
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
    user.totp.active = true;
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