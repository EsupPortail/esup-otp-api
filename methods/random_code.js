var properties = require(process.cwd() + '/properties/properties');
var api_controller = require(process.cwd() + '/controllers/api');
var utils = require(process.cwd() + '/services/utils');
var restify = require('restify');

exports.name = "random_code";

exports.send_code = function(user, req, res, next) {
    var new_otp = user.random_code;
    switch (properties.esup.methods.random_code.code_type) {
        case "string":
            new_otp.code = utils.generate_string_code(properties.esup.methods.random_code.code_length);
            break;
        case "digit":
            new_otp.code = utils.generate_digit_code(properties.esup.methods.random_code.code_length);
            break;
        default:
            new_otp.code = utils.generate_string_code(properties.esup.methods.random_code.code_length);
            break;
    }
    validity_time = properties.esup.methods.random_code.mail_validity * 60 * 1000;
    validity_time += new Date().getTime();
    new_otp.validity_time = validity_time;
    user.random_code = new_otp;
    api_controller.save_user(user, function() {
        api_controller.transport_code(new_otp.code, req, res, next);
    });
}

/**
 * Vérifie si le code fourni correspond à celui stocké en base de données
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.verify_code = function(user, req, res, callbacks) {
    if (user.random_code.code == req.params.otp && Date.now() < user.random_code.validity_time) {
        delete user.random_code.code;
        delete user.random_code.validity_time;
        api_controller.save_user(user, function() {
            res.send({
                "code": "Ok",
                "message": properties.messages.success.valid_credentials
            });
        });
    } else {
        var next = callbacks.pop();
        next(user, req, res, callbacks)
    }
}

exports.generate_method_secret = function(req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.messages.error.unvailable_method_operation
    });
}

exports.delete_method_secret = function(req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.messages.error.unvailable_method_operation
    });
}

exports.get_method_secret = function(req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.messages.error.unvailable_method_operation
    });
}

exports.user_activate = function(user, req, res, next) {
    user.random_code.active = true;
    api_controller.save_user(user, function() {
        res.send({
            "code": "Ok",
            "message": ""
        });
    });
}

exports.user_deactivate = function(user, req, res, next) {
    user.random_code.active = false;
    api_controller.save_user(user, function() {
        res.send({
            "code": "Ok",
            "message": ""
        });
    });
}

exports.admin_activate = function(req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.messages.error.unvailable_method_operation
    });
}
