import * as properties from '../properties/properties.js';

import { logger, auditLogger } from '../services/logger.js';
import * as userUtils from '../databases/user/userUtils.js';
import * as api_controller from './api.js';

/**
 * @type {import('../databases/user/mongodb.js')} apiDb
 */
export let userDb;

export async function initialize(initializedUserDb) {
    if (initializedUserDb) {
        userDb = initializedUserDb;
    } else {
        const userDbName = properties.getEsupProperty('userDb');
        if (userDbName) {
            userDb = await import('../databases/user/' + userDbName + '.js');
            return userDb.initialize();
        } else {
            throw new Error('Unknown userDb');
        }
    }
}

export async function update_transport(req, res) {
    return update_transport_internal(req, res, 'save');
}

export async function delete_transport(req, res) {
    return update_transport_internal(req, res, 'delete');
}

async function update_transport_internal(req, res, action) {
    const user = await api_controller.apiDb.find_user(req);
    const old_transport = userUtils.getTransport(user.userDb, req.params.transport);
    userUtils.setTransport(user.userDb, req.params.transport, req.params.new_transport || "");
    auditLogger.info({
        message: [
            {
                req,
                action: action,
                method: req.params.transport,
                old_value: old_transport,
                new_value: req.params.new_transport || undefined,
            }
        ]
    });
    await userDb.save_user(user.userDb);
    await api_controller.save_user(user);
    res.status(200);
    res.send({
        code: 'Ok',
        message: properties.getMessage('success', 'update'),
    });
}

/**
 * Supprime l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export function remove_user(uid) {
    return userDb.remove_user(uid);
}

/**
 * Crée l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export function create_user(uid) {
    return userDb.create_user(uid);
}

/**
 * Sauve l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export function save_user(user) {
    return userDb.save_user(user);
}
