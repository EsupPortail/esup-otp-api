import * as properties from '../properties/properties.js';

import { auditLogger } from '../services/logger.js';
import * as userUtils from '../databases/user/userUtils.js';
import * as api_controller from './api.js';
import { onUserTransportChange } from '../services/userChangesNotifier/userChangesNotifier.js';

/**
 * @type {import('../databases/user/mongodb.js')} userDb
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
    const transportName = req.params.transport;
    const old_transport = userUtils.getTransport(user.userDb, transportName);
    const new_transport = req.params.new_transport || "";

    if (old_transport !== new_transport) {
        userUtils.setTransport(user.userDb, transportName, req.params.new_transport || "");
        auditLogger.info({
            message: [
                {
                    req,
                    action: action,
                    method: transportName,
                    old_value: old_transport,
                    new_value: req.params.new_transport || undefined,
                }
            ]
        });
        await userDb.save_user(user.userDb);
        await onUserTransportChange(user, transportName, old_transport, new_transport);
        await api_controller.save_user(user);
    }

    res.status(200);
    res.send({
        code: 'Ok',
        message: properties.getMessage('success', 'update'),
    });
}

export async function update_user(req, res) {
    const user = await api_controller.apiDb.find_user(req);
    const user_db = user.userDb;
    const newValues = req.body;

    const changes = Object.entries(newValues)
        .map(([key, value]) => [userUtils.attributes[key], value]) // map to database attribute name
        .filter(([key, _value]) => userUtils.modifiableAttributes.includes(key)) // remove non-modifiable attributes
        .filter(([key, value]) => user_db[key] != value); // remove unmodified attributes


    if (changes.length) {
        for (const [key, value] of changes) {
            await onUserTransportChange(user, key, user_db[key], value);
            user_db[key] = value;
        }

        await userDb.save_user(user_db);
        await api_controller.save_user(user);

        auditLogger.info({
            message: [
                {
                    req,
                    action: 'save',
                    changes: Object.fromEntries(changes),
                }
            ]
        });

        res.status(200);
        res.send({
            code: 'Ok',
            message: properties.getMessage('success', 'update')
        });
    } else {
        res.status(200);
        res.send({
            code: 'Ok',
        });
    }
}

export async function search_users(req, res) {
    const token = req.query.token;

    if (!token) {
        return api_controller.get_uids(req, res);
    }

    const users = await userDb.search_users(req, token);

    res.status(200);
    res.send({
        code: 'Ok',
        users: users.map(user => ({ uid: userUtils.getUid(user), displayName: userUtils.getDisplayName(user) })),
    });
}

export async function user_exists(req, res) {
    res.status(200);
    res.send({
        code: 'Ok',
        user_exists: await user_exists_internal(req.params.uid),
    });
}

async function user_exists_internal(uid) {
    try {
        return Boolean(await userDb.find_user(uid));
    } catch (_error) {
        return false;
    }
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
