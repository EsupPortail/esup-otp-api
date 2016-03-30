var properties = require(process.cwd() + '/properties/properties');
var utils = require(process.cwd() + '/services/utils');
var ldapjs = require('ldapjs');

var client;

exports.initialize = function(bind, callback) {
    client = ldapjs.createClient({
        url: properties.esup.ldap.uri
    });
    client.bind(properties.esup.ldap.adminDn, properties.esup.ldap.password, function(err) {
        if (err) console.log('bind error : ' + err);
        if (typeof(callback) === "function") callback();
    });

}

function get_user(req, res, callback) {
    var response = {
        "code": "Error",
        "message": properties.messages.error.user_not_found
    };

    var opts = {
        filter: 'uid=' + req.params.uid,
        scope: 'sub',
        attributes: [properties.esup.ldap.transport.sms, properties.esup.ldap.transport.mail]
    };

    var user_found = false;
    client.search(properties.esup.ldap.baseDn, opts, function(err, _res) {
        if (err) console.log('search error : ' + err);

        _res.on('searchEntry', function(entry) {
            user_found = true;
            if (typeof(callback) === "function") callback(entry.object);

        });

        _res.on('error', function(err) {
            console.log('search error : ' + err);
        });

        _res.on('end', function(err) {
            if (!user_found) res.send(response);
        });

    });
}


exports.get_available_transports = function(req, res, next) {
    console.log("get_available_transports");
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    get_user(req, res, function(user) {
        var response = {};
        var result = {};
        if (user.mail) result.mail = utils.cover_string(user.mail, 4, 5);
        if (user.sms) result.sms = utils.cover_string(user.sms, 2, 2);
        response.code = "Ok";
        response.message = properties.messages.success.transports_found;
        response.transports_list = result;
        res.send(response);
    });
}


exports.send_sms = function(req, res, callback) {
    get_user(req, res, function(user) {
        if (typeof(callback) === "function" && user[properties.esup.ldap.transport.sms]) callback(user[properties.esup.ldap.transport.sms]);
    });
}


exports.send_mail = function(req, res, callback) {
    get_user(req, res, function(user) {
        if (typeof(callback) === "function" && user[properties.esup.ldap.transport.mail]) callback(user[properties.esup.ldap.transport.mail]);
    });
}

exports.update_transport = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    var modification = {};
    modification[properties.esup.ldap.transport[req.params.transport]] = [req.params.new_transport]
    var change = new ldapjs.Change({
        operation: 'replace',
        modification: modification
    });
    client.modify('uid=' + req.params.uid + ',ou=people,dc=univ-lr,dc=fr', change, function(err) {
        if (err) console.log('modify error : ' + err);
        else res.send({
            code: 'Ok',
            message: properties.messages.success.update
        });
    });
}
