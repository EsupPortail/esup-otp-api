var properties = require(__dirname + '/../../properties/properties');
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
    connection = mysql.createConnection(properties.getEsupProperty('mysql'));
    if (typeof(callback) === "function") callback();
}

function find_user(req, res, callback) {
    connection.query("Select * From " + properties.getEsupProperty('mysql').userTable + " u Where u.uid = ?", [req.params.uid], function (err, rows, fields) {
        if (err) throw err;
        if (rows[0]) {
            if (typeof(callback) === "function") callback(rows[0]);
        } else res.send({
            "code": "Error",
            "message": properties.getMessage('error','user_not_found')
        });
    });
}

exports.find_user = find_user;

exports.save_user = function (user, callback) {
    connection.query("Select * From " + properties.getEsupProperty('mysql').userTable + " u Where u.uid = ?", [user.uid], function (err, rows, fields) {
        if (err) {
            logger.error('modify error : ' + err);
            throw err;
        }
        if (rows[0]) {
            var q = connection.query("Update "+properties.getEsupProperty('mysql').userTable+" SET "+ properties.getEsupProperty('mysql').transport.sms + " = ? , "+ properties.getEsupProperty('mysql').transport.mail +" = ?  Where uid = ?", [user[properties.getEsupProperty('mysql').transport.sms], user[properties.getEsupProperty('mysql').transport.mail], user.uid], function (err, rows, fields) {
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
    connection.query("INSERT INTO " + properties.getEsupProperty('mysql').userTable + " SET ?", new_user, function (err, rows, fields) {
        if (err) {
            logger.error('insert error : ' + err);
            throw err;
        }
        if (typeof(callback) === "function") callback();
    });
}
exports.create_user = create_user;

exports.remove_user = function (uid, callback) {
    connection.query("DELETE FROM " + properties.getEsupProperty('mysql').userTable + " WHERE uid=?", [uid], function (err, rows, fields) {
        if (err) {
            logger.error('insert error : ' + err);
            throw err;
        }
        if (typeof(callback) === "function") callback();
    });
}
