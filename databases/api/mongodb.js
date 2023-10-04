import * as userDb_controller from '../../controllers/user.js';
import * as properties from '../../properties/properties.js';
import * as utils from '../../services/utils.js';
import * as mongoose from 'mongoose';
import {schema as userPreferencesSchema} from './userPreferencesSchema.js';
import {schema as apiPreferencesSchema} from './apiPreferencesSchema.js';

import { getInstance } from '../../services/logger.js';
const logger = getInstance();

export function initialize(callback) {
	const db_url = 'mongodb://' + properties.getEsupProperty('mongodb').address + '/' + properties.getEsupProperty('mongodb').db;
	mongoose.createConnection(db_url).asPromise()
		.then((connection) => {
			initiatilize_api_preferences(connection);
			initiatilize_user_model(connection);

			if (typeof (callback) === "function") {
				callback();
			}
			else {
				logger.error(utils.getFileNameFromUrl(import.meta.url) + ' ' + `Type of provided callback is not 'function' ; got '${typeof (callback)}'`);
			}
		})
		.catch((error) => {
			logger.error(error);
		});
}


/** 
 * Api Preferences
 * @type mongoose.Model
 */
let ApiPreferences;

/**
 * @param { mongoose.Connection } connection
 */
function initiatilize_api_preferences(connection) {
	const ApiPreferencesSchema = new mongoose.Schema(apiPreferencesSchema);

	connection.model('ApiPreferences', ApiPreferencesSchema, 'ApiPreferences');

	ApiPreferences = connection.model('ApiPreferences');
	ApiPreferences.findOne({}).exec()
		.then((existingApiPrefsData) => {
			if (existingApiPrefsData) {
				const prefs = properties.getEsupProperty('methods');
				for (const p in prefs) {
					prefs[p].activate = existingApiPrefsData[p].activate;
					prefs[p].transports = existingApiPrefsData[p].transports;
				}
				properties.setEsupProperty('methods', prefs);
				update_api_preferences();
			}
			else {
				logger.info(utils.getFileNameFromUrl(import.meta.url) + ' ' + 'No existing api prefs data : creating.');
				create_api_preferences();
			}
		});
}

/**
 * Sauvegarde les préférences de l'api
 *
 * @param req requete HTTP
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function update_api_preferences() {
	ApiPreferences.findOne({}).exec()
		.then((data) => {
			if (data) {
				const prefs = properties.getEsupProperty('methods');
				for (const p in prefs) {
					data[p] = prefs[p];
				}
				const api_preferences = data;
				api_preferences.save().then(() => {
					logger.info(utils.getFileNameFromUrl(import.meta.url) + ' ' + "Api Preferences updated");
				});
			}
		});
}

function create_api_preferences() {
	ApiPreferences.deleteMany({}).exec()
		.catch((err) => {
			logger.error(err);
		})
		.finally(() => {
			const api_preferences = new ApiPreferences(properties.getEsupProperty('methods'));
			api_preferences.save().then(() => {
				logger.info(utils.getFileNameFromUrl(import.meta.url) + ' ' + "Api Preferences created");
			});
		});
}
/** 
 * User Model 
 * @type mongoose.Model
 */
let UserPreferences;

/**
 * @param { mongoose.Connection } connection
 */
function initiatilize_user_model(connection) {
    const UserPreferencesSchema = new mongoose.Schema(userPreferencesSchema);
    connection.model('UserPreferences', UserPreferencesSchema, 'UserPreferences');
    UserPreferences = connection.model('UserPreferences');
}

/**
 * Retourne l'utilisateur mongo
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function find_user(req, res, callback) {
	UserPreferences.findOne({ 'uid': req.params.uid }).exec()
		.then((userPreferences) => {
			if (userPreferences) {
				if (typeof (callback) === "function") callback(userPreferences);
			} else {
				userDb_controller.user_exists(req, res, function(user) {
					if (user) {
						create_user(user.uid, callback);
					} else {
						res.status(404);
						res.send({
							"code": "Error",
							"message": properties.getMessage('error', 'user_not_found')
						});
					}
				});
			}
		});
}

/**
 * Sauve l'utilisateur
 */
