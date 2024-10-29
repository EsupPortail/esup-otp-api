/**
 * Created by abousk01 on 20/07/2016.
 */
import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import * as errors from '../services/errors.js';
import { apiDb } from '../controllers/api.js';

import { getInstance } from '../services/logger.js';
const logger = getInstance();
import admin from "firebase-admin";
import { HttpsProxyAgent } from "https-proxy-agent";
import * as sockets from '../server/sockets.js';
import * as ip_location from 'ip-location-api'
import DeviceDetector from "node-device-detector";
import { autoActivateTotpReady } from './totp.js';

const trustGcm_id = properties.getMethod('push').trustGcm_id;

// Set up the sender with you API key, prepare your recipients' registration tokens.
const proxyUrl = properties.getEsupProperty('proxyUrl');

/**
 * @type {(content: admin.messaging.TokenMessage) => Promise<string>}
 */
// initFirebaseAdmin() only if serviceAccount.private_key is defined
const send = properties.getMethod('push').serviceAccount?.private_key && initFirebaseAdmin();


function initFirebaseAdmin() {
    admin.initializeApp({
        credential: admin.credential.cert(properties.getMethod('push').serviceAccount),
        httpAgent: proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined,
    });

    logger.info("firebase-admin initialized");

    initIpLocation();

    return function sendWithFirebaseAdmin(content) {
        return admin.messaging().send(content);
    }
}

export const name = "push";

async function initIpLocation() {
    ip_location.reload({
        fields: "city",
        language: "fr",
        silent: true,
    });
}

// https://github.com/sanchezzzhak/node-device-detector#user-content-gettersetteroptions-
const detector = new DeviceDetector({
    deviceIndexes: true,
});

export async function send_message(user, req, res) {
    user.push.code = utils.generate_digit_code(properties.getMethod('random_code').code_length);
    let validity_time = properties.getMethod('push').validity_time * 60 * 1000;
    validity_time += new Date().getTime();
    user.push.validity_time = validity_time;
    const lt = utils.generate_string_code(30);
    user.push.lt = lt;
    logger.debug("gcm.Message with 'lt' as secret : " + lt);

    user.push.text = getText(req);

    /**
     * @type {admin.messaging.TokenMessage}
     */
    const content = {
        notification: {
            title: properties.getMethod('push').title,
            body: properties.getMethod('push').body,
        },
        android: {
            notification: {
                clickAction: "com.adobe.phonegap.push.background.MESSAGING_EVENT"
            }
        },
        data: {
            message: user.push.text,
            text: user.push.text,
            action: 'auth',
            trustGcm_id: trustGcm_id?.toString(),
            url: getUrl(req),
            uid: user.uid,
            lt: lt
        },
        token: user.push.device.gcm_id
    };


    await apiDb.save_user(user);
    if (properties.getMethod('push').notification) {
        logger.debug("send gsm push ...");

        let response;
        try {
            response = await send(content);
        } catch (err) {

            if (err.code == "messaging/registration-token-not-registered") {
                logger.info("user " + user.uid + " push method deactivation because of 'token not registered' error");
                return user_unactivate(user, req, res);
            }
            logger.error("Problem to send a notification to " + user.uid + ": " + err);
            throw new errors.EsupOtpApiError(200, JSON.stringify(err));
        }

        logger.debug("send gsm push ok : " + response);
        res.send({
            "code": "Ok",
            "message": response
        });
    } else {
        logger.debug("Push notification is not activated. See properties/esup.json#methods.push.notification");
        res.send({
            "code": "Ok",
            "message": "Notification is deactivated. Launch Esup Auth app to authenticate."
        });
    }
}

function getText(req) {
    const ip = req.headers['x-real-ip'] || req.connection.remoteAddress;
    logger.debug("x-real-ip :" + req.headers['x-real-ip']);
    logger.debug("Client ip is :" + ip);
    const geo = ip_location.lookup(ip);
    logger.debug("Client geoip is :" + JSON.stringify(geo));
    const city = geo?.city;

    let text = properties.getMethod('push').text1;
    if (city)
        text += properties.getMethod('push').text2.replace('$city', city);
    return text;
}

