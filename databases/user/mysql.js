import * as properties from '../../properties/properties.js';
import * as mysql from 'mysql';

import { getInstance } from '../../services/logger.js';
const logger = getInstance();

let connection;

export function initialize(callback) {
    connection = mysql.createConnection(properties.getEsupProperty('mysql'));
    if (typeof(callback) === "function") callback();
}

export function find_user(req, res, callback) {
    connection.query("Select * From " + properties.getEsupProperty('mysql').userTable + " u Where u.uid = ?", [req.params.uid], function (err, rows, fields) {
        if (err) throw err;
        if (rows[0]) {
            if (typeof(callback) === "function") callback(rows[0]);
        } else {
            res.status(404);
            res.send({
                "code": "Error",
                "message": properties.getMessage('error','user_not_found')
            });
        }
    });
}

export function save_user(user, callback) {
    connection.query("Select * From " + properties.getEsupProperty('mysql').userTable + " u Where u.uid = ?", [user.uid], function (err, rows, fields) {
        if (err) {
            logger.error('modify error : ' + err);
            throw err;
        }
        if (rows[0]) {
            const q = connection.query("Update "+properties.getEsupProperty('mysql').userTable+" SET "+ properties.getEsupProperty('mysql').transport.sms + " = ? , "+ properties.getEsupProperty('mysql').transport.mail +" = ?  Where uid = ?", [user[properties.getEsupProperty('mysql').transport.sms], user[properties.getEsupProperty('mysql').transport.mail], user.uid], function (err, rows, fields) {
                if (err) {
                    logger.error('modify error : ' + err);
                    throw err;
                }
                if (typeof(callback) === "function") callback();
            });
            logger.debug(q.sql);
        }
    });
}

export function create_user(uid, callback) {
    const new_user = {
        uid : uid
    };
    connection.query("INSERT INTO " + properties.getEsupProperty('mysql').userTable + " SET ?", new_user, function (err, rows, fields) {
        if (err) {
            logger.error('insert error : ' + err);
            throw err;
        }
        if (typeof(callback) === "function") callback();
    });
}

export function remove_user(uid, callback) {
    connection.query("DELETE FROM " + properties.getEsupProperty('mysql').userTable + " WHERE uid=?", [uid], function (err, rows, fields) {
        if (err) {
            logger.error('insert error : ' + err);
            throw err;
        }
        if (typeof(callback) === "function") callback();
    });
}
