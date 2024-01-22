import * as properties from '../properties/properties.js';
import * as qrcode from 'qrcode';
import * as utils from '../services/utils.js';
import { apiDb } from '../controllers/api.js';
import { getInstance } from '../services/logger.js'; const logger = getInstance();
import { authenticator } from 'otplib';

export const name = "totp";

export function send_message(user, req, res, next) {
	res.status(404);
	res.send({
		"code": "Error",
		"message": properties.getMessage('error', 'unvailable_method_operation')
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
    logger.debug(utils.getFileNameFromUrl(import.meta.url)+' '+"verify_code: "+user.uid);
    if (user.totp.secret.base32) {
        const isValid = authenticator.verify({"token":req.params.otp, "secret":user.totp.secret.base32});
        if (isValid) {
            user.totp.window = properties.getMethod('totp').default_window;
            apiDb.save_user(user, () => {
                logger.info(utils.getFileNameFromUrl(import.meta.url)+" Valid credentials by "+user.uid);
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

function generateSecret(user){
    const secret_base32 = authenticator.generateSecret(16);
    const secret_otpauth_url=authenticator.keyuri(user.uid, properties.getMethod('totp').name, secret_base32);
    return {base32:secret_base32,otpauth_url:secret_otpauth_url};
}

export function autoActivateTotpReady(user,res,data){
    if(!user.totp.active && properties.getMethodProperty('totp', 'activate') && properties.getMethodProperty('totp', 'autoActivate')){
        user.totp.secret=generateSecret(user);
        data.autoActivateTotp = true;
        data.totpKey = user.totp.secret.base32;
        data.totpName=properties.getMethod('totp').name;
        logger.info(utils.getFileNameFromUrl(import.meta.url) +" autoActivateTotpReady "+user.uid);
        apiDb.save_user(user);
    }
    else {
        data.autoActivateTotp = false;
        logger.info(utils.getFileNameFromUrl(import.meta.url) +" autoActivateTotpReady is false");
    }
}

export function autoActivateTotp(user, req,res, next){
    if(!user.totp.active && properties.getMethodProperty('totp', 'activate') && properties.getMethodProperty('totp', 'autoActivate') && user.totp.secret!=null){
        user.totp.active = true;
        apiDb.save_user(user, () => {
            res.send({
                "code":"Ok"
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
        });
    }
    else res.send({
        "code":"Ko"
    })
}

export function generate_method_secret(user, req, res, next) {
    user.totp.secret=generateSecret(user);
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
    apiDb.save_user(user, () => {
        qrcode.toDataURL(user.totp.secret.otpauth_url, (err, imageUrl) => {
            if (err) {
                logger.error('Error with QR');
                return;
            }

            res.status(200);
            res.send({
                code: 'Ok',
                message: user.totp.secret.base32,
                qrCode: "<img src='".concat(imageUrl," 'width='164' height='164'>")
            });
        });
    });
}

export function delete_method_secret(user, req, res, next) {
    user.totp.active = false;
    user.totp.secret = {};
    apiDb.save_user(user, () => {
        res.status(200);
        res.send({
            "code": "Ok",
            "message": 'Secret removed'
        });
    });
}

export function user_activate(user, req, res, next) {
    user.totp.active = true;
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
    user.totp.active = false;
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
