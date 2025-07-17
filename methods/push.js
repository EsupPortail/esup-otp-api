/**
 * Created by abousk01 on 20/07/2016.
 */
import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import * as fileUtils from '../services/fileUtils.js';
import * as errors from '../services/errors.js';
import { apiDb } from '../controllers/api.js';

import logger from '../services/logger.js';
import admin from "firebase-admin";
import { HttpsProxyAgent } from "https-proxy-agent";
import * as sockets from '../server/sockets.js';

/** 
 * @type {import('ip-location-api').lookup} 
 */
let lookup;

import DeviceDetector from "node-device-detector";
import { autoActivateTotpReady } from './totp.js';
import { autoActivateEsupnfcReady } from './esupnfc.js';

const trustGcm_id = properties.getMethod('push').trustGcm_id;

// Set up the sender with you API key, prepare your recipients' registration tokens.
const proxyUrl = properties.getEsupProperty('proxyUrl');

/**
 * @type {(message: admin.messaging.Message, dryRun?: boolean) => Promise<string>}
 */
// initFirebaseAdmin() only if serviceAccount.private_key is defined
const send = properties.getMethod('push').serviceAccount?.private_key && initFirebaseAdmin();


function initFirebaseAdmin() {
    const httpAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
    admin.initializeApp({
        credential: admin.credential.cert(properties.getMethod('push').serviceAccount, httpAgent),
        httpAgent: httpAgent,
    });

    logger.info("firebase-admin initialized");

    initIpLocation()
        .then(() => logger.info("ip-location-api initialized"))
        .catch(err => logger.error(err));

    return function sendWithFirebaseAdmin(message, dryRun) {
        return admin.messaging().send(message, dryRun);
    }
}

async function initIpLocation() {
    process.env.ILA_FIELDS = "city";
    process.env.ILA_LANGUAGE = "fr";
    process.env.ILA_SILENT = true;
    ({ lookup } = await import('ip-location-api'));
}

export const name = "push";

