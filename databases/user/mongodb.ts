import * as properties from '../../properties/properties.js';
import * as errors from '../../services/errors.js';
import { currentTenantMongodbFilter } from '../../services/multiTenantUtils.js';
import StandardUserData from '../../services/userDb/userData/StandardUserData.ts';
import UserDbAttributes from '../../services/userDb/UserDbAttributes.ts';
import generateMongooseUserSchema from './userSchema.js';

import * as mongoose from 'mongoose';

const mongodbProperties = properties.getEsupProperty("mongodb");
const userDbAttributes = new UserDbAttributes(mongodbProperties);
const { searchAttributes, modifiableAttributesRecord, attributes } = userDbAttributes;

export { modifiableAttributesRecord };

/** @type { mongoose.Connection } */
let connection;

export async function initialize(dbUrl) {
    connection = await mongoose.createConnection(dbUrl || properties.getMongoDbUrl()).asPromise();
    initialize_user_model(connection);
}

export function close() {
    return connection?.close();
}

/** 
 * User Model
 * @type mongoose.Model
 */
let User;

/**
 * @param { mongoose.Connection } connection
 */
function initialize_user_model(connection) {
    User = connection.model('User', generateMongooseUserSchema(attributes), 'User');
}

/**
 * @returns {Promise<StandardUserData<mongoose.Document>>}
 */
export async function find_user(uid) {
    const user = await User.findOne({ [attributes.uid]: uid });

    if (user) {
        return new StandardUserData(user, attributes);
    } else {
        throw new errors.UserNotFoundError();
    }
}

/**
 * @returns {Promise<Array<{uid: String, displayName: String}>>}
 */
export async function search_users(req, token) {
    const regex = new RegExp(token, 'i');

    /** @example [{uid: /token/i}, {displayName: /token/i}] */
    const orConditions = searchAttributes.map(attr => ({
        [attr]: regex,
    }));

    const brutResult = await User.find({
        $and: [
            await currentTenantMongodbFilter(req),
            { $or: orConditions }
        ]
    }).select(searchAttributes);
    return brutResult.map(result => userDbAttributes.standardizeSearchResults(result));
}

/**
 * @returns {Promise<StandardUserData<mongoose.Document>}
 */
export function create_user(uid) {
    return save_user(new StandardUserData(new User({ [attributes.uid]: uid }), attributes));
}

/**
 * @param {StandardUserData<mongoose.Document>} user 
 */
export async function save_user(user) {
    await user.internalUser.save()
    return user;
}

/**
 * Supprime l'utilisateur
 */
export function remove_user(uid) {
    return User.deleteOne({ [attributes.uid]: uid });
}