/**
 * Indique si le code fourni correspond à celui généré
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function verify_code(user, req) {
    if (user.push.code == req.params.otp && Date.now() < user.push.validity_time) {
        user.push.code = null;
        user.push.validity_time = null;
        await apiDb.save_user(user);
        return true;
    } else {
        return false;
    }
}

function ifTokenSecretsMatch(user, req) {
    return utils.equalsAndtruthy(user.push.token_secret, req.params.tokenSecret);
}

export function pending(user, req, res) {
    if (user.push.active && properties.getMethodProperty(req.params.method, 'activate') && ifTokenSecretsMatch(user, req) && Date.now() < user.push.validity_time) {
        res.send({
            "code": "Ok",
            "message": user.push.text,
            "text": user.push.text,
            "action": 'auth',
            "lt": user.push.lt
        });
    }
    else if (!user.push.active || req.params.tokenSecret != user.push.token_secret) {
        res.send({
            "code": "Ok",
            "message": "Les notifications push ont été désactivées pour votre compte",
            "text": "Les notifications push ont été désactivées pour votre compte",
            "action": 'desync'
        });
    }
    else {
        if (req.params.tokenSecret != user.push.token_secret)
            logger.warn(utils.getFileNameFromUrl(import.meta.url) + " Bad token_secret provided by " + user.uid + " in pending action");
        res.send({
            "code": "KO"
        });
    }
}

export function generate_method_secret(user, req, res) {
    throw new errors.UnvailableMethodOperationError();
}

export function delete_method_secret(user, req, res) {
    throw new errors.UnvailableMethodOperationError();
}

export async function user_activate(user, req, res) {
    const activation_code = utils.generate_digit_code(6);
    user.push.activation_code = activation_code;
    user.push.activation_fail = null;
    user.push.active = false;
    const qrCodeUri = getUrl(req) + '/users/' + user.uid + '/methods/push/' + activation_code;

    await apiDb.save_user(user);
    res.send({
        "code": "Ok",
        "message1": properties.getMessage('success', 'push_confirmation1'),
        "message2": properties.getMessage('success', 'push_confirmation2'),
        "message3": properties.getMessage('success', 'push_confirmation3'),
        "message4": properties.getMessage('success', 'push_confirmation4'),
        "message5": properties.getMessage('success', 'push_confirmation5'),
        "qrCode": await utils.generateQrCode(qrCodeUri, 260),
        "activationCode": activation_code
    });
}

function getUrl(req) {
    const http = req.headers["x-forwarded-proto"] || 'http';
    const host = req.headers["x-forwarded-host"]?.replace(/,.*/, '') || req.headers.host;
    return http + '://' + host;
}
// generation of tokenSecret sent to the client, edited by mbdeme on June 2020

export async function confirm_user_activate(user, req, res) {
    if (user.push.activation_code != null && user.push.activation_fail < properties.getMethod('push').nbMaxFails && !user.push.active && req.params.activation_code == user.push.activation_code) {
        const userAgent = req.headers['user-agent'];
        const deviceInfosFromUserAgent = detector.detect(userAgent);

        const token_secret = utils.generate_string_code(128);
        user.push.token_secret = token_secret;
        user.push.active = true;
        user.push.device.platform = deviceInfosFromUserAgent.os.name || req.params.platform || "AndroidDev";
        user.push.device.gcm_id = req.params.gcm_id || "GCMIDDev";
        user.push.device.manufacturer = deviceInfosFromUserAgent.device.brand || req.params.manufacturer || "DevCorp";
        user.push.device.model = deviceInfosFromUserAgent.device.model || req.params.model || "DevDevice";
        user.push.activation_code = null;
        user.push.activation_fail = null;
        await apiDb.save_user(user);
        sockets.emitManager('userPushActivate', { uid: user.uid });
        sockets.emitToManagers('userPushActivateManager', user.uid);
        const data = {
            "code": "Ok",
            "tokenSecret": token_secret,
        };
        await autoActivateTotpReady(user, res, data);
        logger.debug(utils.getFileNameFromUrl(import.meta.url) + " autoActivateTotpReady " + JSON.stringify(data));
        res.send(data);
    } else {
        let nbfail = user.push.activation_fail;
        nbfail = (nbfail || 0) + 1;
        user.push.activation_fail = nbfail;
        logger.info(utils.getFileNameFromUrl(import.meta.url) + ' App confirm activation fails for ' + user.uid + " (" + nbfail + ")");
        await apiDb.save_user(user);
        throw new errors.InvalidCredentialsError();
    }
}

