var restify = require('restify');
var properties = require(process.cwd() + '/properties/properties');
var TwinBcrypt = require('twin-bcrypt');

var required = {
    create_user: ['uid', 'hash'],
    get_user: ['uid', 'hash'],
    get_methods: ['hash'],
    set_otp: ['uid', 'otp', 'hash'],
    get_available_transports: ['uid', 'hash'],
    verify_code: ['uid', 'otp', 'hash'],
    send_code: ['uid', 'method', 'transport', 'hash'],
    generate: ['uid', 'method', 'hash'],
    get_google_authenticator_secret: ['uid', 'hash'],
    toggle_method: ['uid', 'method', 'hash'],
    update_transport: ['uid', 'transport', 'new_transport', 'hash'],
    toggle_method_transport: ['transport', 'method', 'hash'],
    get_activate_methods: ['uid', 'hash'],
    toggle_method_admin: ['method', 'hash'],
}

function compare_salt(req, res, next) {
    if (TwinBcrypt.compareSync(req.params.uid + properties.esup.salt, req.params.hash)) return next();
    else return next(new restify.ForbiddenError());
}

function compare_secret_salt(req, res, next) {
    if (TwinBcrypt.compareSync(properties.esup.secret_salt, req.params.hash)) return next();
    else return next(new restify.ForbiddenError());
}

function validate(req, required) {
    var validate = true;
    for (i in required) {
        if (req.params[required[i]] && req.params[required[i]] != '');
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
        compare_secret_salt(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.get_user = function(req, res, next) {
    if (check_parameters(req, required.get_user)) {
        compare_secret_salt(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.get_methods = function(req, res, next) {
    if (check_parameters(req, required.get_methods)) {
        compare_secret_salt(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.set_otp = function(req, res, next) {
    if (check_parameters(req, required.set_otp)) {
        compare_secret_salt(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.get_available_transports = function(req, res, next) {
    if (check_parameters(req, required.get_available_transports)) {
        compare_salt(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.get_activate_methods = function(req, res, next) {
    if (check_parameters(req, required.get_activate_methods)) {
        compare_salt(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.toggle_method = function(req, res, next) {
    if (check_parameters(req, required.toggle_method)) {
        compare_secret_salt(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.update_transport = function(req, res, next) {
    if (check_parameters(req, required.update_transport)) {
        compare_secret_salt(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.toggle_method_transport = function(req, res, next) {
    if (check_parameters(req, required.toggle_method_transport)) {
        return next();
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.toggle_method_admin = function(req, res, next) {
    if (check_parameters(req, required.toggle_method_admin)) {
        compare_secret_salt(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.send_code = function(req, res, next) {
    if (check_parameters(req, required.send_code)) {
        compare_salt(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.verify_code = function(req, res, next) {
    if (check_parameters(req, required.verify_code)) {
        compare_secret_salt(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.generate = function(req, res, next) {
    if (check_parameters(req, required.generate)) {
        compare_secret_salt(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.get_google_authenticator_secret = function(req, res, next) {
    if (check_parameters(req, required.get_google_authenticator_secret)) {
        compare_secret_salt(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}
