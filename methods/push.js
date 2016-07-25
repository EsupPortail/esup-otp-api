/**
 * Created by abousk01 on 20/07/2016.
 */
var api_controller = require(__dirname + '/../controllers/api');
var properties = require(__dirname + '/../properties/properties');
var qrCode = require('qrcode-npm')
var restify = require('restify');
var utils = require(__dirname + '/../services/utils');
var logger = require(__dirname + '/../services/logger').getInstance();
var gcm = require('node-gcm');

// Set up the sender with you API key, prepare your recipients' registration tokens.
var sender = new gcm.Sender(properties.getMethodProperty('push','serverKey'), {'proxy':'http://wwwcache.univ-lr.fr:3128'});

exports.name = "push";

exports.send_message = function(user, req, res, next) {
    var message = new gcm.Message({
            priority:"high",
            data: {
            title: "Stample title notif",
                body: "Stample title notif",
                text: "Stample text notif"
        },
        to : user.push.device.gcm_id
    });

    var regTokens = [user.push.device.gcm_id];

    sender.send(message, { registrationTokens: regTokens }, function (err, response) {
        if(err){
            console.error(err);
            res.send({
                "code": "Error",
                "message": JSON.stringify(err)
            });
        } else {
            res.send({
                "code": "Ok",
                "message": response
            });
            console.log(response);
        }
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
    var activation_code = "123456"
    user.push.activation_code = activation_code;
    api_controller.save_user(user, function() {
        res.send({
            "code": "Ok",
            "message": properties.getMessage('success','wait_for_confirmation'),
            "activation_code": activation_code
        });
    });
}

exports.confirm_user_activate = function(user, req, res, next) {
    if(req.params.activation_code == user.push.activation_code){
        user.push.active = true;
        user.push.device.platform = req.params.platform || "AndroidDev";
        user.push.device.gcm_id = req.params.gcm_id || "GCMIDDev";
        user.push.device.phone_number = req.params.phone_number || "0147200001Dev";
        user.push.device.manufacturer = req.params.manufacturer || "DevCorp";
        user.push.device.model = req.params.model || "DevDevice";
        user.push.activation_code = utils.generate_digit_code(6);
        api_controller.save_user(user, function() {
            res.send({
                "code": "Ok",
                "message": ""
            });
        });
    }else res.send({
        "code": "Error",
        "message": properties.getMessage('error','invalid_credentials')
    });
}

exports.user_deactivate = function(user, req, res, next) {
    user.push.active = false;
    user.push.device.platform = "";
    user.push.device.gcm_id = "";
    user.push.device.phone_number = "";
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
        "message": properties.getMessage('error','unvailable_method_operation')
    });
}
