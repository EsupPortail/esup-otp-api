import * as properties from '../../properties/properties.js';
import * as mongoose from 'mongoose';

import { getInstance } from '../../services/logger.js';
const logger = getInstance();

import * as definedUserSchema from './userSchema.js';

export function initialize(callback) {
	const db_url = 'mongodb://' + properties.getEsupProperty('mongodb').address + '/' + properties.getEsupProperty('mongodb').db;
	mongoose.createConnection(db_url).asPromise()
		.then((connection) => {
			initiatilize_user_model(connection);
			if (typeof (callback) === "function") callback();
		})
		.catch((error) => {
			logger.error(error);
		});
}

/** 
 * User Model
 * @type mongoose.Model
 */
let User;

/**
 * @param { mongoose.Connection } connection
 */
function initiatilize_user_model(connection) {
    const Schema = mongoose.Schema;

    const UserSchema = new Schema(definedUserSchema.schema);

    connection.model('User', UserSchema, 'User');
    User = connection.model('User');
}

export function find_user(req, res, callback) {
	User.findOne({ 'uid': req.params.uid }).exec()
		.then((user) => {
			if (user) {
				if (typeof (callback) === "function") callback(user);
			} else {
				if (properties.getEsupProperty('auto_create_user')) {
					create_user(req.params.uid, callback);
				}
				else {
					res.status(404);
					res.send({
						"code": "Error",
						"message": properties.getMessage('error', 'user_not_found')
					});
				}
			}
		});
}

export function create_user(uid, callback) {
	save_user(new User({ uid: uid }), callback);
}

export function save_user(user, callback) {
	user.save().then(() => {
		if (typeof (callback) === "function") callback(user);
	});
}

/**
 * Supprime l'utilisateur
 */
export function remove_user(uid, callback) {
	/**@type DeleteResult */
	User.deleteOne({ uid: uid }).exec()
		.then((/**@type mongoose.mongo.DeleteResult */ deleteResult) => {
			if (typeof (callback) === "function") callback(deleteResult);
		});
}
