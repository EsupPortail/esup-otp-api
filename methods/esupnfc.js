var properties = require(__dirname + '/../properties/properties');
var restify = require('restify');
var utils = require(__dirname + '/../services/utils');
var logger = require(__dirname + '/../services/logger').getInstance();
var sockets = require('../server/sockets');

exports.name = "esupnfc";

exports.locations = function (user, req, res, next) {
    if(user.esupnfc.active) {
	logger.debug("locations: [ESUP-OTP]");
	res.send(["ESUP-OTP"]);
    } else {
	logger.debug("locations: []");
	res.send([]);
    }
};

exports.check_accept_authentication = function (req, res, next) {
    logger.debug("check_accept_authentication: ESUP-OTP");
    res.send("OK");
};

exports.accept_authentication = function (user, req, res, next) {
    logger.debug("accept_authentication: ESUP-OTP");
    user.esupnfc.code = utils.generate_digit_code(properties.getMethod('random_code').code_length);
    user.save( function () {
	sockets.emitCas(user.uid,'userAuth', {"code": "Ok", "otp": user.esupnfc.code});
	logger.debug("sockets.emitCas OK : otp = " + user.esupnfc.code);    
	res.send({
            "code": "Ok",
            "message": properties.getMessage('success', 'valid_credentials')
	});
    });
};

exports.send_message = function (user, req, res, next) {
    logger.debug("send_message: ESUP-OTP");
    //res.send("<h1>Code :</h1><p>" + user.esupnfc.code + "</p>");
    // autologin
    res.send("");
};

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
    user.esupnfc.active = true;
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
    user.esupnfc.active = false;
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

/**
 * Vérifie si l'otp fourni correspond à celui généré
 * si oui: on retourne un réponse positive
 * sinon: on renvoie une erreur 401 InvalidCredentialsError
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.verify_code = function (user, req, res, callbacks) {
    logger.debug(utils.getFileName(__filename) + ' ' + "verify_code: " + user.uid);
    if (user.esupnfc.code == req.params.otp) {
        delete user.esupnfc.code;
        user.save( function () {
            logger.info("Valid credentials by " + user.uid);
            res.send({
                "code": "Ok",
                "message": properties.getMessage('success', 'valid_credentials')
            });
        });
    } else {
        var next = callbacks.pop();
        next(user, req, res, callbacks)
    }
}
