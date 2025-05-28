import errors from 'restify-errors';
import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import * as apiDb from '../databases/api/mongodb.js';
import { getInstance } from '../services/logger.js';

const logger = getInstance();

export async function check_hash(req, res) {
    let users_secret;
    const tenants = properties.getEsupProperty('tenants');
    if (tenants && tenants.length) {
        // multi-tenants support is active: require tenant header, and use
        // tenant-specific users secret
        const tenant = req.header('x-tenant');
        if (!tenant) {
            throw new errors.BadRequestError();
        }
        const dbTenant = await apiDb.find_tenant_by_name(tenant);
        if (!dbTenant) {
            throw new errors.BadRequestError();
        }
        users_secret = dbTenant.users_secret;
    } else {
        // multi-tenants support is not active: use global users secret
        users_secret = properties.getEsupProperty('users_secret');
    }

    if (!check_hash_socket(req.params.uid, req.params.hash, users_secret)) {
        throw new errors.ForbiddenError();
    }
}

export function check_hash_socket(uid, hash, users_secret) {
    const hashes = utils.get_hash(uid, users_secret);
    return hashes.includes(hash);
}

export async function check_restricted_access(req, res) {
    let api_password;
    const tenants = properties.getEsupProperty('tenants');
    if (tenants && tenants.length) {
        // multi-tenants support is active: require tenant header, and use
        // tenant-specific API password
        const tenant = req.header('x-tenant');
        if (!tenant) {
            throw new errors.BadRequestError();
        }
        const dbTenant = await apiDb.find_tenant_by_name(tenant);
        if (!dbTenant) {
            throw new errors.BadRequestError();
        }
        api_password = dbTenant.api_password;
    } else {
        // multi-tenants support is not active: use global API password
        api_password = properties.getEsupProperty('api_password');
    }

    const reqApiPwd = req.params.api_password || utils.get_auth_bearer(req.headers);
    if (reqApiPwd != api_password) {
        throw new errors.ForbiddenError();
    }
}

export function check_tenants_access(req, res, next) {
    const reqApiPwd = utils.get_auth_bearer(req.headers);
    if (reqApiPwd == properties.getEsupProperty('admin_password')) return next();
    else return next(new errors.ForbiddenError());
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
