var properties = require(__dirname + '/../properties/properties');
var api_controller = require(__dirname + '/../controllers/api');
var utils = require(__dirname + '/../services/utils');
var restify = require('restify');
var logger = require(__dirname + '/../services/logger').getInstance();

exports.name = "bypass";

exports.send_message = function(user, req, res, next) {
    res.status(404);
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
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
    if (user.bypass.codes) {
        var checkOtp = false;
        var codes = user.bypass.codes;
        for (code in codes) {
            if (user.bypass.codes[code] == req.params.otp) {
                checkOtp = true;
                codes.splice(code, 1);
                user.bypass.codes = codes;
                user.bypass.used_codes += 1;
            }
        }
        if (checkOtp) {
            user.save( function() {
                logger.info(utils.getFileName(__filename)+" Valid credentials by "+user.uid);
                res.status(200);
                res.send({
                    "code": "Ok",
                    "message": properties.getMessage('success','valid_credentials')
                });
            });
        } else {
            var next = callbacks.pop();
            next(user, req, res, callbacks);
        }
    } else {
        var next = callbacks.pop();
        next(user, req, res, callbacks);
    }
}

exports.generate_method_secret = function(user, req, res, next) {
    var codes = new Array();
    for (var it = 0; it < properties.getMethod('bypass').codes_number; it++) {
        switch (properties.getMethod('bypass').code_type) {
            case "string":
                codes.push(utils.generate_string_code(properties.getMethod('bypass').code_length));
                break;
            case "digit":
                codes.push(utils.generate_digit_code(properties.getMethod('bypass').code_length));
                break;
            default:
                codes.push(utils.generate_string_code(properties.getMethod('bypass').code_length));
                break;
        }
    }
    user.bypass.codes = codes;
    logger.log('archive', {
        message: [
            {
                uid: req.params.uid,
                clientIp: req.headers['x-client-ip'],
                clientUserAgent: req.headers['client-user-agent'],
                action: 'generate codes'
            }
        ]
    });
    user.save( function() {
        res.status(200);
        res.send({
            code: "Ok",
            message: "",
            codes: codes

        });
    });
}

exports.delete_method_secret = function(user, req, res, next) {
    user.bypass.active = false;
    user.bypass.codes = [];
    user.save( function() {
        res.status(200);
        res.send({
            "code": "Ok",
            "message": 'Secret removed'
        });
    });
}

exports.get_method_secret = function(user, req, res, next) {
    res.status(404);
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}

exports.user_activate = function(user, req, res, next) {
    user.bypass.active = true;
    user.save( function() {
        res.status(200);
        res.send({
            "code": "Ok",
            "message": ""
        });
    });
}

exports.confirm_user_activate = function(user, req, res, next) {
    res.status(404);
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}

exports.user_deactivate = function(user, req, res, next) {
    user.bypass.active = false;
    user.save( function() {
        res.status(200);
        res.send({
            "code": "Ok",
            "message": ""
        });
    });
}

exports.admin_activate = function(req, res, next) {
    res.status(404);
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}

exports.user_desync = function (user, req, res, next) {
    res.status(404);
    res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}