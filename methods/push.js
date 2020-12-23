/**
 * Created by abousk01 on 20/07/2016.
 */
var api_controller = require(__dirname + '/../controllers/api');
var properties = require(__dirname + '/../properties/properties');
var restify = require('restify');
var utils = require(__dirname + '/../services/utils');
var logger = require(__dirname + '/../services/logger').getInstance();
var gcm = require('node-gcm');
var qrCode = require('qrcode-npm');
var sockets = require('../server/sockets');

// Set up the sender with you API key, prepare your recipients' registration tokens.
var opts={};
if(properties.getEsupProperty('proxyUrl'))opts={'proxy': properties.getEsupProperty('proxyUrl')};
var sender = new gcm.Sender(properties.getMethodProperty('push', 'serverKey'), opts);

exports.name = "push";

exports.send_message = function (user, req, res, next) {
    user.push.code = utils.generate_digit_code(properties.getMethod('random_code').code_length);
    var lt = req.params.lt != undefined ? req.params.lt : utils.generate_string_code(30);
    logger.debug("gcm.Message with 'lt' as secret : " + lt);    
    var message = new gcm.Message({
        priority: "high",
        data: {
            title: "Esup Auth",
            body: "Demande de connexion à votre compte",
            text: "Demande de connexion à votre compte",
            action: 'auth',
            uid: user.uid,
            lt: lt
        },
        to: user.push.device.gcm_id
    });

    var regTokens = [user.push.device.gcm_id];

    user.save( function () {
	logger.debug("send gsm push ...");
        sender.send(message, {registrationTokens: regTokens}, function (err, response) {
            if (err) {
                logger.info(err);
                res.send({
                    "code": "Error",
                    "message": JSON.stringify(err)
                });
            } else {
                if(response.failure>0){
                    logger.debug(response);
                    if(response.results[0].error == "NotRegistered"){
                        user_unactivate(user, req, res, next);
                    };
                }else {
		    logger.debug("send gsm push ok : " + response);
		    res.send({
			"code": "Ok",
			"message": response
		    });
		}
            }
        });
    });
};

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
    if (user.push.code == req.params.otp) {
        delete user.push.code;
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


exports.generate_method_secret = function (user, req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.getMessage('error', 'unvailable_method_operation')
    });
}

exports.delete_method_secret = function (user, req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.getMessage('error', 'unvailable_method_operation')
    });
}

exports.get_method_secret = function (user, req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.getMessage('error', 'unvailable_method_operation')
    });
}


exports.user_activate = function (user, req, res, next) {
    var activation_code = utils.generate_digit_code(6);
    user.push.activation_code = activation_code;
    var qr = qrCode.qrcode(10, 'M');
    var http = 'http://';
    if(req.headers["x-forwarded-proto"])http=req.headers["x-forwarded-proto"]+"://";
    var host = req.headers.host;
    if(req.headers["x-forwarded-host"])host=req.headers["x-forwarded-host"].replace(/,.*/,'');
    qr.addData(http+host+'/users/'+user.uid+'/methods/push/'+activation_code);
    qr.make();
    user.save( function () {
        res.send({
            "code": "Ok",
            "message1": properties.getMessage('success', 'push_confirmation1'),
            "message2": properties.getMessage('success', 'push_confirmation2'),
            "message3": properties.getMessage('success', 'push_confirmation3'),
            "message4": properties.getMessage('success', 'push_confirmation4'),
            "message5": properties.getMessage('success', 'push_confirmation5'),
            "qrCode" : qr.createImgTag(4),
            "activationCode" : activation_code
        });
    });
}
// generation of tokenSecret sent to the client, edited by mbdeme on June 2020

