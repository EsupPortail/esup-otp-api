/**
 * Created by abousk01 on 20/07/2016.
 */
import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import * as errors from '../services/errors.js';
import { apiDb } from '../controllers/api.js';

import { getInstance } from '../services/logger.js';
const logger = getInstance();
import FCM from 'fcm-node';
import qrCode from 'qrcode-npm';
import * as sockets from '../server/sockets.js';
import geoip from "geoip-lite";
import DeviceDetector from "node-device-detector";
import { promisify } from 'util';
import { autoActivateTotpReady } from './totp.js';

const trustGcm_id = properties.getMethod('push').trustGcm_id;

// Set up the sender with you API key, prepare your recipients' registration tokens.
const proxyUrl = properties.getEsupProperty('proxyUrl');
const fcm = new FCM(properties.getMethodProperty('push', 'serverKey'), proxyUrl);
const send = promisify(fcm.send).bind(fcm);

export const name = "push";

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

    const content = {
        notification: {
            title: properties.getMethod('push').title,
            body: properties.getMethod('push').body,
            "click_action": "com.adobe.phonegap.push.background.MESSAGING_EVENT"
        },
        data: {
            message: getText(req),
            text: getText(req),
            action: 'auth',
            trustGcm_id: trustGcm_id,
            url: getUrl(req),
            uid: user.uid,
            lt: lt
        },
        to: user.push.device.gcm_id
    };


    await apiDb.save_user(user);
    if (properties.getMethod('push').notification) {
        logger.debug("send gsm push ...");
        return send(content)
            .catch((err) => {
                logger.error("Problem to send a notification to " + user.uid + ": " + err);
                res.send({
                    "code": "Error",
                    "message": JSON.stringify(err)
                });
            }).then((response) => {
                if (response.failure > 0) {
                    logger.debug(response);
                    if (response.results[0].error == "NotRegistered") {
                        return user_unactivate(user, req, res);
                    }
                } else {
                    logger.debug("send gsm push ok : " + response);
                    res.send({
                        "code": "Ok",
                        "message": response
                    });
                }
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
    const geo = geoip.lookup(ip);
    logger.debug("Client geoip is :" + JSON.stringify(geo));
    const city = geo != null ? geo.city : null;

    let text = properties.getMethod('push').text1;
    if (city != null)
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

export function pending(user, req, res) {
    if (user.push.active && properties.getMethodProperty(req.params.method, 'activate') && req.params.tokenSecret == user.push.token_secret && Date.now() < user.push.validity_time) {
        res.send({
            "code": "Ok",
            "message": getText(req),
            "text": getText(req),
            "action": 'auth',
            "lt": user.push.lt
        });
    }
    else if (req.params.tokenSecret == user.push.token_secret && !user.push.active) {
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
    const qr = qrCode.qrcode(10, 'M');
    qr.addData(getUrl(req) + '/users/' + user.uid + '/methods/push/' + activation_code);
    qr.make();
    await apiDb.save_user(user);
    res.send({
        "code": "Ok",
        "message1": properties.getMessage('success', 'push_confirmation1'),
        "message2": properties.getMessage('success', 'push_confirmation2'),
        "message3": properties.getMessage('success', 'push_confirmation3'),
        "message4": properties.getMessage('success', 'push_confirmation4'),
        "message5": properties.getMessage('success', 'push_confirmation5'),
        "qrCode": qr.createImgTag(4),
        "activationCode": activation_code
    });
}

function getUrl(req) {
    const http = req.headers["x-forwarded-proto"] || 'http';
    const host = req.headers["x-forwarded-host"]?.replace(/,.*/, '') || req.headers.host;
    return http + '://' + host;
}
// generation of tokenSecret sent to the client, edited by mbdeme on June 2020

export async function updateDeviceModelToUserFriendlyName(user) {
    const oldDeviceCode = user.push.device.model;
    if (oldDeviceCode) {
        const device = detector.parseDevice(oldDeviceCode, { device: { model: oldDeviceCode } });
        const newDeviceName = device.model;
        if (newDeviceName && newDeviceName != oldDeviceCode) {
            user.push.device.model = newDeviceName;
            await apiDb.save_user(user);
            const data = { uid: user.uid, oldDeviceCode: oldDeviceCode, newDeviceName: newDeviceName };
            logger.info('updateDeviceModelToUserFriendlyName ' + JSON.stringify(data));
        }
    }
}

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
        if (nbfail != null && nbfail != undefined) {
            nbfail++;
        }
        else {
            nbfail = 1;
        }
        user.push.activation_fail = nbfail;
        logger.info(utils.getFileNameFromUrl(import.meta.url) + ' App confirm activation fails for ' + user.uid + " (" + nbfail + ")");
        await apiDb.save_user(user);
        throw new errors.InvalidCredentialsError();
    }
}

// refresh gcm_id when it is regenerated
export async function refresh_user_gcm_id(user, req, res) {
    if (req.params.tokenSecret == user.push.token_secret && req.params.gcm_id == user.push.device.gcm_id) {
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

export async function user_deactivate(user, req, res) {
    if (properties.getMethod('push').notification)
        alert_deactivate(user);
    user.push.active = false;
    user.push.activation_code = null;
    user.push.device.platform = "";
    user.push.device.gcm_id = "";
    user.push.device.manufacturer = "";
    user.push.device.model = "";
    user.push.device.phone_number = "";
    await apiDb.save_user(user);
    res.status(200);
    res.send({
        "code": "Ok",
    });
}

async function user_unactivate(user, req, res) {
    user.push.active = false;
    user.push.device.platform = "";
    user.push.device.gcm_id = "";
    user.push.device.manufacturer = "";
    user.push.device.model = ""
    user.push.device.phone_number = "";
    await apiDb.save_user(user);
    throw new errors.PushNotRegisteredError();
}

function alert_deactivate(user) {
    const content = {
        notification: {
            title: "Esup Auth",
            body: "Les notifications push ont été désactivées pour votre compte",
            "click_action": "com.adobe.phonegap.push.background.MESSAGING_EVENT"
        },
        data: {
            message: "Les notifications push ont été désactivées pour votre compte",
            text: "Les notifications push ont été désactivées pour votre compte",
            action: 'desync'
        },
        to: user.push.device.gcm_id
    };
    return send(content)
        .catch((err) => {
            logger.error("Problem to send a notification for deactivate push: " + err);
        });
}

export async function user_desync(user, req, res) {
    logger.debug(utils.getFileNameFromUrl(import.meta.url) + ' user_desync: ' + user.uid);
    if (req.params.tokenSecret == user.push.token_secret) {
        user.push.active = false;
        user.push.device.platform = "";
        user.push.token_secret = "";
        user.push.device.phone_number = "";

        return Promise.all([
            apiDb.save_user(user),
            sockets.emitManager('userPushDeactivate', { uid: user.uid })
        ]).then(() => {
            res.status(200);
            res.send({
                "code": "Ok",
            });
        });
    } else {
        res.send({
            "code": "Error",
            "message": "tokenSecret"
        });
    }
}