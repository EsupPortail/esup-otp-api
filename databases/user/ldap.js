var utils = require(__dirname + '/../../services/utils');
var properties = require(__dirname + '/../../properties/properties');
var ldapjs = require('ldapjs');

var logger = require(__dirname + '/../../services/logger').getInstance();

var client;

exports.initialize = function(callback) {
    logger.info(utils.getFileName(__filename)+' '+"Initializing ldap connection");
    client = ldapjs.createClient({
        url: properties.getEsupProperty('ldap').uri
    });
    client.bind(properties.getEsupProperty('ldap').adminDn, properties.getEsupProperty('ldap').password, function(err) {
        if (err) logger.error(utils.getFileName(__filename)+' bind error : ' + err);
        else if (typeof(callback) === "function"){
            logger.info(utils.getFileName(__filename)+' '+"Ldap connection Initialized");
            callback();
     }
    });
}

function find_user(req, res, callback) {
    var response = {
        "code": "Error",
        "message": properties.getMessage('error','user_not_found')
    };

    var opts = {
        filter: 'uid=' + req.params.uid,
        scope: 'sub',
        attributes: [properties.getEsupProperty('ldap').transport.sms, properties.getEsupProperty('ldap').transport.mail]
    };

    var user_found = false;
    client.search(properties.getEsupProperty('ldap').baseDn, opts, function(err, _res) {
        if (err) logger.error(utils.getFileName(__filename)+' search error : ' + err);

        _res.on('searchEntry', function(entry) {
            user_found = true;
            if (typeof(callback) === "function") callback(entry.object);

        });

        _res.on('error', function(err) {
            logger.error(utils.getFileName(__filename)+' bind error : ' + err);
        });

        _res.on('end', function(err) {
            if (!user_found) res.send(response);
        });

    });
}

exports.find_user= find_user;

function ldap_change(user, callback){
    var changes = [];
    var change;
    var modif;
    for(attr in user){
        if(attr!='dn' && attr!='controls'){
            modif = {};
            modif[attr]=user[attr];
            change = new ldapjs.Change({
                operation: 'replace',
                modification: modif
            });
            changes.push(change);
        }
    }
    if (typeof(callback) === "function") callback(changes);
}

exports.save_user = function (user, callback) {
    ldap_change(user, function (changes) {
        client.modify(user.dn, changes, function (err) {
            if (err) logger.error('modify error : ' + err);
            if (typeof(callback) === "function") callback();
        });
    });
}

function create_user(uid, callback) {
    var dn = 'uid=' + uid + ',' + properties.getEsupProperty('ldap').baseDn;
    var entry = {
        cn: uid,
        uid: uid,
        sn: uid,
        mail: uid + '@univ.org',
        mobile: '0612345678',
        objectclass: ['inetOrgPerson']
    };
    client.add(dn, entry, function (err) {
        if (err)logger.error(err);
        if (typeof(callback) === "function") callback();
    });
}
exports.create_user = create_user;

exports.remove_user = function (uid, callback) {
    find_user({params: {uid: uid}}, {
        send: function () {
            if(typeof(callback) === 'function')callback();
        }
    }, function () {
        var dn = 'uid=' + uid + ',' + properties.getEsupProperty('ldap').baseDn;
        client.del(dn, function (err) {
            if (err)logger.error(utils.getFileName(__filename)+' delete error : ' + err);
            if (typeof(callback) === "function") callback();
        });
    })
}
