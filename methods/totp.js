var properties = require(__dirname + '/../properties/properties');
var api_controller = require(__dirname + '/../controllers/api');
var speakeasy = require('speakeasy');
var qrCode = require('qrcode-npm')
var restify = require('restify');
var utils = require(__dirname + '/../services/utils');
var logger = require(__dirname + '/../services/logger').getInstance();

exports.name = "totp";

exports.send_message = function(user, req, res, next) {
    switch (req.params.transport) {
        case 'mail':
            user.totp.window = properties.getMethod('totp').mail_window;
            break;
        case 'sms':
            user.totp.window = properties.getMethod('totp').sms_window;
            break;
        default:
            user.totp.window = properties.getMethod('totp').default_window;
            break;
    }
    user.save( function() {
        api_controller.transport_code(speakeasy.totp({
            secret: user.totp.secret.base32,
            encoding: 'base32'
        }), req, res, next);
    })
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
    logger.debug(utils.getFileName(__filename)+' '+"verify_code: "+user.uid);
    if (user.totp.secret.base32) {
        var checkSpeakeasy = speakeasy.totp.verify({
            secret: user.totp.secret.base32,
            encoding: 'base32',
            token: req.params.otp,
            window: user.totp.window
        });
        if (checkSpeakeasy) {
            user.totp.window = properties.getMethod('totp').default_window;
            user.save( function() {
                logger.info("Valid credentials by "+user.uid);
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
    user.totp.secret = speakeasy.generateSecret({ length: 16 });
    user.save( function() {
        var response = {};
        var qr = qrCode.qrcode(4, 'M');
        qr.addData(user.totp.secret.otpauth_url);
        qr.make();
        response.code = 'Ok';
        response.message = user.totp.secret.base32;
        response.qrCode = qr.createImgTag(4);
        res.send(response);
    });
}

exports.delete_method_secret = function(user, req, res, next) {
    user.totp.active = false;
    user.totp.secret = {};
    user.save( function() {
        res.send({
            "code": "Ok",
            "message": 'Secret removed'
        });
    });
}

exports.get_method_secret = function(user, req, res, next) {
    var response = {};
    var qr = qrCode.qrcode(4, 'M');
    response.code = 'Ok';
    if (!(Object.keys(user.totp.secret).length === 0 && JSON.stringify(user.totp.secret) === JSON.stringify({}))) {
        qr.addData(user.totp.secret.otpauth_url);
        qr.make();
        response.message = user.totp.secret.base32;
        response.qrCode = qr.createImgTag(4);
    }else {
        response.message = "Pas de qrCode, veuillez en générer un.";
        response.qrCode = "";
    }
    res.send(response);
}



exports.user_activate = function(user, req, res, next) {
    user.totp.active = true;
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
    user.totp.active = false;
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
