import restifyErrors from 'restify-errors';

import * as properties from '../properties/properties.js';
import { apiDb } from '../controllers/api.js';

export function isMultiTenantContext() {
    return Boolean(properties.getEsupProperty('tenants')?.length);
}

export const TENANT_HEADER = "x-tenant";

export async function getCurrentTenantProperties(req) {
    return req.tenant ||= getCurrentTenantPropertiesInternal(req.params.uid, req.header(TENANT_HEADER));
}

/**
 * constructs a fake "tenant" object if executed in a mono-tenant context
 * @returns {Promise<{
 *     id?: String,
 *     name?: String,
 *     scopes?: String[],
 *     webauthn?: {
 *         relying_party: {
 *             name: String,
 *             id: String,
 *         },
 *         allowed_origins: String[],
 *     },
 *     api_password: String,
 *     users_secret: String,
 * }>}
 */
export async function getCurrentTenantPropertiesInternal(uid, tenantHeader) {
    if (isMultiTenantContext()) {
        let dbTenant;
        if (uid) {
            dbTenant = await getTenantByUserUid(uid);
        } else {
            dbTenant = await getTenantByHeader(tenantHeader);
        }

        if (!dbTenant) {
            throw new restifyErrors.BadRequestError();
        }
        return dbTenant;
    } else {
        return {
            name: "Default tenant",
            webauthn: properties.getEsupProperty("webauthn"),
            api_password: properties.getEsupProperty('api_password'),
            users_secret: properties.getEsupProperty('users_secret'),
        };
    }
}

function getTenantByUserUid(uid) {
    const scope = uid.split("@")[1];
    if (!scope) {
        throw new restifyErrors.BadRequestError();
    }
    return apiDb.find_tenant_by_scope(scope);
}

function getTenantByHeader(tenantHeader) {
    if (!tenantHeader) {
        throw new restifyErrors.BadRequestError();
    }
    return apiDb.find_tenant_by_name(tenantHeader);
}

export async function currentTenantMongodbFilter(req) {
    if (isMultiTenantContext()) {
        const { scopes } = await getCurrentTenantProperties(req);
        // Only get uids ending with the scope (prefixed with "@")
        const regex = new RegExp(`@(${scopes.join('|')})$`);
        return { uid: regex };
    } else {
        return {};
    }
}

export function errorIfMultiTenantContext() {
    if (isMultiTenantContext()) {
        throw new Error('Only userDb "mongodb" is compatible with multi-tenancy');
    }
}
