import * as properties from '../../properties/properties.js';
import * as errors from '../../services/errors.js';
import { errorIfMultiTenantContext } from '../../services/multiTenantUtils.js';
import StandardUserData from '../../services/userDb/userData/StandardUserData.ts';
import UserDbAttributes from '../../services/userDb/UserDbAttributes.ts';

import * as mysql from 'mysql2/promise';

const mysqlProperties = properties.getEsupProperty("mysql");
const userDbAttributes = new UserDbAttributes(mysqlProperties);
const { searchAttributes, modifiableAttributes, modifiableAttributesRecord, allAttributes, attributes } = userDbAttributes;

export { modifiableAttributesRecord };

/**
 * @type mysql.Connection
 */
let connection;

export async function initialize() {
    errorIfMultiTenantContext();
    /**
     * @type mysql.ConnectionOptions
     */
    const config = mysqlProperties;
    config.namedPlaceholders = true;
    // because "Ignoring invalid configuration option passed to Connection: [displayName, userTable,transport] . This is currently a warning, but in future versions of MySQL2, an error will be thrown if you pass an invalid configuration option to a Connection"
    // eslint-disable-next-line no-unused-vars
    const { userTable, transport, displayName, ...connectionOptions } = mysqlProperties;
    connection = await mysql.createConnection(connectionOptions);
}

export function close() {
    return connection.end();
}

const selectQuery = `Select ${allAttributes.join(", ")} From ${mysqlProperties.userTable} u Where u.${attributes.uid} = :uid`
/**
 * @returns {Promise<StandardUserData>}
 */
export async function find_user(uid) {
    return new StandardUserData(await find_user_internal(uid), attributes);
}

async function find_user_internal(uid) {
    const [rows, _fields] = await connection.execute(selectQuery, { uid: uid });
    const user = rows[0];
    return user || errors.UserNotFoundError.throw();
}

const searchQuery = `Select ${searchAttributes.join(", ")} From ${mysqlProperties.userTable} Where ${searchAttributes.map(attr => `LOWER(${attr}) LIKE :token`).join(" OR ")}`;
/**
 * @param {String} token 
 */
export async function search_users(req, token) {
    token = token.toLowerCase();
    const [rows, _fields] = await connection.execute(searchQuery, { token: `%${token}%` });
    return rows.map(result => userDbAttributes.standardizeSearchResults(result));
}

/**
 * @param { StandardUserData } user 
 */
export async function save_user(user) {
    const oldUser = await find_user(user.getUid());
    if (oldUser) {
        const updatedAttributes = modifiableAttributes.filter(attr => oldUser[attr] != user.internalUser[attr]);
        if (updatedAttributes.length) {
            /** @example "sms = :sms , mail = :mail" */
            const set = updatedAttributes.map(attr => `${attr} = :${attr}`).join(", ");
            const updateQuery = `Update ${mysqlProperties.userTable} SET ${set} Where ${attributes.uid} = :${attributes.uid}`;
            await connection.execute(updateQuery, user.internalUser);
        }
    }
}

/**
 * @returns {Promise<StandardUserData>}
 */
export async function create_user(uid) {
    const query = `INSERT INTO ${mysqlProperties.userTable} (${attributes.uid}) VALUES (:uid)`;
    await connection.execute(query, { uid: uid })
    return find_user(uid);
}

export function remove_user(uid) {
    const query = `DELETE FROM ${mysqlProperties.userTable} WHERE ${attributes.uid} = :uid`;
    return connection.execute(query, { uid: uid });
}
