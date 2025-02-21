import errors from 'restify-errors';
import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import * as apiDb from '../databases/api/mongodb.js';
import { getInstance } from '../services/logger.js'; 

const logger = getInstance();

export function check_hash(req, res, next) {
    const tenant = req.headers['x-tenant'];
    if(tenant) {
        apiDb.find_tenant_by_name(tenant).then(dbTenant => {
            if (!dbTenant) {
                return next(new errors.InternalError());
            }
            if (check_hash_socket(req.params.uid, req.params.hash, dbTenant.users_secret)) {
                return next();
            } else {
                return next(new errors.ForbiddenError());
            }
        }).catch(e => {
            logger.error(e);
            logger.error(e.cause);
            logger.error(e.message);
            
            return next(new errors.InternalError());
        });
        return next();
    } else if(check_hash_socket(req.params.uid, req.params.hash, properties.getEsupProperty('users_secret'))){
		return next();
	}
    return next(new errors.ForbiddenError());
}

export function check_hash_socket(uid, hash, users_secret) {
    const hashes = utils.get_hash(uid, users_secret);
    return hashes.includes(hash);
}

export function check_api_password(req, res, next) {
    const tenant = req.headers['x-tenant'];
    if(tenant) {
        return check_api_password_for_tenant(req, res, next);
    }
    const reqApiPwd = req.params.api_password || utils.get_auth_bearer(req.headers);
    if (reqApiPwd == properties.getEsupProperty('api_password')) return next();
    else return next(new errors.ForbiddenError());
}

export function check_api_password_for_tenant(req, res, next) {
    const tenant = req.headers['x-tenant'];
    if (!tenant) {
        return next(new errors.BadRequestError());
    }
    const reqApiPwd = req.params.api_password || utils.get_auth_bearer(req.headers);
    apiDb.find_tenant_by_name(tenant).then(dbTenant => {
        if (!dbTenant) {
            return next(new errors.InternalError());
        }
        if (reqApiPwd == dbTenant.api_password) {
            return next();
        } else {
            return next(new errors.ForbiddenError());
        }
    }).catch(e => {
        logger.error(e);
        logger.error(e.cause);
        logger.error(e.message);
        
        return next(new errors.InternalError());
    });
    
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
