import * as properties from '../../properties/properties.js';
import * as errors from '../../services/errors.js';

import * as mongoose from 'mongoose';

import UserSchema from './userSchema.js';

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
    User = connection.model('User', UserSchema, 'User');
}

export async function find_user(uid, tenant) {
    const user = await User.findOne({ 'uid': uid, 'tenant': tenant });

    if (user) {
        return user;
    } else {
        if (properties.getEsupProperty('auto_create_user')) {
            return create_user(uid, tenant);
        } else {
            throw new errors.UserNotFoundError();
        }
    }
}

export function create_user(uid, tenant) {
    return save_user(new User({ uid: uid, tenant: tenant }));
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
