var restify = require('restify');
var properties = require(__dirname + '/../properties/properties');
var utils = require(__dirname + '/../services/utils');

var required = {
    get_activate_methods: ['uid', 'hash'],
    get_available_transports: ['uid', 'hash'],
    get_user_infos: ['uid', 'hash'],
    send_message: ['uid', 'method', 'transport', 'hash'],

    create_user: ['uid', 'api_password'],
    transport_test: ['uid', 'transport','api_password'],
    delete_transport: ['uid', 'transport','api_password'],
    get_user: ['uid', 'api_password'],
    get_uids: ['api_password'],
    get_methods: ['api_password'],
    get_activate_methods_admin: ['uid', 'api_password'],
    set_otp: ['uid', 'otp', 'api_password'],
    delete_method_secret: ['uid', 'method', 'api_password'],
    verify_code: ['uid', 'otp', 'api_password'],
    generate_method_secret: ['uid', 'method', 'api_password'],
    get_method_secret: ['uid', 'api_password', 'method'],
    toggle_method: ['uid', 'method', 'api_password'],
    update_transport: ['uid', 'transport', 'new_transport', 'api_password'],
    toggle_method_transport: ['transport', 'method', 'api_password'],
    toggle_method_admin: ['method', 'api_password']
}

function check_hash(req, res, next) {
    var hashes = utils.get_hash(req.params.uid);
    for (hash in hashes){
        if (req.params.hash == hashes[hash]) return next();
    }
    return next(new restify.ForbiddenError());
}

function check_api_password(req, res, next) {
    if (req.params.api_password == properties.getEsupProperty('api_password')) return next();
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
        check_api_password(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.get_user = function(req, res, next) {
    if (check_parameters(req, required.get_user)) {
        check_api_password(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}
exports.get_uids = function(req, res, next) {
    if (check_parameters(req, required.get_uids)) {
        check_api_password(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.transport_test = function(req, res, next) {
    if (check_parameters(req, required.transport_test)) {
        check_api_password(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.delete_transport = function(req, res, next) {
    if (check_parameters(req, required.transport)) {
        check_api_password(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.delete_method_secret = function(req, res, next) {
    if (check_parameters(req, required.delete_method_secret)) {
        check_api_password(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.get_methods = function(req, res, next) {
    if (check_parameters(req, required.get_methods)) {
        check_api_password(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.set_otp = function(req, res, next) {
    if (check_parameters(req, required.set_otp)) {
        check_api_password(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.get_available_transports = function(req, res, next) {
    if (check_parameters(req, required.get_available_transports)) {
        check_hash(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.get_user_infos = function(req, res, next) {
    if (check_parameters(req, required.get_user_infos)) {
        check_hash(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.get_activate_methods = function(req, res, next) {
    if (check_parameters(req, required.get_activate_methods)) {
        check_hash(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.toggle_method = function(req, res, next) {
    if (check_parameters(req, required.toggle_method)) {
        check_api_password(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.update_transport = function(req, res, next) {
    if (check_parameters(req, required.update_transport)) {
        check_api_password(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.toggle_method_transport = function(req, res, next) {
    if (check_parameters(req, required.toggle_method_transport)) {
        check_api_password(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.toggle_method_admin = function(req, res, next) {
    if (check_parameters(req, required.toggle_method_admin)) {
        check_api_password(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.get_activate_methods_admin = function(req, res, next) {
    if (check_parameters(req, required.get_activate_methods_admin)) {
        check_api_password(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.send_message = function(req, res, next) {
    if (check_parameters(req, required.send_message)) {
        check_hash(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.verify_code = function(req, res, next) {
    if (check_parameters(req, required.verify_code)) {
        check_api_password(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.generate_method_secret = function(req, res, next) {
    if (check_parameters(req, required.generate)) {
        check_api_password(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}

exports.get_method_secret = function(req, res, next) {
    if (check_parameters(req, required.get_method_secret)) {
        check_api_password(req, res, next);
    } else {
        return next(new restify.InvalidArgumentError());
    }
}
