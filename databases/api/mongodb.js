var userDb_controller = require(__dirname + '/../../controllers/user');
var methods;
var mongoose = require('mongoose');
var connection;

exports.initialize = function (callback) {
    connection = mongoose.createConnection('mongodb://' + global.properties.esup.mongodb.address + '/' + global.properties.esup.mongodb.db, function (error) {
        if (error) {
            console.log(error);
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
        if (data[0]) global.properties.esup = data[0];
        else {
            update_api_preferences();
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
    ApiPreferences.remove({}, function (err) {
        if (err) console.log(err);
        var api_preferences = new ApiPreferences(global.properties.esup);
        api_preferences.save(function () {
            console.log("Api Preferences updated");
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
        "message": properties.messages.error.user_not_found
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
        if (err) console.log(err);
        if (typeof(callback) === "function") callback(data);
    });
}

exports.parse_user = function (user) {
    var parsed_user = {};
    parsed_user.totp = {};
    parsed_user.totp.active = user.totp.active;
    parsed_user.totp.transports = available_transports(user.totp.transports, "totp");
    parsed_user.random_code = {};
    parsed_user.random_code.active = user.random_code.active;
    parsed_user.random_code.transports = available_transports(user.random_code.transports, 'random_code');
    parsed_user.bypass = {};
    parsed_user.bypass.active = user.bypass.active;
    parsed_user.bypass.available_code = user.bypass.codes.length;
    parsed_user.bypass.used_code = user.bypass.used_codes;
    parsed_user.bypass.transports = available_transports(user.bypass.transports, "bypass");
    parsed_user.matrix = user.matrix;
    // parsed_user.matrix.active = user.matrix.active;
    return parsed_user;
}

function available_transports(userTransports, method) {
    var available_transports = [];
    for (t in userTransports) {
        if (global.properties.esup.methods[method].transports.indexOf(userTransports[t]) >= 0) available_transports.push(userTransports[t]);
    }
    return available_transports;
}

/**
 * Drop Users
 */
exports.drop = function (req, res, next) {
    UserPreferences.remove({}, function (err, data) {
        if (err) console.log(err);
        console.log('users removed');
        res.send(data);
    });
};
