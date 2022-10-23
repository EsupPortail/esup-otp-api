var properties = require(__dirname + '/../properties/properties');
var api_controller = require(__dirname + '/../controllers/api');
var qrcode = require('qrcode');
var restify = require('restify');
var utils = require(__dirname + '/../services/utils');
var logger = require(__dirname + '/../services/logger').getInstance();
const { authenticator } = require('otplib');

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
        api_controller.transport_code(authenticator.generate(user.totp.secret.base32), req, res, next);
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
    if (user.totp.secret) {
        var isValid = authenticator.verify({"token":req.params.otp, "secret":user.totp.secret.base32});
        if (isValid) {
            user.totp.window = properties.getMethod('totp').default_window;
            user.save( function() {
                logger.info(utils.getFileName(__filename)+" Valid credentials by "+user.uid);
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
    var secret_base32 = authenticator.generateSecret(16);
    var secret_otpauth_url=authenticator.keyuri(user.uid, properties.getMethod('totp').name, secret_base32);
    user.totp.secret={base32:secret_base32,otpauth_url:secret_otpauth_url};
    user.save( function() {    
	var response = {};
        response.code = 'Ok';
        response.message = user.totp.secret.base32;
        qrcode.toDataURL(user.totp.secret.otpauth_url, (err, imageUrl) => {
	  if (err) {
	    logger.error('Error with QR');
	    return;
	  }
	response.qrCode = "<img src='".concat(imageUrl,"'width='164' height='164'>"); 
	res.send(response); 
	});      
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
  res.send({
        "code": "Error",
        "message": properties.getMessage('error','unvailable_method_operation')
    });   
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
