import * as errors from '../../services/errors.js';
import { getUserDbProperties, searchAttributes, modifiableAttributes, allAttributes } from './userUtils.js';
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
    connection = await mysql.createConnection(getMysqlProperty());
}

export function close() {
    return connection.end();
}

const selectQuery = `Select ${allAttributes.join(", ")} From ${getUserTable()} u Where u.uid = :uid`
export async function find_user(uid) {
    const [rows, fields] = await connection.execute(selectQuery, { uid: uid });
    const user = rows[0];
    return user || errors.UserNotFoundError.throw();
}

const searchQuery = `Select ${searchAttributes.join(", ")} From ${getUserTable()} Where ${searchAttributes.map(attr => `LOWER(${attr}) LIKE :token`).join(" OR ")}`;
/**
 * @param {String} token 
 */
export async function search_users(req, token) {
    token = token.toLowerCase();
    const [rows, fields] = await connection.execute(searchQuery, { token: `%${token}%` });
    return rows;
}

export async function save_user(user) {
    const oldUser = find_user(user.uid);
    if (oldUser) {
        const updatedAttributes = modifiableAttributes.filter(attr => oldUser[attr] != user[attr]);
        if (updatedAttributes.length) {
            /** @example "sms = :sms , mail = :mail" */
            const set = updatedAttributes.map(attr => `${attr} = :${attr}`).join(", ");
            const updateQuery = `Update ${getUserTable()} SET ${set} Where uid = :uid`;
            await connection.execute(updateQuery, user);
        }
    }
}

export async function create_user(uid) {
    const new_user = {
        uid: uid
    };
    const query = "INSERT INTO " + getUserTable() + " SET ?";
    const [rows, fields] = await connection.execute(query, new_user)
    return rows[0];
}

export function remove_user(uid) {
    const query = "DELETE FROM " + getUserTable() + " WHERE uid = :uid";
    return connection.query(query, { uid: uid });
}


function getMysqlProperty() {
    return getUserDbProperties();
}

function getUserTable() {
    return getMysqlProperty().userTable;
}