// https://github.com/sanchezzzhak/node-device-detector#user-content-gettersetteroptions-
const detector = new DeviceDetector({
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

    let response = false;
    let dryRun = false;
    
    const remainingTimeoutDuration = user.push.last_rejection_date + (user.push.timeout * 1000) - Date.now();
    if (remainingTimeoutDuration > 0) {
        const remainingTimeoutDurationinSeconds = Math.ceil(remainingTimeoutDuration / 1000)
        logger.warn(`notification not sent : user ${user.uid} rejected previous notification (remaining timeout ${remainingTimeoutDurationinSeconds} seconds, total timeout ${user.push.timeout} seconds)`);
        dryRun = true;
    }
    
    if (utils.canReceiveNotifications(user)) {
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

        logger.debug("send gsm push ...");

        try {
            response = await send(content, dryRun);
        } catch (err) {
            if (err.code == "messaging/registration-token-not-registered") {
                logger.info(`user ${user.uid} gcm_id not registered (${user.push.device.gcm_id})`);
                user.push.gcm_id_not_registered = true;
            } else if (err.code == "messaging/invalid-registration-token" || err.message == "The registration token is not a valid FCM registration token") {
                logger.info(`user ${user.uid} gcm_id invalid (${user.push.device.gcm_id})`);
                user.push.device.gcm_id = null;
            } else {
                logger.error("Problem to send a notification to " + user.uid + ": " + err);
            }
        }

    }
    await apiDb.save_user(user);

    if (response) {
        logger.debug("send gsm push ok : " + response);
        res.send({
            "code": "Ok",
            "message": "notification sent successfully",
        });
    } else {
        if (!properties.getMethod('push').notification) {
            logger.debug("Push notification is not activated. See properties/esup.json#methods.push.notification");
        }
        res.send({
            "code": "Ok",
            "message": "Notification is deactivated." + (properties.getMethod('push').pending ? " Launch Esup Auth app to authenticate." : ""),
        });
    }
}

function getText(req) {
    const ip = req.header('x-real-ip') || req.connection.remoteAddress;
    logger.debug("x-real-ip :" + req.header('x-real-ip'));
    logger.debug("Client ip is :" + ip);
    const geo = lookup?.(ip);
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
        user.push.timeout = 0;
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
    const bad_GCM_ID = !utils.isGcmIdValidAndRegistered(user);
    if (user.push.active && properties.getMethodProperty(req.params.method, 'activate') && ifTokenSecretsMatch(user, req) && Date.now() < user.push.validity_time) {
        res.send({
            "code": "Ok",
            "message": user.push.text,
            "text": user.push.text,
            "action": 'auth',
            "lt": user.push.lt,
            "bad_GCM_ID": bad_GCM_ID,
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
        res.send({
            "code": "Ok",
            "bad_GCM_ID": bad_GCM_ID,
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
    const http = req.header("x-forwarded-proto") || 'http';
    const host = req.header("x-forwarded-host")?.replace(/,.*/, '') || req.header('host');
    return http + '://' + host;
}
// generation of tokenSecret sent to the client, edited by mbdeme on June 2020

export async function confirm_user_activate(user, req, res) {
    if (user.push.activation_code != null && user.push.activation_fail < properties.getMethod('push').nbMaxFails && !user.push.active && req.params.activation_code == user.push.activation_code && (utils.isGcmIdWellFormed(req.params.gcm_id) || properties.getMethod('push').pending)) {
        const deviceInfosFromUserAgent = await detector.detectAsync(`${req.params.platform} ${req.params.manufacturer} ${req.params.model}`);

        const token_secret = utils.generate_string_code(128);
        user.push.token_secret = token_secret;
        user.push.active = true;
        user.push.device.platform = deviceInfosFromUserAgent.os.name || req.params.platform || "AndroidDev";
        user.push.device.gcm_id = utils.isGcmIdWellFormed(req.params.gcm_id) ? req.params.gcm_id : null;
        user.push.gcm_id_not_registered = false;
        user.push.device.manufacturer = deviceInfosFromUserAgent.device.brand || req.params.manufacturer || "DevCorp";
        user.push.device.model = deviceInfosFromUserAgent.device.model || req.params.model || "DevDevice";
        user.push.activation_code = null;
        user.push.activation_fail = null;
        user.push.timeout = 0;
        await apiDb.save_user(user);
        sockets.emitManager('userPushActivate', { uid: user.uid });
        sockets.emitToManagers('userPushActivateManager', user.uid);
        const data = {
            "code": "Ok",
            "tokenSecret": token_secret,
        };
        await autoActivateTotpReady(user, res, data);
        await autoActivateEsupnfcReady(user, res, data);
        logger.debug(fileUtils.getFileNameFromUrl(import.meta.url) + " autoActivateTotpReady " + JSON.stringify(data));
        res.send(data);
    } else {
        let nbfail = user.push.activation_fail;
        nbfail = (nbfail || 0) + 1;
        user.push.activation_fail = nbfail;
        logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' App confirm activation fails for ' + user.uid + " (" + nbfail + ")");
        await apiDb.save_user(user);
        throw new errors.InvalidCredentialsError();
    }
}

function troncateGcmId(gcmId) {
    return gcmId?.substring(0, 10) + "***";
}

// refresh gcm_id when it is regenerated
export async function refresh_user_gcm_id(user, req, res) {
    const old_gcm_id = user.push.device.gcm_id;
    if (ifTokenSecretsMatch(user, req) && (!utils.isGcmIdWellFormed(old_gcm_id) || req.params.gcm_id == user.push.device.gcm_id)) {
        logger.debug("refresh old gcm_id : " + user.push.device.gcm_id + " with " + req.params.gcm_id_refreshed);
        user.push.device.gcm_id = req.params.gcm_id_refreshed;
        user.push.gcm_id_not_registered = false;
        await apiDb.save_user(user);
        res.send({
            "code": "Ok",
        });
        logger.log('archive', {
            message: [
                {
                    req,
                    action: 'refresh_push',
                    old_gcm_id: troncateGcmId(old_gcm_id),
                    new_gcm_id: troncateGcmId(user.push.device.gcm_id),
                }
            ]
        });
    } else {
        throw new errors.InvalidCredentialsError();
    }
}

// Checks whether the tokenSecret received is equal to the one generated, changed by mbdeme on June 2020

export async function accept_authentication(user, req, res) {
    const tokenSecret = checkTokenSecretAndLoginTicket("accept_authentication", user, req, res);

    sockets.emitCas(user.uid, 'userAuth', { "code": "Ok", "otp": user.push.code });
    res.send({
        "code": "Ok",
        "tokenSecret": tokenSecret
    });
    logger.debug("sockets.emitCas OK : otp = " + user.push.code);
}

export async function reject_authentication(user, req, res) {
    checkTokenSecretAndLoginTicket("reject_authentication", user, req, res);
    const previous_timeout = user.push.timeout;

    /**
     * 1 reject = 3 seconds
     * 2 rejects = 3*3 = 9 seconds
     * 3 rejects = 9*9 = 81s
     * 4 rejects = 81*81 = 6561 = 1h49
     */
    let new_timeout;
    if (previous_timeout) {
        new_timeout = previous_timeout * previous_timeout;
    } else {
        new_timeout = 3;
    }
    logger.warn(`user ${user.uid} rejected push notification. (timeout: ${new_timeout} seconds)`);

    user.push.timeout = new_timeout;
    user.push.last_rejection_date = Date.now();
    user.push.code = null;
    user.push.validity_time = null;
    await apiDb.save_user(user);

    res.send({
        "code": "Ok",
    });
}

function checkTokenSecretAndLoginTicket(methodName, user, req, res) {
    const tokenSecret = checkTokenSecret(methodName, user, req, res);
    if (req.params.loginTicket == user.push.lt) {
        logger.debug(methodName + " OK : lt = " + req.params.loginTicket);
        return tokenSecret;
    } else {
        logger.warn(user.uid + "'s lt doesn't match. req.params.loginTicket=" + req.params.loginTicket);
        throw new errors.UnvailableMethodOperationError();
    }
}

export function checkTokenSecret(methodName, user, req, res) {
    logger.debug(methodName + " ? " + user.push.token_secret + " VS " + req.params.tokenSecret);
    let tokenSecret = null;
    if (trustGcm_id == true && utils.isGcmIdWellFormed(user.push.device.gcm_id) && user.push.device.gcm_id == req.params.tokenSecret)
        tokenSecret = user.push.token_secret;
    if (user.push.token_secret == req.params.tokenSecret || tokenSecret != null) {
        return tokenSecret;
    } else {
        logger.warn(user.uid + "'s token_secret match. req.params.tokenSecret=" + req.params.tokenSecret);
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
    user.push.gcm_id_not_registered = false;
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
    user.push.timeout = 0;
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

async function alert_deactivate(user) {
    if (!utils.canReceiveNotifications(user)) {
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
    logger.debug(fileUtils.getFileNameFromUrl(import.meta.url) + ' user_desync: ' + user.uid);
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
