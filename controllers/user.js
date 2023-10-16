var properties = require(__dirname + '/../properties/properties');
var utils = require(__dirname + '/../services/utils');
var userDb;

var logger = require(__dirname + '/../services/logger').getInstance();

exports.initialize= function(callback) {
        if (properties.getEsupProperty('apiDb')) {
        userDb = require(__dirname + '/../databases/user/' + properties.getEsupProperty('userDb'));
        userDb.initialize(callback);
        exports.userDb = userDb;
    } else logger.error(utils.getFileName(__filename)+' '+"Unknown apiDb");
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
        if (user[properties.getEsupProperty(properties.getEsupProperty('userDb')).transport.mail]) result.mail = utils.cover_string(user[properties.getEsupProperty(properties.getEsupProperty('userDb')).transport.mail], 4, 5);
        if (user[properties.getEsupProperty(properties.getEsupProperty('userDb')).transport.sms]) result.sms = utils.cover_string(user[properties.getEsupProperty(properties.getEsupProperty('userDb')).transport.sms], 2, 2);
        if (typeof(callback) === "function") callback(result);
        else {
            response.code = "Ok";
            response.message = properties.getMessage('success','transports_found');
            response.transports_list = result;
            res.send(response);
        }
    });
}



exports.send_sms = function(req, res, callback) {
    userDb.find_user(req, res, function(user) {
        if (typeof(callback) === "function") callback(user[properties.getEsupProperty(properties.getEsupProperty('userDb')).transport.sms]);
    });
}


exports.send_mail = function(req, res, callback) {
    userDb.find_user(req, res, function(user) {
        if (typeof(callback) === "function") callback(user[properties.getEsupProperty(properties.getEsupProperty('userDb')).transport.mail]);
    });
}

exports.update_transport = function(req, res, next) {
    userDb.find_user(req, res, function(user) {
        user[properties.getEsupProperty(properties.getEsupProperty('userDb')).transport[req.params.transport]]=req.params.new_transport;
        userDb.save_user(user, function(){
            logger.log('archive', {
                message: [
                    {
                        uid: req.params.uid,
                        clientIp: req.headers['x-client-ip'],
                        clientUserAgent: req.headers['client-user-agent'],
                        action: 'save',
                        method: req.params.transport,
                        [req.params.transport === 'sms' ? 'phoneNumber' : 'Email']: req.params.new_transport
                    }
                ]
            });
            res.send({
                code: 'Ok',
                message: properties.getMessage('success','update')
            });
        });
    });
}

exports.delete_transport = function(req, res, next) {
    userDb.find_user(req, res, function(user) {
        user[properties.getEsupProperty(properties.getEsupProperty('userDb')).transport[req.params.transport]]="";
        logger.log('archive', {
            message: [
                {
                    uid: req.params.uid,
                    clientIp: req.headers['x-client-ip'],
                    clientUserAgent: req.headers['client-user-agent'],
                    action: 'delete',
                    method: req.params.transport
                }
            ]
        });
        userDb.save_user(user, function(){
            res.send({
                code: 'Ok',
                message: properties.getMessage('success','method_not_found')
            });
        });
    });
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