var properties = require(process.cwd() + '/properties/properties');
var apiDb_controller = require(process.cwd() + '/controllers/api/' + properties.esup.apiDb);
var utils = require(process.cwd() + '/services/utils');
var restify = require('restify');

exports.send_code = function(user, req, res, next) {
    console.log('send_code : ' + __filename.split('/').pop());
    var new_otp = {};
    switch (properties.esup.methods.simple_generator.code_type) {
        case "string":
            new_otp.code = utils.generate_string_code(properties.esup.methods.simple_generator.code_length);
            break;
        case "digit":
            new_otp.code = utils.generate_digit_code(properties.esup.methods.simple_generator.code_length);
            break;
        default:
            new_otp.code = utils.generate_string_code(properties.esup.methods.simple_generator.code_length);
            break;
    }
    validity_time = properties.esup.methods.simple_generator.mail_validity * 60 * 1000;
    validity_time += new Date().getTime();
    new_otp.validity_time = validity_time;
    user.simple_generator = new_otp;
    apiDb_controller.save_user(user, function() {
        apiDb_controller.transport_code(new_otp.code, req, res, next);
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
