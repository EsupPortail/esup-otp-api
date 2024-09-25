import * as properties from '../../properties/properties.js';
import * as errors from '../../services/errors.js';

import * as mongoose from 'mongoose';

import * as definedUserSchema from './userSchema.js';

export async function initialize(dbUrl) {
    const connection = await mongoose.createConnection(dbUrl || properties.getMongoDbUrl()).asPromise();
    initiatilize_user_model(connection);
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
    const UserSchema = new mongoose.Schema(definedUserSchema.schema);

    connection.model('User', UserSchema, 'User');
    User = connection.model('User');
}

export async function find_user(uid) {
    const user = await User.findOne({ 'uid': uid });

    if (user) {
        return user;
    } else {
        if (properties.getEsupProperty('auto_create_user')) {
            return create_user(uid);
        }
        else {
            throw new errors.UserNotFoundError();
        }
    }
}

export function create_user(uid) {
    return save_user(new User({ uid: uid }));
}

export function save_user(user) {
    return user.save();
}

/**
 * Supprime l'utilisateur
 */
export function remove_user(uid) {
    return User.deleteOne({ uid: uid });
}
