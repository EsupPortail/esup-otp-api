import * as properties from '../../properties/properties.js';
import * as errors from '../../services/errors.js';
import * as userUtils from './userUtils.js';
import * as mysql from 'mysql2/promise';

/**
 * @type mysql.Connection
 */
let connection;

export async function initialize() {
    connection = await mysql.createConnection(getMysqlProperty());
}

export function close() {
    return connection.end();
}

export async function find_user(uid) {
    const query = "Select * From " + getUserTable() + " u Where u.uid = ?";
    const [rows, fields] = await connection.execute(query, [uid]);
    const user = rows[0];
    return user || errors.UserNotFoundError.throw();
}

export async function save_user(user) {
    const selectQuery = "Select * From " + getUserTable() + " u Where u.uid = ?";
    const [rows, fields] = await connection.execute(selectQuery, [user.uid]);
    if (rows[0]) {
        const updateQuery = "Update " + getUserTable() + " SET " + getMysqlProperty().transport.sms + " = ? , " + getMysqlProperty().transport.mail + " = ?  Where uid = ?";
        const updateQueryParams = [userUtils.getSms(user), userUtils.getMail(user), user.uid];
        await connection.execute(updateQuery, updateQueryParams);
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
    const query = "DELETE FROM " + getUserTable() + " WHERE uid=?";
    return connection.query(query, [uid]);
}


function getMysqlProperty() {
    return properties.getEsupProperty('mysql');
}

function getUserTable() {
    return getMysqlProperty().userTable;
}