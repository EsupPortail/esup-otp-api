import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';

import { getInstance } from '../services/logger.js';
const logger = getInstance();

export let userDb;

export function initialize(callback) {
    if (properties.getEsupProperty('userDb')) {
        import('../databases/user/' + properties.getEsupProperty('userDb') + '.js')
            .then((userDbModule) => {
                userDb = userDbModule;
                userDb.initialize(callback);
            })
    } else logger.error(utils.getFileNameFromUrl(import.meta.url) + ' ' + "Unknown userDb");
}

export function user_exists(req, res, callback){
    userDb.find_user(req, res, function(user){
        if (typeof(callback) === "function") callback(user);
    })
}


export function get_available_transports (req, res, callback) {
    userDb.find_user(req, res, function(user) {
        const response = {};
        const result = {};
        if (user[properties.getEsupProperty(properties.getEsupProperty('userDb')).transport.mail]) result.mail = utils.cover_string(user[properties.getEsupProperty(properties.getEsupProperty('userDb')).transport.mail], 4, 5);
        if (user[properties.getEsupProperty(properties.getEsupProperty('userDb')).transport.sms]) result.sms = utils.cover_string(user[properties.getEsupProperty(properties.getEsupProperty('userDb')).transport.sms], 2, 2);
        if (typeof(callback) === "function") callback(result);
        else {
            response.code = "Ok";
            response.message = properties.getMessage('success','transports_found');
            response.transports_list = result;

            res.status(200);
            res.send(response);
        }
    });
}



export function send_sms (req, res, callback) {
    userDb.find_user(req, res, function(user) {
        if (typeof(callback) === "function") callback(user[properties.getEsupProperty(properties.getEsupProperty('userDb')).transport.sms]);
    });
}


export function send_mail (req, res, callback) {
    userDb.find_user(req, res, function(user) {
        if (typeof(callback) === "function") callback(user[properties.getEsupProperty(properties.getEsupProperty('userDb')).transport.mail]);
    });
}

export function update_transport (req, res, next) {
    userDb.find_user(req, res, function(user) {
        user[properties.getEsupProperty(properties.getEsupProperty('userDb')).transport[req.params.transport]]=req.params.new_transport;
        userDb.save_user(user, function(){
            logger.log('archive', {
                message: [
                    {
                        uid: req.params.uid,
                        clientIp: req.headers['x-client-ip'],
                        clientUserAgent: req.headers['client-user-agent'],
                        action: 'save',
                        method: req.params.transport,
                        [req.params.transport === 'sms' ? 'phoneNumber' : 'Email']: req.params.new_transport
                    }
                ]
            });
            res.status(200);
            res.send({
                code: 'Ok',
                message: properties.getMessage('success','update')
            });
        });
    });
}

export function delete_transport (req, res, next) {
    userDb.find_user(req, res, function(user) {
        user[properties.getEsupProperty(properties.getEsupProperty('userDb')).transport[req.params.transport]]="";
        logger.log('archive', {
            message: [
                {
                    uid: req.params.uid,
                    clientIp: req.headers['x-client-ip'],
                    clientUserAgent: req.headers['client-user-agent'],
                    action: 'delete',
                    method: req.params.transport
                }
            ]
        });
        userDb.save_user(user, function(){
            res.status(200);
            res.send({
                code: 'Ok',
            });
        });
    });
}

/**
 * Supprime l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function remove_user(uid, callback) {
    userDb.remove_user(uid, callback);
}

/**
 * Crée l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function create_user(uid, callback) {
    userDb.create_user(uid, callback);
}

/**
 * Sauve l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function save_user(user, callback) {
    userDb.save_user(user, callback);
}