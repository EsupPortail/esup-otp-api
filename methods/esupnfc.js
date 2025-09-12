import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import * as fileUtils from '../services/fileUtils.js';
import * as errors from '../services/errors.js';
import { apiDb } from '../controllers/api.js';
import * as qrcode from 'qrcode';

import { logger, auditLogger } from '../services/logger.js';
import * as sockets from '../server/sockets.js';

export const name = "esupnfc";

export function locations(user, req, res) {
    if (user.esupnfc.active) {
        logger.debug("locations: [ESUP-OTP]");
        res.send(["ESUP-OTP"]);
    } else {
        logger.debug("locations: []");
        res.send([]);
    }
}

export function check_accept_authentication(req, res) {
    logger.debug("check_accept_authentication: ESUP-OTP");
    res.send("OK");
}

export async function accept_authentication(user, req, res) {
    logger.debug("accept_authentication: ESUP-OTP");
    user.esupnfc.code = utils.generate_digit_code(properties.getMethod('random_code').code_length);
    let validity_time = properties.getMethod('esupnfc').validity_time * 60 * 1000;
    validity_time += new Date().getTime();
    user.esupnfc.validity_time = validity_time;
    await apiDb.save_user(user);
    sockets.emitCas(user.uid, 'userAuth', { "code": "Ok", "otp": user.esupnfc.code });
    logger.debug("sockets.emitCas OK : otp = " + user.esupnfc.code);
    res.send({
        "code": "Ok",
        "message": properties.getMessage('success', 'valid_credentials')
    });
}

export function send_message(user, req, res) {
    logger.debug("send_message: ESUP-OTP");
    //res.send("<h1>Code :</h1><p>" + user.esupnfc.code + "</p>");
    // autologin
    res.send("");
}

const serverInfos = properties.getMethod('esupnfc').server_infos;
let serverInfosWithQrCode;

if (serverInfos) {
    serverInfosWithQrCode = {
        ...serverInfos,
        qrCode: await qrcode.toString(JSON.stringify(serverInfos), { type: "svg" }),
    }
}

export async function getServerInfos(req, res) {
    if (!serverInfos) {
        res.send({
            "code": "Ko"
        })
    }
    else if (req.query.requireQrCode) {
        res.send({
            "code": "Ok",
            server_infos: serverInfosWithQrCode,
        });
    } else {
        res.send({
            "code": "Ok",
            server_infos: serverInfos,
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
    user.esupnfc.internally_activated = true;
    await apiDb.save_user(user);
    res.status(200);
    res.send({
        "code": "Ok",
    });
}

export async function autoActivateEsupnfcReady(user, res, data) {
    if (serverInfos && properties.getMethodProperty('esupnfc', 'activate') && properties.getMethodProperty('esupnfc', 'autoActivateWithPush')) {
        data.autoActivateEsupnfc = true;
        data.esupnfc_server_infos = serverInfos;
        logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + " autoActivateEsupnfcReady " + user.uid);
    }
    else {
        data.autoActivateEsupnfc = false;
        logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + " autoActivateEsupnfcReady is false");
    }
}

export async function autoActivateWithPush(user, req, res) {
    if (properties.getMethodProperty('esupnfc', 'activate') && properties.getMethodProperty('esupnfc', 'autoActivateWithPush')) {
        await user_activate(user, req, res);
        auditLogger.info({
            message: [
                {
                    req,
                    action: 'autoActivateWithPush',
                }
            ]
        });
    }
    else res.send({
        "code": "Ko",
    })
}

export function confirm_user_activate(user, req, res) {
    throw new errors.UnvailableMethodOperationError();
}

export async function user_deactivate(user, req, res) {
    user.esupnfc.active = false;
    await apiDb.save_user(user);
    res.status(200);
    res.send({
        "code": "Ok",
    });
}

export function user_desync(user, req, res) {
    throw new errors.UnvailableMethodOperationError();
}

/**
 * Indique si le code fourni correspond à celui généré
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function verify_code(user, req) {
    if (user.esupnfc.code == req.params.otp && Date.now() < user.esupnfc.validity_time) {
        user.esupnfc.code = null;
        user.esupnfc.validity_time = null;
        await apiDb.save_user(user);
        return true;
    } else {
        return false;
    }
}
