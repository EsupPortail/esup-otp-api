var restify = require('restify');

var required = {
    create_user: ['uid'],
    set_otp: ['uid', 'otp'],
    get_available_transports: ['uid'],
    verify_code: ['uid', 'otp'],
    send_code: ['uid'],
    generate_google_authenticator_secret: ['uid'],
    generate_bypass_codes: ['uid'],
    get_google_authenticator_secret: ['uid'],
    get_available_methods: [],
}

function validate(req, required) {
    var validate = true;
    for (i in required) {
        if (req.params[required[i]]);
        else validate = false;
    }
    return validate;
}

function check_parameters(req, required) {
    if (validate(req, required)) {
        return true
    } else {
        return false;
    }
}

exports.create_user = function(req, res, next) {
    if (check_parameters(req, required.create_user)) {
        return next();
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.set_otp = function(req, res, next) {
    if (check_parameters(req, required.set_otp)) {
        return next();
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.get_available_transports = function(req, res, next) {
    if (check_parameters(req, required.get_available_transports)) {
        return next();
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.get_available_methods = function(req, res, next) {
    if (check_parameters(req, required.get_available_methods)) {
        return next();
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.send_code = function(req, res, next) {
    if (check_parameters(req, required.send_code)) {
        return next();
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.verify_code = function(req, res, next) {
    if (check_parameters(req, required.verify_code)) {
        return next();
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.generate_google_authenticator_secret = function(req, res, next) {
    if (check_parameters(req, required.generate_google_authenticator_secret)) {
        return next();
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.generate_bypass_codes = function(req, res, next) {
    if (check_parameters(req, required.generate_bypass_codes)) {
        return next();
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.get_google_authenticator_secret = function(req, res, next) {
    if (check_parameters(req, required.get_google_authenticator_secret)) {
        return next();
    } else {
        return next(new restify.InvalidArgumentError());
    }
}
