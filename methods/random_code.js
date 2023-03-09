var properties = require(__dirname + '/../properties/properties');
var api_controller = require(__dirname + '/../controllers/api');
var utils = require(__dirname + '/../services/utils');
var restify = require('restify');
var logger = require(__dirname + '/../services/logger').getInstance();

exports.name = "random_code";

exports.send_message = function(user, req, res, next) {
    var new_otp = user.random_code;
    switch (properties.getMethod('random_code').code_type) {
        case "string":
            new_otp.code = utils.generate_string_code(properties.getMethod('random_code').code_length);
            break;
        case "digit":
            new_otp.code = utils.generate_digit_code(properties.getMethod('random_code').code_length);
            break;
        default:
            new_otp.code = utils.generate_string_code(properties.getMethod('random_code').code_length);
            break;
    }
    validity_time = properties.getMethod('random_code').sms_validity * 60 * 1000;
    validity_time += new Date().getTime();
    new_otp.validity_time = validity_time;
    user.random_code = new_otp;
    user.save( function() {
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
    logger.debug(utils.getFileName(__filename)+' '+"verify_code: "+user.uid);
    if (user.random_code.code == req.params.otp && Date.now() < user.random_code.validity_time) {
        user.random_code.code=null;
        user.random_code.validity_time=null;
        user.save( function() {
            logger.info(utils.getFileName(__filename)+" Valid credentials by "+user.uid);
            res.send({
                "code": "Ok",
                "message": properties.getMessage('success','valid_credentials')
            });
        });
    } else {
        var next = callbacks.pop();
        next(user, req, res, callbacks)
    }
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
    user.random_code.active = true;
    user.save( function() {
        res.send({
            "code": "Ok",
            "message": ""
        });
    });
}

exports.confirm_user_activate = function(user, req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}

exports.user_deactivate = function(user, req, res, next) {
    user.random_code.active = false;
    user.save( function() {
        res.send({
            "code": "Ok",
            "message": ""
        });
    });
}

exports.admin_activate = function(req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}

exports.user_desync = function (user, req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}
