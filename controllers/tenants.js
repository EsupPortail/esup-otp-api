import { apiDb } from './api.js';

/**
 * Get all Tenants
 */
export async function get_tenants(req, res) {
    const result = await apiDb.get_tenants(req, res);
    res.send(200, result);
}

/**
 * Get tenant by name
 */
export async function get_tenant(req, res) {
    const tenant = await apiDb.find_tenant_by_id(req, res);
    if (tenant) {
        const response = {
            name: tenant.name,
            scopes: tenant.scopes,
            webauthn: tenant.webauthn,
            api_password: tenant.api_password,
            users_secret: tenant.users_secret
        };

        res.send(200, response);
    } else {
        res.send(404);
    }
}

export async function create_tenant(req, res) {
    await apiDb.create_tenant(req, res);
    res.send(201);
}

export async function update_tenant(req, res) {
    const tenant = await apiDb.update_tenant(req, res);
    if (tenant) {
        res.send(204);
    } else {
        res.send(400);
    }
}

export async function delete_tenant(req, res) {
    await apiDb.delete_tenant(req, res);
    res.send(200);
}
