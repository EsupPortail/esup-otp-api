var properties = require(__dirname + '/../../properties/properties');
var utils = require(__dirname + '/../../services/utils');
var mongoose = require('mongoose');
var connection;

var logger = require(__dirname + '/../../services/logger').getInstance();

const definedUserSchema = require(`./userSchema`);

exports.initialize = function(callback) {
    connection = mongoose.createConnection('mongodb://' + properties.getEsupProperty('mongodb').address + '/' + properties.getEsupProperty('mongodb').db, function(error) {
        if (error) {
            logger.error(utils.getFileName(__filename)+' '+error);
        } else {
            initiatilize_user_model();
            if (typeof(callback) === "function") callback();
        }
    });
}

/** User Model **/
var User;

function initiatilize_user_model() {
    var Schema = mongoose.Schema;

    var UserSchema = new Schema(definedUserSchema.schema);

    connection.model('User', UserSchema, 'User');
    User = connection.model('User');
}

function find_user(req, res, callback) {
    var response = {
        "code": "Error",
        "message": properties.getMessage('error', 'user_not_found')
    };
    User.find({
        'uid': req.params.uid
    }).exec(function(err, data) {
        if (data[0]) {
            if (typeof(callback) === "function") callback(data[0]);
        } else {
            if(properties.getEsupProperty('auto_create_user'))create_user(req.params.uid, callback);
            else res.send(response);
        }
    });
}
exports.find_user= find_user;

function create_user(uid, callback) {
    var new_user = new User({
        uid : uid
    });
    new_user.save(function() {
        if (typeof(callback) === "function") callback(new_user);
    });
}
exports.create_user= create_user;

exports.save_user=function(user, callback) {
    user.save(function() {
        if (typeof(callback) === "function") callback();
    })
}

/**
 * Supprime l'utilisateur
 *
 * @param req requete HTTP
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.remove_user=function(uid, callback) {
    User.remove({uid:uid}, function(err, data) {
        if (err) logger.error(utils.getFileName(__filename)+' '+error);
        if (typeof(callback) === "function") callback(data);
    });
}
