var userDb_controller = require(__dirname + '/../../controllers/user');
var properties = require(__dirname + '/../../properties/properties');
var utils = require(__dirname + '/../../services/utils');
var methods;
var mongoose = require('mongoose');
var connection;

var logger = require(__dirname + '/../../services/logger').getInstance();

exports.initialize = function (callback) {
    connection = mongoose.createConnection('mongodb://' + properties.getEsupProperty('mongodb').address + '/' + properties.getEsupProperty('mongodb').db, function (error) {
        if (error) {
            logger.error(utils.getFileName(__filename)+' '+error);
        } else {
            initiatilize_api_preferences();
            initiatilize_user_model();
            methods = require(__dirname + '/../../methods/methods');
            if (typeof(callback) === "function") callback();
        }
    });
}

var Schema = mongoose.Schema;

/** Api Preferences **/
var ApiPreferences;

function initiatilize_api_preferences() {
    var ApiPreferencesSchema = new Schema(require(__dirname + '/apiPreferencesSchema').schema);
    connection.model('ApiPreferences', ApiPreferencesSchema, 'ApiPreferences');
    ApiPreferences = connection.model('ApiPreferences');
    ApiPreferences.find({}).exec(function (err, data) {
        if (data[0]) {
            var prefs = properties.getEsupProperty('methods');
            for(p in data[0]){
                prefs[p] = data[0][p];
            }
            properties.setEsupProperty('methods',prefs);
            update_api_preferences();
        }else{
            create_api_preferences();
        }
    });
}

/**
 * Sauvegarde les préférences de l'api
 *
 * @param req requete HTTP
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.update_api_preferences = update_api_preferences;

function update_api_preferences() {
    ApiPreferences.find({}).exec(function (err, data) {
        if (data[0]) {
            var prefs = properties.getEsupProperty('methods');
            for(p in prefs){
                data[0][p]=prefs[p];
            }
            var api_preferences = data[0];
            api_preferences.save(function () {
                logger.info(utils.getFileName(__filename)+' '+"Api Preferences updated");
            });
        }
    });
}

function create_api_preferences() {
    ApiPreferences.remove({}, function (err) {
        if (err) logger.error(utils.getFileName(__filename)+' '+err);
        var api_preferences = new ApiPreferences(properties.getEsupProperty('methods'));
        api_preferences.save(function () {
            logger.info(utils.getFileName(__filename)+' '+"Api Preferences created");
        });
    });
}
/** User Model **/
var UserPreferences;

function initiatilize_user_model() {
    var UserPreferencesSchema = new Schema(require(__dirname + '/userPreferencesSchema').schema);
    connection.model('UserPreferences', UserPreferencesSchema, 'UserPreferences');
    UserPreferences = connection.model('UserPreferences');
}

/**
 * Retourne l'utilisateur mongo
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.find_user = function (req, res, callback) {
    var response = {
        "code": "Error",
        "message": properties.getMessage('error','user_not_found')
    };
    UserPreferences.find({
        'uid': req.params.uid
    }).exec(function (err, data) {
        if (data[0]) {
            if (typeof(callback) === "function") callback(data[0]);
        } else {
            userDb_controller.user_exists(req, res, function (user) {
                if (user) {
                    create_user(user.uid, callback);
                } else res.send(response);
            });
        }
    });
}

/**
 * Sauve l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.save_user = function (user, callback) {
    user.save(function () {
        if (typeof(callback) === "function") callback();
    })
}

/**
 * Crée l'utilisateur
 *
 * @param req requete HTTP
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.create_user = function (uid, callback) {
    create_user(uid, callback);
}

function create_user(uid, callback) {
    var new_user = new UserPreferences({
        uid: uid
    });
    new_user.save(function () {
        if (typeof(callback) === "function") callback(new_user);
    })
}

/**
 * Supprime l'utilisateur
 *
 * @param req requete HTTP
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.remove_user = function (uid, callback) {
    UserPreferences.remove({uid: uid}, function (err, data) {
        if (err) logger.error(err);
        if (typeof(callback) === "function") callback(data);
    });
}

exports.parse_user = function (user) {
    var parsed_user = {};
    parsed_user.codeRequired = false;
    parsed_user.waitingFor = false;
    if (properties.getMethod('totp').activate) {
        if(user.totp.active)parsed_user.codeRequired = true;
        parsed_user.totp = {
            active: user.totp.active,
            transports: available_transports(user.totp.transports, "totp")
        };
    }
    if (properties.getMethod('random_code').activate) {
        if(user.random_code.active)parsed_user.codeRequired = true;
        parsed_user.random_code = {
            active: user.random_code.active,
            transports: available_transports(user.random_code.transports, 'random_code')
        };
    }
    if (properties.getMethod('bypass').activate) {
        if(user.bypass.active)parsed_user.codeRequired = true;
        parsed_user.bypass = {
            active: user.bypass.active,
            available_code: user.bypass.codes.length,
            used_code: user.bypass.used_codes,
            transports: available_transports(user.bypass.transports, "bypass")
        };
    }
    //if(properties.getMethod('matrix').activate){
    //  parsed_user.matrix = user.matrix;
    //}
    // parsed_user.matrix.active = user.matrix.active;
    if(properties.getMethod('push').activate){
        if(user.push.active)parsed_user.waitingFor = true;
        parsed_user.push = {
            device : {
                platform : user.push.device.platform,
                phone_number : user.push.device.phone_number,
                manufacturer : user.push.device.manufacturer,
                model : user.push.device.model
            },
            active : user.push.active,
            transports: available_transports(user.push.transports, "push")
        };
    }
    return parsed_user;
}

function available_transports(userTransports, method) {
    var available_transports = [];
    for (t in userTransports) {
        if (properties.getMethod(method).transports.indexOf(userTransports[t]) >= 0) available_transports.push(userTransports[t]);
    }
    return available_transports;
}

/**
 * Drop Users
 */
exports.get_uids = function (req, res, next) {
    UserPreferences.find({}, function (err, data) {
        if (err) logger.error(utils.getFileName(__filename)+' '+err);
        var result = [];
        for(up in data){
            result.push(data[up].uid);
        }
        res.send({
            code:"Ok",
            uids:result
        });
    });
};

/**
 * Drop Users
 */
exports.drop = function (req, res, next) {
    UserPreferences.remove({}, function (err, data) {
        if (err) logger.error(utils.getFileName(__filename)+' '+err);
        logger.debug('users removed');
        res.send(data);
    });
};
