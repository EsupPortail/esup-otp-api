var properties = require(process.cwd() + '/properties/properties');
var apiDb_controller = require(process.cwd() + '/controllers/api/' + properties.esup.apiDb);
var utils = require(process.cwd() + '/services/utils');
var restify = require('restify');

exports.name = "bypass";

exports.send_code = function(user, req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.messages.error.unvailable_method_operation
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
            apiDb_controller.save_user(user, function() {
                res.send({
                    "code": "Ok",
                    "message": properties.messages.success.valid_credentials
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
    for (var it = 0; it < properties.esup.methods.bypass.codes_number; it++) {
        switch (properties.esup.methods.simple_generator.code_type) {
            case "string":
                codes.push(utils.generate_string_code(properties.esup.methods.bypass.code_length));
                break;
            case "digit":
                codes.push(utils.generate_digit_code(properties.esup.methods.bypass.code_length));
                break;
            default:
                codes.push(utils.generate_string_code(properties.esup.methods.bypass.code_length));
                break;
        }
    }
    apiDb_controller.save_user(user, function() {
        res.send({
            code: "Ok",
            message: "",
            codes: codes

        });
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

exports.user_activate = function(req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.messages.error.unvailable_method_operation
    });
}

exports.admin_activate = function(req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.messages.error.unvailable_method_operation
    });
}
