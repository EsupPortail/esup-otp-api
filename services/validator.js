var restify = require('restify');
var properties = require(__dirname + '/../properties/properties');
var utils = require(__dirname + '/../services/utils');
var logger = require(__dirname + '/../services/logger').getInstance();

exports.check_hash = check_hash;

function check_hash(req, res, next) {
    var hashes = utils.get_hash(req.params.uid);
    for (hash in hashes){
        if (req.params.hash == hashes[hash]) return next();
    }
    return next(new restify.ForbiddenError());
}

exports.check_hash_socket = check_hash_socket;

function check_hash_socket(uid, hash) {
    var hashes = utils.get_hash(uid);
    for (_hash in hashes){
        if (hash == hashes[_hash]) return true;
    }
    return false;
}

exports.check_api_password = check_api_password;

function check_api_password(req, res, next) {
    if (req.params.api_password == properties.getEsupProperty('api_password')) return next();
    else return next(new restify.ForbiddenError());
}

exports.esupnfc_check_server_ip = function esupnfc_check_server_ip(req, res, next) {
    let ip = req.headers["x-forwarded-for"];
    //logger.debug(req.headers);
    if(ip == undefined) {
	ip = req.connection.remoteAddress;
    }
    if (ip == properties.getEsupProperty('esupnfc').server_ip) {
	return next();
    }
    else {
	logger.info("remote ip : " + ip + " is not esupnfc server ip -> forbidden");
	return next(new restify.ForbiddenError());
    }
};
