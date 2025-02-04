import errors from 'restify-errors';
import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import { getInstance } from '../services/logger.js'; const logger = getInstance();

export function check_hash(req, res, next) {
    if(check_hash_socket(req.params.uid, req.params.hash)){
		return next();
	}
    return next(new errors.ForbiddenError());
}

export function check_hash_socket(uid, hash) {
    const hashes = utils.get_hash(uid);
    return hashes.includes(hash);
}

export function check_api_password(req, res, next) {
    const reqApiPwd = req.params.api_password || utils.get_auth_bearer(req.headers);
    if (reqApiPwd == properties.getEsupProperty('api_password')) return next();
    else return next(new errors.ForbiddenError());
}

export function check_admin_password(req, res, next) {
    const reqApiPwd = utils.get_auth_bearer(req.headers);
    if (reqApiPwd == properties.getEsupProperty('admin_password')) return next();
    else return next(new errors.ForbiddenError());
}

export function esupnfc_check_server_ip(req, res, next) {
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    if (ip && ip == properties.getEsupProperty('esupnfc').server_ip) {
        return next();
    }
    else {
        logger.warn("remote ip : " + ip + " is not esupnfc server ip -> forbidden");
        return next(new errors.ForbiddenError());
    }
}

export function dumbValidator(req, res, next) {
    next();
}
