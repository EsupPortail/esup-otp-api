var properties = require(process.cwd() + '/properties/properties');
var apiDb_controller = require(process.cwd() + '/controllers/api/' + properties.esup.apiDb);
var speakeasy = require('speakeasy');
var qrCode = require('qrcode-npm')
var restify = require('restify');

exports.name = "google_authenticator";

exports.send_code = function(user, req, res, next) {
    switch (req.params.transport) {
        case 'mail':
            user.google_authenticator.window = properties.esup.methods.google_authenticator.mail_window;
            break;
        case 'sms':
            user.google_authenticator.window = properties.esup.methods.google_authenticator.sms_window;
            break;
        default:
            user.google_authenticator.window = properties.esup.methods.google_authenticator.default_window;
            break;
    }
    apiDb_controller.save_user(user, function() {
        apiDb_controller.transport_code(speakeasy.totp({
            secret: user.google_authenticator.secret.base32,
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
    var checkSpeakeasy = speakeasy.totp.verify({
        secret: user.google_authenticator.secret.base32,
        encoding: 'base32',
        token: req.params.otp,
        window: user.google_authenticator.window
    });
    if (checkSpeakeasy) {
        user.google_authenticator.window = properties.esup.methods.google_authenticator.default_window;
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
}

exports.generate_method_secret = function(user, req, res, next) {
    user.google_authenticator.secret = speakeasy.generateSecret({ length: 16 });
    apiDb_controller.save_user(user, function() {
        var response = {};
        var qr = qrCode.qrcode(4, 'M');
        qr.addData(user.google_authenticator.secret.otpauth_url);
        qr.make();
        response.code = 'Ok';
        response.message = user.google_authenticator.secret.base32;
        response.qrCode = qr.createImgTag(4);
        res.send(response);
    });
}

exports.delete_method_secret = function(user, req, res, next) {
    user.google_authenticator.active = false;
    user.google_authenticator.secret = {};
    apiDb_controller.save_user(user, function() {
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
    if (!(Object.keys(user.google_authenticator.secret).length === 0 && JSON.stringify(user.google_authenticator.secret) === JSON.stringify({}))) {
        qr.addData(user.google_authenticator.secret.otpauth_url);
        qr.make();
        response.message = user.google_authenticator.secret.base32;
        response.qrCode = qr.createImgTag(4);
    }else {
        response.message = "Pas de qrCode, veuillez en générer un.";
        response.qrCode = "";
    }
    res.send(response);
}



exports.user_activate = function(user, req, res, next) {
    user.google_authenticator.active = true;
    apiDb_controller.save_user(user, function() {
        res.send({
            "code": "Ok",
            "message": ""
        });
    });
}

exports.user_deactivate = function(user, req, res, next) {
    user.google_authenticator.active = false;
    apiDb_controller.save_user(user, function() {
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
