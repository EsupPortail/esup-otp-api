import errors from 'restify-errors';
import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import { getCurrentTenantProperties, getCurrentTenantPropertiesInternal } from './multiTenantUtils.js';
import { logger } from '../services/logger.js';

export async function check_hash(req, res) {
    if (!await check_hash_internal(req.params.uid, req.params.hash)) {
        throw new errors.ForbiddenError();
    }
    req.hash_checked = true;
}

/**
 * @returns { Promise<Boolean> }
 */
export async function check_hash_internal(uid, hash) {
    const tenant = await getCurrentTenantPropertiesInternal(uid);
    const hashes = utils.get_hash(uid, tenant.users_secret);
    return hashes.includes(hash);
}

export async function check_protected_access(req, res) {
    const tenant = await getCurrentTenantProperties(req);
    const reqApiPwd = req.params.api_password || utils.get_auth_bearer(req.headers);
    if (reqApiPwd != tenant.api_password) {
        throw new errors.ForbiddenError();
    }
    req.protected_access_checked = true;
}

export async function check_admin_access(req, res) {
    const reqApiPwd = utils.get_auth_bearer(req.headers);
    if (reqApiPwd != properties.getEsupProperty('api_password')) {
        throw new errors.ForbiddenError();
    }
    req.admin_access_checked = true;
}

export function esupnfc_check_server_ip(req, res, next) {
    const ip = utils.getIpAddr(req);
    if (ip && ip == properties.getEsupProperty('esupnfc').server_ip) {
        req.esupnfc_server_ip_checked = true;
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