exports.confirm_user_activate = function (user, req, res, next) {
    if (req.params.activation_code == user.push.activation_code) {
        var token_secret = utils.generate_string_code(128);
        user.push.token_secret = token_secret;
        user.push.active = true;
        user.push.device.platform = req.params.platform || "AndroidDev";
        user.push.device.gcm_id = req.params.gcm_id || "GCMIDDev";
        user.push.device.manufacturer = req.params.manufacturer || "DevCorp";
        user.push.device.model = req.params.model || "DevDevice";
        user.push.activation_code = utils.generate_digit_code(6);
        user.save( function () {
            sockets.emitManager('userPushActivate',{uid:user.uid});
            sockets.emitToManagers('userPushActivateManager', user.uid);
            res.send({
                "code": "Ok",
                "message": "",
                "tokenSecret": token_secret
            });
        });
    } else res.send({
        "code": "Error",
        "message": properties.getMessage('error', 'invalid_credentials')
    });
}

// Checks whether the tokenSecret received is equal to the one generated, changed by mbdeme on June 2020

exports.accept_authentication = function (user, req, res, next) {
    logger.debug("accept_authentication ? " + user.push.token_secret + " VS " + req.params.tokenSecret);
    if (user.push.token_secret == req.params.tokenSecret) {
        var lt = req.params.loginTicket;
        user.push.lt = lt;
	logger.debug("accept_authentication OK : lt = " + lt);
        user.save(function () {
            sockets.emitCas(user.uid,'userAuth', {"code": "Ok", "otp": user.push.code});
            res.send({
                "code": "Ok"
            });
	    logger.debug("sockets.emitCas OK : otp = " + user.push.code);
        });
    } else {
	logger.error("token secret doesn't match : " + user.push.token_secret + " != " + req.params.tokenSecret); 
	res.send({
            "code": "Error",
            "message": properties.getMessage('error', 'unvailable_method_operation')
	});
    }
}

exports.check_accept_authentication = function (user, req, res, next) {
    if (user.push.lt.indexOf(req.params.loginTicket)>-1) {
        code = user.push.code;
        user.push.lt = "";
        user.save( function () {
            res.send({
                "code": "Ok",
                "otp": user.push.code
            });
        })
    } else {
	logger.error("CAS Login Ticket doesn't match : " + user.push.lt + " != " + req.params.loginTicket); 
	res.send({
            "code": "Error",
            "message": "CAS Login Ticket doesn't match"
	});
    }
}

exports.user_deactivate = user_deactivate;

function user_deactivate(user, req, res, next) {
    alert_deactivate(user);
    user.push.active = false;
    user.push.device.platform = "";
    user.push.device.gcm_id = "";
    user.push.device.manufacturer = "";
    user.push.device.model = "";
    user.push.device.phone_number = "";
    user.save( function () {
        sockets.emitManager('userPushDeactivate',{uid:user.uid});
        res.send({
            "code": "Ok",
            "message": ""
        });
    });
};

function user_unactivate(user, req, res, next) {
    user.push.active = false;
    user.push.device.platform = "";
    user.push.device.gcm_id = "";
    user.push.device.manufacturer = "";
    user.push.device.model = ""
    user.push.device.phone_number = "";
    user.save( function () {
        res.send({
            "code": "Error",
            "message": properties.getMessage('error', 'push_not_registered')
        });
    });
};

function alert_deactivate(user) {
    var message = new gcm.Message({
        priority: "high",
        data: {
            title: "Esup Auth",
            body: "Les notifications push ont été désactivées pour votre compte",
            text: "Les notifications push ont été désactivées pour votre compte",
            action: "desync"
        },
        to: user.push.device.gcm_id
    });
    var regTokens = [user.push.device.gcm_id];
    sender.send(message, {registrationTokens: regTokens}, function (err, response) {
        if (err) {
            logger.info(err);
        }
    });
}

exports.user_desync = function (user, req, res, next) {
    logger.debug(utils.getFileName(__filename) + ' ' + "user_desync: " + user.uid);
    if(req.params.tokenSecret == user.push.tokenSecret){
        user.push.active = false;
        user.push.device.platform = "";
        user.push.tokenSecret = "";
        user.push.device.phone_number = "";
        user.save( function () {
            res.send({
                "code": "Ok",
                "message": ""
            });
        });
    }else {
        res.send({
            "code": "Error",
            "message": "tokenSecret"
        });

    }
}

exports.admin_activate = function (req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.getMessage('error', 'unvailable_method_operation')
    });
}
