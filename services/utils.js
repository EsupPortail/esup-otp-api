import * as properties from '../properties/properties.js';
import CryptoJS from 'crypto-js';
import crypto from 'crypto';
import { logger } from '../services/logger.js';
import * as qrcode from 'qrcode';
import proxyAddr from 'proxy-addr';


export function getIpAddr(req) {
    return proxyAddr(req, properties.getEsupProperty("trustedProxies"));
}

export function get_hash(uid, users_secret) {
    const d = new Date();
    const d2 = new Date();

    const present_salt=d.getUTCDate()+d.getUTCHours().toString();
    //calcul de la date - 1h (3600000 millisecondes)
    d2.setTime(d.getTime()-3600000);
    const past_salt=d2.getUTCDate()+d2.getUTCHours().toString();

    //calcul de la date + 1h
    d2.setTime(d.getTime()+3600000);
    const next_salt=d2.getUTCDate()+d2.getUTCHours().toString();

    logger.debug("past_salt,present_salt,next_salt :"+past_salt+","+present_salt+","+next_salt);

    const present_hash = CryptoJS.SHA256(CryptoJS.MD5(users_secret).toString()+uid+present_salt).toString();
    const next_hash = CryptoJS.SHA256(CryptoJS.MD5(users_secret).toString()+uid+next_salt).toString();
    const past_hash = CryptoJS.SHA256(CryptoJS.MD5(users_secret).toString()+uid+past_salt).toString();

    const hashes = [past_hash, present_hash, next_hash];

    logger.debug("hashes for "+uid+": "+hashes);

    return hashes;
}

export function cover_transport(transport, transport_name) {
    if (!transport) {
        return;
    }

    if (transport_name === "sms") {
        return cover_sms(transport);
    } else {
        return cover_mail(transport);
    }
}

export function cover_mail(mail) {
    return cover_string(mail, 4, 5);
}

export function cover_sms(sms) {
    return cover_string(sms, 2, 2);
}

function cover_string(str, start, end) {
    if (!str) return str;
    if (str.length <= (start + end)) return str;
    const start_str = str.substr(0, start);
    const end_str = str.substr(str.length - (end + 1), str.length - 1);
    let middle_str = '';
    for (let i = 0; i < str.length - (start + end); i++) {
        middle_str += '*';
    }
    return start_str + middle_str + end_str;
}

/**
 * @param {Number} code_length
 * @param {String} type
 * @returns if code_length === "digit" return a digit code, otherwise return a string code
 */
export function generate_code_of_type(code_length, code_type) {
        switch (code_type) {
            case "digit":
                return generate_digit_code(code_length);
            default:
                return generate_string_code(code_length);
        }
}

export function generate_string_code(code_length) {
    return crypto.randomBytes(code_length / 2).toString('hex');
}

export function generate_digit_code(code_length) {
    const max = Math.pow(10, code_length);
    const intValue = crypto.randomInt(max);
    return intValue.toString().padStart(code_length, '0');
}

export function generate_base64url_code(code_length) {
    return crypto.randomBytes(code_length)
        .toString('base64url')
        .slice(0, code_length);
}

/**
 * @type {String} url
 * @returns image with html tag
 */
export async function generateQrCode(url, size = 164) {
    const imageUrl = await qrcode.toDataURL(url, { width: size });
    return `<img src='${imageUrl}' width='${size}' height='${size}'>`;
}

/**
 * @param {String} method 
 * @param {Object} params  
 * @example
 * // return "esupauth://app/auth/push?uid=toto&code=123456&host=https://esup-otp-api.example.com"
 * getDeepLink("push", { uid: "toto", code: 1234, host: "https://esup-otp-api.example.com" })
 */
export function getDeepLink(method, params) {
    return undefined;
    // return `esupauth://app/auth/${method}?${new URLSearchParams(params)}`;
}

export function isGcmIdWellFormed(gcm_id) {
    return gcm_id && gcm_id != "undefined";
}

export function isGcmIdValidAndRegistered(user) {
    return isGcmIdWellFormed(user.push.device.gcm_id) && !user.push.gcm_id_not_registered && !user.push.invalid_gcm_id;
}

export function canReceiveNotifications(user) {
    return properties.getMethod('push').notification && isGcmIdValidAndRegistered(user);
}

export function generate_u8array_code(nonce_length) {
    return crypto.randomBytes(nonce_length).buffer;
}

const smsRegex = new RegExp("^((0[67](([.]|[-]|[ ])?[0-9]){8})|((00|[+])(([.]|[-]|[ ])?[0-9]){7,15}))$");
// eslint-disable-next-line no-useless-escape
const defaultRegex = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
export function check_transport_validity(transport, value){
    const reg = (transport == 'sms') ? smsRegex : defaultRegex;
    return reg.test(value);
}

export function get_auth_bearer(headers) {
    return (headers.authorization?.match(/^Bearer (.*)/) || [])[1]
}

/**
 * @returns if a and b are equals and truthy (i.e non null / empty / undefined)
 */
export function equalsAndtruthy(a, b) {
    return a && a == b;
}

export function hash(str, alg = "sha256", encoding = "base64url") {
    if (crypto.hash) { // since v20.12.0, v21.7.0 https://nodejs.org/api/crypto.html#cryptohashalgorithm-data-options
        return crypto.hash(alg, str, encoding);
    } else
        return crypto.createHash(alg).update(str).digest(encoding);
}

/**
 * @template T, U
 * @callback KeyExtractor
 * @param {T} item
 * @return {U} comparable value from item
 */

/**
 * @template T
 * @template {String|Number} U
 * @param {[T]} array
 * @param {KeyExtractor<T, U>} keyExtractor
 */
export function sortArray(array, keyExtractor) {
    array.sort((a, b) => {
        const valueA = keyExtractor(a);
        const valueB = keyExtractor(b);
        if (valueA < valueB) {
            return -1;
        }
        if (valueA > valueB) {
            return 1;
        }
        return 0;
    });
}

/**
 * @param {Array} array
 * @return {Array} new array without duplicate elements
 */
export function distinct(array) {
    return [...new Set(array)];
}
