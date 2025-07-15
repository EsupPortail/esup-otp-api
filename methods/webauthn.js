import * as utils from '../services/utils.js';
import * as fileUtils from '../services/fileUtils.js';
import * as errors from '../services/errors.js';
import logger from '../services/logger.js';
import { apiDb, getCurrentTenantProperties } from '../controllers/api.js';

import * as SimpleWebAuthnServer from '@simplewebauthn/server';

export const name = "webauthn";

export async function user_activate(user, req, res) {
    user.webauthn.internally_activated = true;

    await apiDb.save_user(user);
    res.status(200);
    res.send({
        "code": "Ok",
    });
}

const pubkeyTypes = [ // https://www.iana.org/assignments/cose/cose.xhtml#algorithms
    { "type": "public-key", "alg": -  7 }, // ES256
    { "type": "public-key", "alg": -  8 }, // EdDSA
    { "type": "public-key", "alg": - 36 }, // ES512
    { "type": "public-key", "alg": - 37 }, // PS256
    { "type": "public-key", "alg": - 38 }, // PS384
    { "type": "public-key", "alg": - 39 }, // PS512
    { "type": "public-key", "alg": -257 }, // RS256
    { "type": "public-key", "alg": -258 }, // RS384
    { "type": "public-key", "alg": -259 }, // RS512
]

/**
    * This function creates a nonce and sends it to the user.
    * This nonce should be signed and then sent back for 
    * validation, in confirm_user_activate or verify_webauthn_auth.
    *
    * It also automatically invalidates any previous nonce,
    * by just overriding it.
    *
    */
export async function generate_method_secret(user, req, res) {
    const { relying_party } = await getWebauthnProperties(req);
    const nonce = utils.bufferToBase64URLString(utils.generate_u8array_code(128));

    user.webauthn.registration.nonce = nonce;
    user.webauthn.registration.nonce_date = Date.now();

    await apiDb.save_user(user);
    res.status(200);
    res.send({
        nonce: nonce,
        auths: user.webauthn.authenticators,
        user_id: user.uid,
        rp: relying_party,
        pubKeyTypes: pubkeyTypes,
    });
}

/**
    * This function validates the signed nonce.
    */
export async function confirm_user_activate(user, req, res) {
    if (user.webauthn.internally_activated === false) {
        res.status(403);
        res.send({
            message: "Please activate the method before accessing this endpoint."
        });
        return;
    }

    if (!user.webauthn.registration.nonce) {
        res.status(403);
        res.send({
            message: "Cannot confirm method without first generating a challenge."
        });
        return;
    }

    if (!req.body) {
        res.status(400); // bad request payload
        res.send({
            message: "You need to send a signed challenge from the server.",
        });
        return;
    }

    const nonceDate = user.webauthn.registration.nonce_date;
    const nowDate = Date.now();
    // 60 seconds
    if (nowDate - nonceDate >= 1000 * 60) {
        // 422 Unprocessable content : payload is correct but cannot process (timed out here)
        res.status(422);
        res.send({
            message: "Your nonce timed out. Try generating another."
        });
        return;
    }

    const { relying_party, allowed_origins } = await getWebauthnProperties(req);

    let verification;
    try {
        verification = await SimpleWebAuthnServer.verifyRegistrationResponse({
            response: req.body.cred,
            expectedChallenge: user.webauthn.registration.nonce,
            expectedOrigin: allowed_origins,
            expectedRPID: relying_party.id,
            requireUserVerification: false,
        });
    }
    catch (error) {
        logger.error(error);
        res.status(400);
        res.send({ error: error.message, isVerifyResponseFail: true });
        return;
    }

    let status = 400;
    let registered = false;

    if (verification.verified) {
        // remove the nonce from memory
        user.webauthn.registration.nonce = null;
        user.webauthn.registration.nonce_date = null;

        const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

        // PREPEND the new authenticator
        user.webauthn.authenticators.push({
            credentialID: utils.bufferToBase64URLString(credentialID),
            credentialPublicKey: utils.bufferToBase64URLString(credentialPublicKey),
            counter,
            name: req.body.cred_name
        });

        status = 200;
        registered = true;

        logger.log('archive', {
            message: [
                {
                    req,
                    action: 'authenticator_created',
                    method: req.params.method,
                    name: req.body.cred_name,
                }
            ]
        });
    }

    await apiDb.save_user(user);
    res.status(status);
    res.send({ registered });
}

export async function delete_method_special(user, req, res) {
    const { index, authenticator } = findAuthenticatorsById(user, req.params.authenticator_id, true);

    user.webauthn.authenticators.splice(index, 1);

    logger.log('archive', {
        message: [
            {
                req,
                action: 'authenticator_deleted',
                method: req.params.method,
                name: authenticator.name,
            }
        ]
    });

    await apiDb.save_user(user);
    res.status(200);
    res.send({});
}

/**
 * example : const { index, authenticator } = findAuthenticatorsById(user, req.params.authenticator_id);
 * 
 * @returns {{ index: number, authenticator: object }}
 */
