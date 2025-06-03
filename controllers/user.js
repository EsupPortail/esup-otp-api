import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';

import { getInstance } from '../services/logger.js';
import * as userUtils from '../databases/user/userUtils.js';
const logger = getInstance();

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

export function find_user(req) {
    return userDb.find_user(req.params.uid);
}

export async function get_available_transports(req) {
    const user = await find_user(req);
    const result = {};
    const mail = userUtils.getMail(user);
    const sms = userUtils.getSms(user);
    if (mail) {
        result.mail = utils.cover_string(mail, 4, 5);
    }
    if (sms) {
        result.sms = utils.cover_string(sms, 2, 2);
    }
    return result;
}

export async function get_phone_number(req) {
    const user = await find_user(req);
    return userUtils.getSms(user);
}

export async function get_mail_address(req) {
    const user = await find_user(req);
    return userUtils.getMail(user);
}

export async function update_transport(req, res) {
    const user = await find_user(req);
    userUtils.setTransport(user, req.params.transport, req.params.new_transport);
    await userDb.save_user(user);
    logger.log('archive', {
        message: [
            {
                req,
                action: 'save',
                method: req.params.transport,
                [req.params.transport === 'sms' ? 'phoneNumber' : 'Email']: req.params.new_transport
            }
        ]
    });
    res.status(200);
    res.send({
        code: 'Ok',
        message: properties.getMessage('success', 'update')
    });
}

export async function delete_transport(req, res) {
    const user = await find_user(req);
    userUtils.setTransport(user, req.params.transport, "");
    logger.log('archive', {
        message: [
            {
                req,
                action: 'delete',
                method: req.params.transport
            }
        ]
    });
    await userDb.save_user(user);
    res.status(200);
    res.send({
        code: 'Ok',
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
