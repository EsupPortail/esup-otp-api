import * as errors from '../../services/errors.js';
import { getUserDbProperties, getUid, searchAttributes, modifiableAttributes, attributes, allAttributes } from './userUtils.js';
import { errorIfMultiTenantContext } from '../../services/multiTenantUtils.js';

import * as mysql from 'mysql2/promise';

/**
 * @type mysql.Connection
 */
let connection;

export async function initialize() {
    errorIfMultiTenantContext();
    /**
     * @type mysql.ConnectionOptions
     */
    const config = getMysqlProperty();
    config.namedPlaceholders = true;
    // because "Ignoring invalid configuration option passed to Connection: [displayName, userTable,transport] . This is currently a warning, but in future versions of MySQL2, an error will be thrown if you pass an invalid configuration option to a Connection"
    // eslint-disable-next-line no-unused-vars
    const { userTable, transport, displayName, ...connectionOptions } = getMysqlProperty();
    connection = await mysql.createConnection(connectionOptions);
}

export function close() {
    return connection.end();
}

const selectQuery = `Select ${allAttributes.join(", ")} From ${getUserTable()} u Where u.${attributes.uid} = :uid`
export async function find_user(uid) {
    const [rows, _fields] = await connection.execute(selectQuery, { uid: uid });
    const user = rows[0];
    return user || errors.UserNotFoundError.throw();
}

const searchQuery = `Select ${searchAttributes.join(", ")} From ${getUserTable()} Where ${searchAttributes.map(attr => `LOWER(${attr}) LIKE :token`).join(" OR ")}`;
/**
 * @param {String} token 
 */
export async function search_users(req, token) {
    token = token.toLowerCase();
    const [rows, _fields] = await connection.execute(searchQuery, { token: `%${token}%` });
    return rows;
}

export async function save_user(user) {
    const oldUser = find_user(getUid(user));
    if (oldUser) {
        const updatedAttributes = modifiableAttributes.filter(attr => oldUser[attr] != user[attr]);
        if (updatedAttributes.length) {
            /** @example "sms = :sms , mail = :mail" */
            const set = updatedAttributes.map(attr => `${attr} = :${attr}`).join(", ");
            const updateQuery = `Update ${getUserTable()} SET ${set} Where ${attributes.uid} = :${attributes.uid}`;
            await connection.execute(updateQuery, user);
        }
    }
}

export async function create_user(uid) {
    const query = `INSERT INTO ${getUserTable()} (${attributes.uid}) VALUES (:uid)`;
    await connection.execute(query, { uid: uid })
    return find_user(uid);
}

export function remove_user(uid) {
    const query = `DELETE FROM ${getUserTable()} WHERE ${attributes.uid} = :uid`;
    return connection.execute(query, { uid: uid });
}


function getMysqlProperty() {
    return getUserDbProperties();
}

function getUserTable() {
    return getMysqlProperty().userTable;
}