function findAuthenticatorsById(user, id, throwExceptionIfNotFound, errorMessage) {
    const ret = {
        index: user.webauthn.authenticators.findIndex(authenticator => authenticator.credentialID === id),
        authenticator: null
    };

    if (ret.index !== -1) {
        ret.authenticator = user.webauthn.authenticators[ret.index];
    } else if (throwExceptionIfNotFound === true) {
        throw new errors.EsupOtpApiError(404, errorMessage || "Unknown credential id");
    }

    return ret;
}

/**
 * rename the given factor
 */
export async function change_method_special(user, req, res) {
    const { authenticator } = findAuthenticatorsById(user, req.params.authenticator_id, true);

    const old_name = authenticator.name;

    authenticator.name = req.body.name.trim();

    logger.log('archive', {
        message: [
            {
                req,
                action: 'authenticator_renamed',
                method: req.params.method,
                old_name,
                new_name: authenticator.name,
            }
        ]
    });

    await apiDb.save_user(user);
    res.status(200);
    res.send({});
}

/**
    * This function verifies you passed the correct otp
    */
export async function verify_code(user, req) {
    if (user.webauthn.registration.logged_in_otp === req.params.otp && Date.now() < user.webauthn.registration.logged_in_otp_validity_time) {
        user.webauthn.registration.logged_in_otp = null;
        user.webauthn.registration.logged_in_otp_validity_time = null;
        await apiDb.save_user(user);
        return true;
    }
    return false
}


/**
 * Vérifie que le facteur fourni est valide. Génère un code à envoyer via CAS
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function verify_webauthn_auth(user, req, res) {
    logger.debug(fileUtils.getFileNameFromUrl(import.meta.url) + " verify_code: " + user.uid);

    const response = req.body.response;
    const credID = req.body.credID;

    const { index, authenticator } = findAuthenticatorsById(user, credID, true, "Please use a valid, previously-registered authenticator.");

    const uint8a = (base64url_of_buffer) => new Uint8Array(utils.base64URLStringToBuffer(base64url_of_buffer));

    const { relying_party, allowed_origins } = await getWebauthnProperties(req);

    let verification;
    try {
        verification = await SimpleWebAuthnServer.verifyAuthenticationResponse({
            response,
            expectedChallenge: user.webauthn.registration.nonce,
            expectedOrigin: allowed_origins,
            expectedRPID: relying_party.id,
            requireUserVerification: false, //?
            authenticator: {
                counter: authenticator.counter,
                credentialID: uint8a(authenticator.credentialID),
                credentialPublicKey: uint8a(authenticator.credentialPublicKey),
            }
        });
    } catch (error) {
        logger.error(error);
        logger.error(error.cause);
        logger.error(error.message);

        let error_payload = {
            message: error.message
        };

        if (error.message.includes("Unexpected authentication response origin")) {
            // sample input :
            // Error: Unexpected authentication response origin "http://localhost:8080", expected "http://localhost"

            const split = error.message.split('"');
            // split = ['Error: Unexpected authentication response origin ', 'http://localhost:8080', ' expected ', 'http://localhost']
            const got_host = split[1];
            const expected_host = split[3];

            error_payload = {
                message: {
                    title: "L'adresse de cette page est différente de celle attendue par le serveur",
                    desc: `Vous vous trouvez actuellement sur le domaine <b>${got_host}</b>, alors que le serveur s'attendait à ce que vous soyez sur le domaine, <b>${expected_host}</b>.<br>Vous êtes peut-être en train de subir une tentative de <a href="https://fr.wikipedia.org/wiki/Hame%C3%A7onnage">phishing</a>. Pensez à changer votre mot de passe si vous avez un doute, et n'hésitez pas à contacter un administrateur réseau.`,
                    // "unforgivable" means the UI should try to prevent the user from retrying
                    // unforgivable: true,
                }
            }
        }

        res.status(400);
        res.send(error_payload);
        return;
    }

    const { verified } = verification;

    if (!verified) {
        logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + " Invalid credentials by " + user.uid);
        throw new errors.InvalidCredentialsError();
    }

    // update counter
    authenticator.counter = verification.authenticationInfo.newCounter;

    // create a token for cas-server
    user.webauthn.registration.logged_in_otp = utils.generate_string_code(16);
    user.webauthn.registration.logged_in_otp_validity_time = Date.now() + 30 * 1000;

    await apiDb.save_user(user);
    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + " Valid credentials by " + user.uid);
    res.status(200);
    res.send({ token: user.webauthn.registration.logged_in_otp });
}

export async function user_deactivate(user, req, res) {
    user.webauthn.internally_activated = false;
    user.webauthn.registered = false;
    await apiDb.save_user(user);
    res.send({
        code: "Ok",
        message: "Deactivated webauthn"
    });
}

async function getWebauthnProperties(req) {
    const tenant = await getCurrentTenantProperties(req);
    return tenant.webauthn;
}
