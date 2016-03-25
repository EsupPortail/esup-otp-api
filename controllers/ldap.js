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


exports.get_available_transports = function(req, res, next) {
    console.log("get_available_transports");
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

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
            var result = {};
            console.log('entry: ' + JSON.stringify(entry.object));
            if (entry.object[properties.esup.ldap.transport.mail]) result.mail = utils.cover_string(entry.object[properties.esup.ldap.transport.mail], 4, 5);
            if (entry.object[properties.esup.ldap.transport.sms]) result.sms = utils.cover_string(entry.object[properties.esup.ldap.transport.sms], 2, 2);
            response.code = "Ok";
            response.message = properties.messages.success.transports_found;
            response.transports_list = result;
            res.send(response);

        });

        _res.on('error', function(err) {
            console.log('search error : ' + err);
        });

        _res.on('end', function(err) {
            if (!user_found) res.send(response);
        });

    });
}


exports.send_sms = function(uid, callback, res) {

    var response = {
        "code": "Error",
        "message": properties.messages.error.user_not_found
    };

    var opts = {
        filter: 'uid=' + uid,
        scope: 'sub',
        attributes: [properties.esup.ldap.transport.sms]
    };

    var user_found = false;
    client.search(properties.esup.ldap.baseDn, opts, function(err, _res) {
        if (err) console.log('search error : ' + err);

        _res.on('searchEntry', function(entry) {
            user_found = true;
            var result = {};
            console.log('entry: ' + JSON.stringify(entry.object));
            if (typeof(callback) === "function" && entry.object[properties.esup.ldap.transport.sms]) callback(entry.object[properties.esup.ldap.transport.sms]);

        });
        _res.on('error', function(err) {
            console.log('search error : ' + err);
        });

        _res.on('end', function(err) {
            if (!user_found) res.send(response);
        });
    });
}


exports.send_mail = function(uid, callback, res) {
    var response = {
        "code": "Error",
        "message": properties.messages.error.user_not_found
    };

    var opts = {
        filter: 'uid=' + uid,
        scope: 'sub',
        attributes: [properties.esup.ldap.transport.mail]
    };

    var user_found = false;
    client.search(properties.esup.ldap.baseDn, opts, function(err, _res) {
        if (err) console.log('search error : ' + err);

        _res.on('searchEntry', function(entry) {
            user_found = true;
            var result = {};
            console.log('entry: ' + JSON.stringify(entry.object));
            if (typeof(callback) === "function" && entry.object[properties.esup.ldap.transport.mail]) callback(entry.object[properties.esup.ldap.transport.mail]);

        });
        _res.on('error', function(err) {
            console.log('search error : ' + err);
        });

        _res.on('end', function(err) {
            if (!user_found) res.send(response);
        });
    });
}

exports.update_transport = function(req, res, next) {
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
        })
    });
}
