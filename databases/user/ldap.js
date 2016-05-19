var utils = require(__dirname + '/../../services/utils');
var properties = require(__dirname + '/../../properties/properties');
var ldapjs = require('ldapjs');
var winston = require('winston');

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            timestamp: function() {
                return new Date(Date.now());
            },
            formatter: function(options) {
                // Return string will be passed to logger.
                return options.timestamp() +' '+ options.level.toUpperCase() +' '+__filename.split(global.base_dir)[1]+' '+ (undefined !== options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
            }
        }),
        new (winston.transports.File)({
            timestamp: function() {
                return ''+new Date(Date.now());
            },
            name: 'info-file',
            filename: __dirname+'/../../logs/server.log',
            json: false,
            formatter: function(options) {
                // Return string will be passed to logger.
                return options.timestamp() +' '+ options.level.toUpperCase() +' '+__filename.split(global.base_dir)[1]+' '+ (undefined !== options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
            }
        }),
        new (winston.transports.File)({
            timestamp: function() {
                return ''+new Date(Date.now());
            },
            name: 'debug-file',
            level: 'debug',
            filename: __dirname+'/../../logs/debug.log',
            json: false,
            formatter: function(options) {
                // Return string will be passed to logger.
                return options.timestamp() +' '+ options.level.toUpperCase() +' '+__filename.split(global.base_dir)[1]+' '+ (undefined !== options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
            }
        })
    ]
});

var client;

exports.initialize = function(callback) {
    logger.info("Initializing ldap connection");
    client = ldapjs.createClient({
        url: properties.getEsupProperty('ldap').uri
    });
    client.bind(properties.getEsupProperty('ldap').adminDn, properties.getEsupProperty('ldap').password, function(err) {
        if (err) console.log('bind error : ' + err);
        else if (typeof(callback) === "function"){
            logger.info("Ldap connection Initialized");
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
        attributes: [properties.getEsupProperty('ldap').transport.sms, properties.getEsupProperty('ldap').transport.mail]
    };

    var user_found = false;
    client.search(properties.getEsupProperty('ldap').baseDn, opts, function(err, _res) {
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
    logger.debug(dn);
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
        }
    }, function () {
        var dn = 'uid=' + uid + ',' + properties.getEsupProperty('ldap').baseDn;
        client.del(dn, function (err) {
            if (err)logger.error(err);
            if (typeof(callback) === "function") callback();
        });
    })
}
