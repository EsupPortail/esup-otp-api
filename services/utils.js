import * as properties from '../properties/properties.js';
import CryptoJS from 'crypto-js';
import crypto from 'crypto';
import { getInstance } from '../services/logger.js'; const logger = getInstance();
import { fileURLToPath } from 'url';
import * as path from 'node:path';
import * as qrcode from 'qrcode';

export function get_hash(uid) {
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


    const present_hash = CryptoJS.SHA256(CryptoJS.MD5(properties.getEsupProperty('users_secret')).toString()+uid+present_salt).toString();
    const next_hash = CryptoJS.SHA256(CryptoJS.MD5(properties.getEsupProperty('users_secret')).toString()+uid+next_salt).toString();
    const past_hash = CryptoJS.SHA256(CryptoJS.MD5(properties.getEsupProperty('users_secret')).toString()+uid+past_salt).toString();

    const hashes = [past_hash, present_hash, next_hash];

    logger.debug("hashes for "+uid+": "+hashes);

    return hashes;
}

export function cover_string(str, start, end) {
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

/**
 * @type {String} url
 * @returns image with html tag
 */
export async function generateQrCode(url, size = 164) {
    const imageUrl = await qrcode.toDataURL(url, { width: size });
    return `<img src='${imageUrl}' width='${size}' height='${size}'>`;
}

const smsRegex = new RegExp("^((0[67](([.]|[-]|[ ])?[0-9]){8})|((00|[+])(([.]|[-]|[ ])?[0-9]){7,15}))$");
// eslint-disable-next-line no-useless-escape
const defaultRegex = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
export function check_transport_validity(transport, value){
	const reg = (transport == 'sms') ? smsRegex : defaultRegex;
    return reg.test(value);
}

/**
 * absolute path of project directory
 */
const base_dir = relativeToAbsolutePath(import.meta.url, '..');

/**
 * relative path from project directory
 */
export function getFileName(filename){
	return path.relative(base_dir, filename);
}

/**
 * @param { string | URL } import_meta_url 
 */
export function getFileNameFromUrl(import_meta_url){
    return getFileName(__filename(import_meta_url));
}

/**
 * @param { string | URL } import_meta_url 
 */
export function __filename(import_meta_url){
    return fileURLToPath(import_meta_url);
}

/**
 * @param { string | URL } import_meta_url 
 */
export function __dirname(import_meta_url){
    return path.dirname(__filename(import_meta_url));
}

/**
 * @param { string | URL } import_meta_url
 */
export function relativeToAbsolutePath(import_meta_url, relativePath) {
	return path.join(__dirname(import_meta_url), relativePath);
}

export function get_auth_bearer(headers) {
    return (headers.authorization?.match(/^Bearer (.*)/) || [])[1]
}
