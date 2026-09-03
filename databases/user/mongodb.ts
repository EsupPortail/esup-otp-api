import * as properties from '../../properties/properties.js';
import * as errors from '../../services/errors.js';
import { currentTenantMongodbFilter } from '../../services/multiTenantUtils.js';
import StandardUserData from '../../services/userDb/userData/StandardUserData.ts';
import UserDbAttributes from '../../services/userDb/UserDbAttributes.ts';
import generateMongooseUserSchema from './userSchema.ts';

import * as mongoose from 'mongoose';

const mongodbProperties = properties.getEsupProperty("mongodb");
const userDbAttributes = new UserDbAttributes(mongodbProperties);
const { searchAttributes, modifiableAttributesRecord, attributes } = userDbAttributes;

export { modifiableAttributesRecord };

type InternalUser = mongoose.Document & Record<string, string>;

let connection: mongoose.Connection;

export async function initialize(dbUrl: string | undefined) {
    connection = await mongoose.createConnection(dbUrl || properties.getMongoDbUrl()).asPromise();
    initialize_user_model(connection);
}

export function close() {
    return connection?.close();
}

let User: mongoose.Model<any>;

function initialize_user_model(connection: mongoose.Connection) {
    User = connection.model('User', generateMongooseUserSchema(attributes), 'User');
}

export async function find_user(uid: string): Promise<StandardUserData<InternalUser>> {
    const user = await User.findOne({ [attributes.uid]: uid });

    if (user) {
        return new StandardUserData(user, attributes);
    } else {
        throw new errors.UserNotFoundError();
    }
}

export async function search_users(token: string, req: any): Promise<Array<{ uid: string; displayName: string | undefined; }>> {
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
    return brutResult.map(result => userDbAttributes.standardizeSearchResult(result));
}

export async function create_user(uid: string): Promise<StandardUserData<InternalUser>> {
    const user = new StandardUserData(new User({ [attributes.uid]: uid }), attributes);
    await save_user(user);
    return user;
}

export async function save_user(user: StandardUserData<InternalUser>) {
    await user.internalUser.save()
}

/**
 * Supprime l'utilisateur
 */
export function remove_user(uid: string) {
    return User.deleteOne({ [attributes.uid]: uid });
}
