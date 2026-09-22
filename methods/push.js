/**
 * Created by abousk01 on 20/07/2016.
 */
import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import * as fileUtils from '../services/fileUtils.js';
import * as errors from '../services/errors.js';
import { apiDb } from '../controllers/api.js';
import { getPushDevices, syncLegacyPushFields } from '../services/pushDevices.js';

import { logger, auditLogger } from '../services/logger.js';
import admin from "firebase-admin";
import { HttpsProxyAgent } from "https-proxy-agent";
import * as sockets from '../server/sockets.js';

/** 
 * @type {import('ip-location-api').lookup} 
 */
let lookup;
let firebaseSendForTests;

import DeviceDetector from "node-device-detector";
import { autoActivateTotpReady } from './totp.js';
import { autoActivateEsupnfcReady } from './esupnfc.js';

const MOBILE_DEVICE_TYPE = 'mobile';
const BROWSER_DEVICE_TYPE = 'browser';
const DEFAULT_MAX_DEVICES = 1;


function initFirebaseAdmin() {
    const proxyUrl = properties.getEsupProperty('proxyUrl');
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

function getPushProperties() {
    return properties.getMethod('push');
}

// Firebase is initialized lazily so tests can inject a fake sender before any
// real Firebase Admin app is created.
function getFirebaseSend() {
    if (firebaseSendForTests) {
        return firebaseSendForTests;
    }

    if (!admin.apps.length && getPushProperties().serviceAccount?.private_key) {
        initFirebaseAdmin();
    }

    return admin.apps.length ? admin.messaging().send.bind(admin.messaging()) : null;
}

export function setFirebaseSendForTests(send) {
    firebaseSendForTests = send;
}

function getMaxDevices() {
    return getPushProperties().max_devices || DEFAULT_MAX_DEVICES;
}

function areBrowserDevicesAllowed() {
    return getPushProperties().allow_browser_devices === true;
}

function isMobileDevice(device) {
    return (device?.type || MOBILE_DEVICE_TYPE) === MOBILE_DEVICE_TYPE;
}

function isBrowserDevice(device) {
    return device?.type === BROWSER_DEVICE_TYPE;
}

function canReceivePushNotifications(device) {
    return getPushProperties().notification
        && utils.isGcmIdWellFormed(device?.gcm_id)
        && !device.gcm_id_not_registered
        && !device.invalid_gcm_id;
}

function findPushDevice(user, credential) {
    return getPushDevices(user).find(device =>
        utils.stringTimingSafeEqual(device.token_secret, credential)
        || (getPushProperties().trustGcm_id === true
            && utils.isGcmIdWellFormed(device.gcm_id)
            && utils.stringTimingSafeEqual(device.gcm_id, credential))
    );
}

function ensurePushTransports(user) {
    const allowedTransports = getPushProperties().transports || [];
    user.push.transports = Array.from(new Set([...(user.push.transports || []), ...allowedTransports]));
}

// Browser FCM messages are data-only so the service worker can build the
// notification and handle accept/reject actions. Mobile apps still receive the
// legacy notification payload expected by Esup Auth.
function buildAuthMessage(user, req, device) {
    const data = {
        message: user.push.text,
        text: user.push.text,
        action: 'auth',
        trustGcm_id: getPushProperties().trustGcm_id?.toString(),
        url: getUrl(req),
        uid: user.uid,
        lt: user.push.lt
    };

    if (isBrowserDevice(device)) {
        return {
            data: {
                ...data,
                title: getPushProperties().title,
                body: getPushProperties().body,
            },
            token: device.gcm_id
        };
    }

    return {
        notification: {
            title: getPushProperties().title,
            body: getPushProperties().body,
        },
        android: {
            notification: {
            }
        },
        data,
        token: device.gcm_id
    };
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
    validity_time += Date.now();
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
    
    const devices = getPushDevices(user).filter(canReceivePushNotifications);
    logger.debug(`push send_message: ${devices.length} device(s) can receive notifications for ${user.uid}`);

    if (devices.length) {
        const send = getFirebaseSend();
        if (!send) {
            logger.error('Problem to send a push notification: firebase-admin is not initialized');
        }

        // One authentication request is broadcast to every registered endpoint.
        // The login flow only needs one successful response to unlock the CAS
        // session, but failed tokens are marked so they stop being retried.
        const responses = await Promise.all(devices.map(async device => {
            try {
                return await send?.(buildAuthMessage(user, req, device), dryRun);
            } catch (err) {
                if (err.code == "messaging/registration-token-not-registered") {
                    logger.info(`user ${user.uid} gcm_id not registered (${troncateGcmId(device.gcm_id)})`);
                    device.gcm_id_not_registered = true;
                } else if (err.code == "messaging/invalid-registration-token" || err.message == "The registration token is not a valid FCM registration token") {
                    logger.info(`user ${user.uid} invalid gcm_id (${troncateGcmId(device.gcm_id)})`);
                    device.invalid_gcm_id = true;
                } else {
                    logger.error("Problem to send a notification to " + user.uid + ": " + err);
                }
                return false;
            }
        }));

        response = responses.some(Boolean);
    }

    syncLegacyPushFields(user);
    await apiDb.save_user(user);

    if (response) {
        logger.debug("send push ok : " + response);
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
    const ip = utils.getIpAddr(req);
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
    if (utils.stringTimingSafeEqual(user.push.code, req.params.otp) && Date.now() < user.push.validity_time) {
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
    return Boolean(findPushDevice(user, req.params.tokenSecret));
}

export function pending(user, req, res) {
    const device = findPushDevice(user, req.params.tokenSecret);
    const bad_GCM_ID = !canReceivePushNotifications(device);
    const body = {
        code: "Ok",
        bad_GCM_ID: bad_GCM_ID,
    }

    if (bad_GCM_ID && device?.gcm_id) {
        body.gcm_id = device.gcm_id;
    }
    
    if (user.push.active && properties.getMethodProperty(req.params.method, 'activate') && ifTokenSecretsMatch(user, req) && Date.now() < user.push.validity_time) {
        res.send({
            "message": user.push.text,
            "text": user.push.text,
            "action": 'auth',
            "lt": user.push.lt,
            ...body
        });
    }
    else if (!user.push.active || !device) {
        res.send({
            "code": "Ok",
            "message": "Les notifications push ont été désactivées pour votre compte",
            "text": "Les notifications push ont été désactivées pour votre compte",
            "action": 'desync'
        });
    }
    else {
        res.send(body);
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
    const apiHost = getUrl(req);
    const qrCodeUri = apiHost + '/users/' + user.uid + '/methods/push/' + activation_code;

    await apiDb.save_user(user);
    res.send({
        "code": "Ok",
        "message1": properties.getMessage('success', 'push_confirmation1'),
        "message2": properties.getMessage('success', 'push_confirmation2'),
        "message3": properties.getMessage('success', 'push_confirmation3'),
        "message4": properties.getMessage('success', 'push_confirmation4'),
        "message5": properties.getMessage('success', 'push_confirmation5'),
        "qrCode": await utils.generateQrCode(qrCodeUri, 260),
        "activationCode": activation_code,
        deepLink: utils.getDeepLink("push", { uid: user.uid, code: activation_code, host: apiHost }),
    });
}

function getUrl(req) {
    const http = req.header("x-forwarded-proto") || 'http';
    const host = req.header("x-forwarded-host")?.replace(/,.*/, '') || req.header('host');
    return http + '://' + host;
}

const esupAuth = {android: "https://play.google.com/store/apps/details?id=org.esupportail.esupAuth", ios: "https://apps.apple.com/fr/app/esup-auth/id1563904941"};
/**
 * If a user scans the push activation QR code without using the Esup Auth app, they will end up here.
 */
export function redirectToDeepLink(req, res) {
    const userAgent = req.userAgent();
    const mobile = /Android/i.test(userAgent) ? "android" :
                   /iPhone|iPad|iPod/i.test(userAgent) ? "ios" :
                   false;
    let htmlContent;
    
    if(mobile) {
        const deeplink = utils.getDeepLink("push", { uid: req.params.uid, code: req.params.tokenSecret, host: getUrl(req) })
        htmlContent = `
            Veuillez <strong>télécharger</strong> l'application <a href="${esupAuth[mobile]}" target="_blank">Esup Auth</a>.
            <br />Puis <strong><a href="${deeplink}">cliquez ici</a></strong>
        `;
    } else {
        htmlContent = `
            Veuillez télécharger l'application Esup-Auth sur <a href="${esupAuth.android}" target="_blank">Android</a> ou <a href="${esupAuth.ios}" target="_blank">IOS</a>.
            <br />Puis scannez le QR code depuis l'application.
        `;
    }

    const html = `
                <!DOCTYPE html><html><body>
                <p>${htmlContent}</p>
                </body></html>
            `;
    res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Length": Buffer.byteLength(html),
    });
    res.write(html);
    res.end();
    return;
}

export async function confirm_user_activate(user, req, res) {
    const activation_code = req.params.activation_code || req.body?.activation_code;
    const rawGcmId = req.params.gcm_id || req.body?.gcm_id;
    const gcm_id = utils.isGcmIdWellFormed(rawGcmId) ? rawGcmId : null;
    const requestedDeviceType = req.params.type || req.body?.type || req.body?.device_type || MOBILE_DEVICE_TYPE;
    const deviceType = requestedDeviceType === BROWSER_DEVICE_TYPE ? BROWSER_DEVICE_TYPE : MOBILE_DEVICE_TYPE;
    if (user.push.activation_code != null && user.push.activation_fail < properties.getMethod('push').nbMaxFails && utils.stringTimingSafeEqual(activation_code, user.push.activation_code) && (gcm_id || properties.getMethod('push').pending)) {
        if (deviceType === BROWSER_DEVICE_TYPE && !areBrowserDevicesAllowed()) {
            logger.warn(`user ${user.uid} tried to register a browser push device while browser devices are disabled`);
            throw new errors.EsupOtpApiError(403, 'L’enregistrement des navigateurs pour les notifications push est désactivé', 'BrowserPushDevicesDisabled');
        }

        let platform = req.params.platform || req.body?.platform;
        let manufacturer = req.params.manufacturer || req.body?.manufacturer;
        let model = req.params.model || req.body?.model;

        if (deviceType === MOBILE_DEVICE_TYPE) {
            // Esup Auth on iOS now sends the commercial name of the device (and no longer its code name)
            if (manufacturer !== "Apple" || model?.includes(",")) {
                const deviceInfosFromUserAgent = await detector.detectAsync(`${platform} ${manufacturer} ${model}`);
                platform = deviceInfosFromUserAgent.os.name || platform;
                manufacturer = deviceInfosFromUserAgent.device.brand || manufacturer;
                model = deviceInfosFromUserAgent.device.model || model;
            }

            if (platform === "ios") {
                platform = "iOS";
            }
        }

        // token_secret is the per-device shared secret used later to accept,
        // reject, refresh or delete this exact push endpoint.
        const token_secret = utils.generate_string_code(128);
        const devices = getPushDevices(user);
        let device = devices.find(item => gcm_id && utils.stringTimingSafeEqual(item.gcm_id, gcm_id));
        if (!device) {
            if (devices.length >= getMaxDevices()) {
                logger.warn(`user ${user.uid} tried to register more than ${getMaxDevices()} push devices`);
                throw new errors.EsupOtpApiError(403, 'Nombre maximum de terminaux push atteint', 'MaxPushDevicesReached');
            }
            devices.push({});
            device = devices[devices.length - 1];
        }

        device.type = deviceType;
        device.platform = platform || (isBrowserDevice(device) ? "Web" : "AndroidDev");
        device.gcm_id = gcm_id;
        device.gcm_id_not_registered = false;
        device.invalid_gcm_id = !Boolean(gcm_id);
        device.manufacturer = manufacturer || (isBrowserDevice(device) ? "Browser" : "DevCorp");
        device.model = model || (isBrowserDevice(device) ? "Browser" : "DevDevice");
        device.token_secret = token_secret;
        user.push.activation_code = null;
        user.push.activation_fail = null;
        user.push.timeout = 0;
        ensurePushTransports(user);
        syncLegacyPushFields(user);

        await apiDb.save_user(user);
        sockets.emitManager(req, 'userPushActivate', { uid: user.uid });
        const data = {
            "code": "Ok",
            "tokenSecret": token_secret,
            "hostName": properties.getMethod('push').title,
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
    const device = findPushDevice(user, req.params.tokenSecret);
    const old_gcm_id = device?.gcm_id;
    if (device && (!utils.isGcmIdWellFormed(old_gcm_id) || utils.stringTimingSafeEqual(req.params.gcm_id, old_gcm_id))) {
        logger.debug("refresh old gcm_id : " + old_gcm_id + " with " + req.params.gcm_id_refreshed);
        device.gcm_id = req.params.gcm_id_refreshed;
        device.gcm_id_not_registered = false;
        device.invalid_gcm_id = false;
        syncLegacyPushFields(user);
        await apiDb.save_user(user);
        res.send({
            "code": "Ok",
        });
        auditLogger.info({
            message: [
                {
                    req,
                    action: 'refresh_push',
                    old_gcm_id: troncateGcmId(old_gcm_id),
                    new_gcm_id: troncateGcmId(device.gcm_id),
                }
            ]
        });
    } else {
        throw new errors.InvalidCredentialsError();
    }
}

export async function accept_authentication(user, req, res) {
    const tokenSecret = checkTokenSecretAndLoginTicket("accept_authentication", user, req, res);

    sockets.emitUserAuth(user.uid, user.push.code);
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

// Accept/reject requests must prove they come from one registered endpoint.
// We check token_secret for normal operation; trustGcm_id keeps the former
// gcm_id-based behavior only when the instance explicitly enables it.
function checkTokenSecretAndLoginTicket(methodName, user, req, res) {
    const tokenSecret = checkTokenSecret(methodName, user, req, res);
    if (utils.stringTimingSafeEqual(req.params.loginTicket, user.push.lt)) {
        logger.debug(methodName + " OK : lt = " + req.params.loginTicket);
        return tokenSecret;
    } else {
        logger.warn(user.uid + "'s lt doesn't match. req.params.loginTicket=" + req.params.loginTicket);
        throw new errors.UnvailableMethodOperationError();
    }
}

export function checkTokenSecret(methodName, user, req, res) {
    const device = findPushDevice(user, req.params.tokenSecret);
    logger.debug(methodName + " ? push device found = " + Boolean(device));
    if (device) {
        return device.token_secret;
    } else {
        logger.warn(user.uid + "'s token_secret match. req.params.tokenSecret=" + req.params.tokenSecret);
        throw new errors.UnvailableMethodOperationError();
    }
}

async function clearUserPush(user, req, res) {
    user.push.devices = [];
    user.push.active = false;
    user.push.gcm_id_not_registered = false;
    user.push.invalid_gcm_id = false;
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
        await alert_deactivate(user, req);
    await clearUserPush(user, req, res);
    res.status(200);
    res.send({
        "code": "Ok",
    });
}

async function alert_deactivate(user, req) {
    const devices = getPushDevices(user).filter(canReceivePushNotifications);
    if (!devices.length) {
        return;
    }

    const data = {
        message: "Les notifications push ont été désactivées pour votre compte",
        text: "Les notifications push ont été désactivées pour votre compte",
        action: 'desync',
        url: getUrl(req),
        uid: user.uid,
    };

    await Promise.all(devices.map(async device => {
        const content = isBrowserDevice(device)
            ? { data: { ...data, title: "Esup Auth", body: data.message }, token: device.gcm_id }
            : {
                notification: {
                    title: "Esup Auth",
                    body: data.message,
                },
                android: {
                    notification: {
                    }
                },
                data,
                token: device.gcm_id
            };

        try {
            await getFirebaseSend()?.(content);
        } catch (err) {
            logger.info(`Problem to send a notification to ${user.uid} for deactivate push: ${err}`);
        }
    }));
}

export async function user_desync(user, req, res) {
    logger.debug(fileUtils.getFileNameFromUrl(import.meta.url) + ' user_desync: ' + user.uid);
    if (user.push.active && ifTokenSecretsMatch(user, req)) {
        // A desync request comes from one endpoint, so only that endpoint is
        // removed. Other phones must keep working.
        const remainingDevices = getPushDevices(user).filter(device =>
            !utils.stringTimingSafeEqual(device.token_secret, req.params.tokenSecret)
            && !utils.stringTimingSafeEqual(device.gcm_id, req.params.tokenSecret)
        );
        user.push.devices = remainingDevices;
        syncLegacyPushFields(user);

        await Promise.all([
            apiDb.save_user(user),
            sockets.emitManager(req, 'userPushDeactivate', { uid: user.uid })
        ]);
    }
    res.status(200);
    res.send({
        "code": "Ok",
    });
}

export async function delete_method_special(user, req, res) {
    const deviceId = req.params.authenticator_id;
    const devices = getPushDevices(user);
    // The manager receives only a hash of token_secret, never the secret itself.
    const device = devices.find(item => item.token_secret && utils.stringTimingSafeEqual(utils.hash(item.token_secret), deviceId));

    if (!device) {
        throw new errors.InvalidCredentialsError();
    }

    user.push.devices = devices.filter(item => item !== device);
    syncLegacyPushFields(user);

    await apiDb.save_user(user);
    sockets.emitManager(req, 'userPushDeactivate', { uid: user.uid });

    res.status(200);
    res.send({
        "code": "Ok",
    });
}
