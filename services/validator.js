import errors from 'restify-errors';
import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import { getCurrentTenantProperties } from '../controllers/api.js';
import { getInstance } from '../services/logger.js';

const logger = getInstance();

export async function check_hash(req, res) {
    const tenant = await getCurrentTenantProperties(req);
    if (!check_hash_socket(req.params.uid, req.params.hash, tenant.users_secret)) {
        throw new errors.ForbiddenError();
    }
}

export function check_hash_socket(uid, hash, users_secret) {
    const hashes = utils.get_hash(uid, users_secret);
    return hashes.includes(hash);
}

export async function check_restricted_access(req, res) {
    const tenant = await getCurrentTenantProperties(req);
    const reqApiPwd = req.params.api_password || utils.get_auth_bearer(req.headers);
    if (reqApiPwd != tenant.api_password) {
        throw new errors.ForbiddenError();
    }
}

export async function check_admin_access(req, res) {
    const reqApiPwd = utils.get_auth_bearer(req.headers);
    if (reqApiPwd != properties.getEsupProperty('api_password')) {
        throw new errors.ForbiddenError();
    }
}

export function esupnfc_check_server_ip(req, res, next) {
    const ip = utils.getIpAddr(req);
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
