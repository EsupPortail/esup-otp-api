var winston = require('winston');
var utils = require(__dirname + '/../services/utils');
var userDb;

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
            filename: __dirname+'/../logs/server.log',
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
            filename: __dirname+'/../logs/debug.log',
            json: false,
            formatter: function(options) {
                // Return string will be passed to logger.
                return options.timestamp() +' '+ options.level.toUpperCase() +' '+__filename.split(global.base_dir)[1]+' '+ (undefined !== options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
            }
        })
    ]
});

exports.initialize= function(callback) {
    if (global.properties.esup.apiDb) {
        userDb = require(__dirname + '/../databases/user/' + global.properties.esup.userDb);
        userDb.initialize(callback);
        exports.userDb = userDb;
    } else console.log("Unknown apiDb");
}

exports.user_exists= function(req, res, callback){
    userDb.find_user(req, res, function(user){
        if (typeof(callback) === "function") callback(user);
    })
}


exports.get_available_transports = function(req, res, callback) {
    userDb.find_user(req, res, function(user) {
        var response = {};
        var result = {};
        if (user[global.properties.esup[global.properties.esup.userDb].transport.mail]) result.mail = utils.cover_string(user[global.properties.esup[global.properties.esup.userDb].transport.mail], 4, 5);
        if (user[global.properties.esup[global.properties.esup.userDb].transport.sms]) result.sms = utils.cover_string(user[global.properties.esup[global.properties.esup.userDb].transport.sms], 2, 2);
        if (typeof(callback) === "function") callback(result);
        else {
            console.log()
            response.code = "Ok";
            response.message = properties.messages.success.transports_found;
            response.transports_list = result;
            res.send(response);
        }
    });
}



exports.send_sms = function(req, res, callback) {
    userDb.find_user(req, res, function(user) {
        if (typeof(callback) === "function") callback(user[global.properties.esup[global.properties.esup.userDb].transport.sms]);
    });
}


exports.send_mail = function(req, res, callback) {
    userDb.find_user(req, res, function(user) {
        if (typeof(callback) === "function") callback(user[global.properties.esup[global.properties.esup.userDb].transport.mail]);
    });
}

exports.update_transport = function(req, res, next) {
    userDb.find_user(req, res, function(user) {
        user[global.properties.esup[global.properties.esup.userDb].transport[req.params.transport]]=req.params.new_transport;
        userDb.save_user(user, function(){
            res.send({
                code: 'Ok',
                message: properties.messages.success.update
            });
        });
    });
}

exports.delete_transport = function(req, res, next) {
    userDb.find_user(req, res, function(user) {
        user[global.properties.esup[global.properties.esup.userDb].transport[req.params.transport]]="";
        userDb.save_user(user, function(){
            res.send({
                code: 'Ok',
                message: properties.messages.success.update
            });
        });
    });
}

exports.delete_transport = function(req, res, next) {
    userDb.delete_transport(req, res, next);
}

/**
 * Supprime l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.remove_user=function(uid, callback) {
    userDb.remove_user(uid, callback);
}

/**
 * Crée l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.create_user=function(uid, callback) {
    userDb.create_user(uid, callback);
}

/**
 * Sauve l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.save_user=function(user, callback) {
    userDb.save_user(user, callback);
}