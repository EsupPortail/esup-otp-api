var properties = require(process.cwd() + '/properties/properties');
var apiDb_controller = require(process.cwd() + '/controllers/api/' + properties.esup.apiDb);
var speakeasy = require('speakeasy');
var restify = require('restify');

exports.send_code = function(user, req, res, next) {
    console.log('send_code : ' + __filename.split('/').pop());
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





exports.verify_code = function(req, res, next) {
    res.send({
        "code": "Error",
        "message": properties.messages.error.unvailable_method_operation
    });
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
