var utils = require(__dirname + '/../../services/utils');
var mysql = require('mysql');
var winston = require('winston');

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            timestamp: function() {
                return new Date(Date.now());
            },
            formatter: function(options) {
                // Return string will be passed to logger.
                return options.timestamp() +' '+ options.level.toUpperCase() +' '+__filename.split(global.base_dir)[1]+' '+ (undefined !== options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
            }
        }),
        new (winston.transports.File)({
            timestamp: function() {
                return ''+new Date(Date.now());
            },
            name: 'info-file',
            filename: __dirname+'/../../logs/server.log',
            json: false,
            formatter: function(options) {
                // Return string will be passed to logger.
                return options.timestamp() +' '+ options.level.toUpperCase() +' '+__filename.split(global.base_dir)[1]+' '+ (undefined !== options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
            }
        }),
        new (winston.transports.File)({
            timestamp: function() {
                return ''+new Date(Date.now());
            },
            name: 'debug-file',
            level: 'debug',
            filename: __dirname+'/../../logs/debug.log',
            json: false,
            formatter: function(options) {
                // Return string will be passed to logger.
                return options.timestamp() +' '+ options.level.toUpperCase() +' '+__filename.split(global.base_dir)[1]+' '+ (undefined !== options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
            }
        })
    ]
});

var connection;

exports.initialize = function (callback) {
    connection = mysql.createConnection(global.properties.esup.mysql);
    if (typeof(callback) === "function") callback();
}

function find_user(req, res, callback) {
    connection.query("Select * From " + global.properties.esup.mysql.userTable + " u Where u.uid = ?", [req.params.uid], function (err, rows, fields) {
        if (err) throw err;
        if (rows[0]) {
            if (typeof(callback) === "function") callback(rows[0]);
        } else res.send({
            "code": "Error",
            "message": properties.messages.error.user_not_found
        });
    });
}

exports.find_user = find_user;

exports.save_user = function (user, callback) {
    connection.query("Select * From " + global.properties.esup.mysql.userTable + " u Where u.uid = ?", [user.uid], function (err, rows, fields) {
        if (err) {
            logger.error('modify error : ' + err);
            throw err;
        }
        if (rows[0]) {
            var q = connection.query("Update "+global.properties.esup.mysql.userTable+" SET "+ global.properties.esup.mysql.transport.sms + " = ? , "+ global.properties.esup.mysql.transport.mail +" = ?  Where uid = ?", [user[global.properties.esup.mysql.transport.sms], user[global.properties.esup.mysql.transport.mail], user.uid], function (err, rows, fields) {
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

function create_user(uid, callback) {
    var new_user = {
        uid : uid
    };
    connection.query("INSERT INTO " + global.properties.esup.mysql.userTable + " SET ?", new_user, function (err, rows, fields) {
        if (err) {
            logger.error('insert error : ' + err);
            throw err;
        }
        if (typeof(callback) === "function") callback();
    });
}
exports.create_user = create_user;

exports.remove_user = function (uid, callback) {
    connection.query("DELETE FROM " + global.properties.esup.mysql.userTable + " WHERE uid=?", [uid], function (err, rows, fields) {
        if (err) {
            logger.error('insert error : ' + err);
            throw err;
        }
        if (typeof(callback) === "function") callback();
    });
}