export function save_user(user, callback) {
	user.save().then(() => {
		if (typeof (callback) === "function") callback(user);
	})
}

export function create_user(uid, callback) {
	save_user(new UserPreferences({ uid: uid }), callback);
}

/**
 * Supprime l'utilisateur
 *
 * @param req requete HTTP
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
export function remove_user(uid, callback) {
	UserPreferences.deleteOne({ uid: uid }).exec()
		.catch((err) => {
			logger.error(err);
		}).finally((data) => {
			if (typeof (callback) === "function") callback(data);
		});
}

export function parse_user(user) {
    const parsed_user = {};
    parsed_user.codeRequired = false;
    parsed_user.waitingFor = false;
    if (properties.getMethod('totp').activate) {
        if(user.totp.active)parsed_user.codeRequired = true;
        parsed_user.totp = {
            active: user.totp.active,
            message: "",
            qrCode: "",
            transports: available_transports(user.totp.transports, "totp")
        };
    }
    if (properties.getMethod('random_code').activate) {
        if(user.random_code.active)parsed_user.codeRequired = true;
        parsed_user.random_code = {
            active: user.random_code.active,
            transports: available_transports(user.random_code.transports, 'random_code')
        };
    }
   if (properties.getMethod('random_code_mail').activate) {
        if(user.random_code_mail.active)parsed_user.codeRequired = true;
        parsed_user.random_code_mail = {
            active: user.random_code_mail.active,
            transports: available_transports(user.random_code_mail.transports, 'random_code_mail')
        };
    }
    if (properties.getMethod('bypass').activate) {
        if(user.bypass.active)parsed_user.codeRequired = true;
        parsed_user.bypass = {
            active: user.bypass.active,
            codes: [],
            available_code: user.bypass.codes.length,
            used_code: user.bypass.used_codes,
            transports: available_transports(user.bypass.transports, "bypass")
        };
    }
    //if(properties.getMethod('matrix').activate){
    //  parsed_user.matrix = user.matrix;
    //}
    // parsed_user.matrix.active = user.matrix.active;
    if(properties.getMethod('push').activate){
        if(user.push.active)parsed_user.waitingFor = true;
        parsed_user.push = {
            device : {
                platform : user.push.device.platform,
                phone_number : user.push.device.phone_number,
                manufacturer : user.push.device.manufacturer,
                model : user.push.device.model,
                activationCode: {},
                qrCode: {},
                api_url: {}
            },
            activationCode : '',
            api_url : '',
            qrCode : '',
            active : user.push.active,
            transports: available_transports(user.push.transports, "push")
        };
    }
    if (properties.getMethod('esupnfc').activate) {
	// autologin
        if(user.esupnfc.active) parsed_user.waitingFor = true;
        parsed_user.esupnfc = {
            active: user.esupnfc.active,
            transports: available_transports(user.esupnfc.transports, 'esupnfc')
        };
    }  
    return parsed_user;
}

function available_transports(userTransports, method) {
    const available_transports = [];
    for (const t in userTransports) {
        if (properties.getMethod(method).transports.indexOf(userTransports[t]) >= 0) {
            available_transports.push(userTransports[t]);
        }
    }
    return available_transports;
}


export function get_uids(req, res, next) {
	UserPreferences.find({}, { uid: 1 }).exec()
		.then((data) => {
			const result = data.map((uid) => uid.uid);

			res.status(200);
			res.send({
				code: "Ok",
				uids: result
			});
		})
		.catch((err) => {
			logger.error(err);
		});
}

/**
 * Drop Users
 */
export function drop(req, res, next) {
	UserPreferences.deleteMany({}).exec()
		.then((data) => {
			logger.debug('users removed');

			res.status(200);
			res.send(data);
		})
		.catch((err) => {
			logger.error(err);
		});
}
