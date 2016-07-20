/**
 * Created by abousk01 on 20/07/2016.
 */
var properties = require(__dirname + '/../properties/properties');
var qrCode = require('qrcode-npm')
var restify = require('restify');
var utils = require(__dirname + '/../services/utils');
var logger = require(__dirname + '/../services/logger').getInstance();

exports.name = "push";

exports.send_message = function(user, req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}

/**
 * Vérifie si l'otp fourni correspond à celui généré
 * si oui: on retourne un réponse positive
 * sinon: on renvoie une erreur 401 InvalidCredentialsError
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.verify_code = function(user, req, res, callbacks) {
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}


exports.generate_method_secret = function(user, req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}

exports.delete_method_secret = function(user, req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}

exports.get_method_secret = function(user, req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}



exports.user_activate = function(user, req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}

exports.user_deactivate = function(user, req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}

exports.admin_activate = function(req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}
