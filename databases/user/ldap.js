var utils = require(__dirname + '/../../services/utils');
var ldapjs = require('ldapjs');

var client;

exports.initialize = function(callback) {
    console.log("initialize ldap connection, if this take too much time, verify your ldap");
    client = ldapjs.createClient({
        url: global.properties.esup.ldap.uri
    });
    client.bind(global.properties.esup.ldap.adminDn, global.properties.esup.ldap.password, function(err) {
        if (err) console.log('bind error : ' + err);
        else if (typeof(callback) === "function"){
         console.log('ldap connection initialized');
         callback();
     }
    });
}

function find_user(req, res, callback) {
    var response = {
        "code": "Error",
        "message": properties.messages.error.user_not_found
    };

    var opts = {
        filter: 'uid=' + req.params.uid,
        scope: 'sub',
        attributes: [global.properties.esup.ldap.transport.sms, global.properties.esup.ldap.transport.mail]
    };

    var user_found = false;
    client.search(global.properties.esup.ldap.baseDn, opts, function(err, _res) {
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

exports.user_exist= function(req, res, callback){
    find_user(req, res, function(user){
         if (typeof(callback) === "function") callback(user);
    })
}

exports.get_available_transports = function(req, res, callback) {
    find_user(req, res, function(user) {
        var response = {};
        var result = {};
        if (user[global.properties.esup.ldap.transport.mail]) result.mail = utils.cover_string(user[global.properties.esup.ldap.transport.mail], 4, 5);
        if (user[global.properties.esup.ldap.transport.sms]) result.sms = utils.cover_string(user[global.properties.esup.ldap.transport.sms], 2, 2);
        if (typeof(callback) === "function") callback(result);
        else {
            response.code = "Ok";
            response.message = properties.messages.success.transports_found;
            response.transports_list = result;
            res.send(response);
        }
    });
}



exports.send_sms = function(req, res, callback) {
    find_user(req, res, function(user) {
        if (typeof(callback) === "function") callback(user[global.properties.esup.ldap.transport.sms]);
    });
}


exports.send_mail = function(req, res, callback) {
    find_user(req, res, function(user) {
        if (typeof(callback) === "function") callback(user[global.properties.esup.ldap.transport.mail]);
    });
}

exports.update_transport = function(req, res, next) {
    var modification = {};
    modification[global.properties.esup.ldap.transport[req.params.transport]] = [req.params.new_transport]
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

exports.delete_transport = function(req, res, next) {
    var modification = {};
    modification[global.properties.esup.ldap.transport[req.params.transport]] = ""
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