// refresh gcm_id when it is regenerated
export async function refresh_user_gcm_id(user, req, res) {
    if (ifTokenSecretsMatch(user, req) && req.params.gcm_id == user.push.device.gcm_id) {
        logger.debug("refresh old gcm_id : " + user.push.device.gcm_id + " with " + req.params.gcm_id_refreshed);
        user.push.device.gcm_id = req.params.gcm_id_refreshed;
        await apiDb.save_user(user);
        res.send({
            "code": "Ok",
        });
    } else {
        throw new errors.InvalidCredentialsError();
    }
}

// Checks whether the tokenSecret received is equal to the one generated, changed by mbdeme on June 2020

export async function accept_authentication(user, req, res) {
    logger.debug("accept_authentication ? " + user.push.token_secret + " VS " + req.params.tokenSecret);
    let tokenSecret = null;
    if (trustGcm_id == true && user.push.device.gcm_id == req.params.tokenSecret)
        tokenSecret = user.push.token_secret;
    if ((user.push.token_secret == req.params.tokenSecret || tokenSecret != null) && req.params.loginTicket == user.push.lt) {
        logger.debug("accept_authentication OK : lt = " + req.params.loginTicket);
        await apiDb.save_user(user);
        sockets.emitCas(user.uid, 'userAuth', { "code": "Ok", "otp": user.push.code });
        res.send({
            "code": "Ok",
            "tokenSecret": tokenSecret
        });
        logger.debug("sockets.emitCas OK : otp = " + user.push.code);
    } else {
        logger.warn(user.uid + "'s token_secret or lt doesn't match. req.params.tokenSecret=" + req.params.tokenSecret + " and req.params.loginTicket=" + req.params.loginTicket);
        throw new errors.UnvailableMethodOperationError();
    }
}

export async function check_accept_authentication(user, req, res) {
    if (user.push.lt.indexOf(req.params.loginTicket) > -1) {
        user.push.lt = "";
        await apiDb.save_user(user);
        res.send({
            "code": "Ok",
            "otp": user.push.code
        });
    } else {
        logger.error("CAS Login Ticket doesn't match : " + user.push.lt + " != " + req.params.loginTicket);
        res.send({
            "code": "Error",
            "message": "CAS Login Ticket doesn't match"
        });
    }
}

async function clearUserPush(user, req, res) {
    user.push.active = false;
    user.push.device.platform = null;
    user.push.device.gcm_id = null;
    user.push.device.manufacturer = null;
    user.push.device.model = null;
    user.push.activation_code = null;
    user.push.activation_fail = null;
    user.push.token_secret = null;
    user.push.code = null;
    user.push.validity_time = null;
    user.push.text = null;
    user.push.lt = null;
    await apiDb.save_user(user);
}

export async function user_deactivate(user, req, res) {
    if (properties.getMethod('push').notification)
        alert_deactivate(user);
    await clearUserPush(user, req, res);
    res.status(200);
    res.send({
        "code": "Ok",
    });
}

async function user_unactivate(user, req, res) {
    await clearUserPush(user, req, res);
    throw new errors.PushNotRegisteredError();
}

async function alert_deactivate(user) {
    if (!user.push.device.gcm_id) {
        return;
    }
    /**
     * @type {admin.messaging.TokenMessage}
     */
    const content = {
        notification: {
            title: "Esup Auth",
            body: "Les notifications push ont été désactivées pour votre compte",
        },
        android: {
            notification: {
                clickAction: "com.adobe.phonegap.push.background.MESSAGING_EVENT"
            }
        },
        data: {
            message: "Les notifications push ont été désactivées pour votre compte",
            text: "Les notifications push ont été désactivées pour votre compte",
            action: 'desync'
        },
        token: user.push.device.gcm_id
    };

    try {
        await send(content);
    } catch (err) {
        logger.error("Problem to send a notification for deactivate push: " + err);
    }
}

export async function user_desync(user, req, res) {
    logger.debug(utils.getFileNameFromUrl(import.meta.url) + ' user_desync: ' + user.uid);
    if (user.push.active && ifTokenSecretsMatch(user, req)) {
        await clearUserPush(user, req, res);

        await Promise.all([
            apiDb.save_user(user),
            sockets.emitManager('userPushDeactivate', { uid: user.uid })
        ]);
    }
    res.status(200);
    res.send({
        "code": "Ok",
    });
}