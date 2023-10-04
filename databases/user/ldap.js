import * as utils from '../../services/utils.js';
import * as properties from '../../properties/properties.js';
import * as ldapjs from 'ldapjs';

import { getInstance } from '../../services/logger.js';
const logger = getInstance();

let client;

export function initialize(callback) {
    logger.info(utils.getFileNameFromUrl(import.meta.url)+' '+"Initializing ldap connection");
    client = ldapjs.createClient({
        url: properties.getEsupProperty('ldap').uri
    });
    client.bind(properties.getEsupProperty('ldap').adminDn, properties.getEsupProperty('ldap').password, function(err) {
        if (err) logger.error(utils.getFileNameFromUrl(import.meta.url)+' bind error : ' + err);
        else if (typeof(callback) === "function"){
            logger.info(utils.getFileNameFromUrl(import.meta.url)+' '+"Ldap connection Initialized");
            callback();
     }
    });
}

export function find_user(req, res, callback) {
    const opts = {
        filter: 'uid=' + req.params.uid,
        scope: 'sub',
        attributes: [properties.getEsupProperty('ldap').transport.sms, properties.getEsupProperty('ldap').transport.mail]
    };

    let user_found = false;
    client.search(properties.getEsupProperty('ldap').baseDn, opts, function(err, _res) {
        if (err) logger.error(utils.getFileNameFromUrl(import.meta.url)+' search error : ' + err);

        _res.on('searchEntry', function(entry) {
            user_found = true;
            if (typeof(callback) === "function") callback(entry.object);

        });

        _res.on('error', function(err) {
            logger.error(utils.getFileNameFromUrl(import.meta.url)+' bind error : ' + err);
        });

        _res.on('end', function(err) {
            if (!user_found) {
                res.status(404);
                res.send({
                    "code": "Error",
                    "message": properties.getMessage('error','user_not_found')
                });
            }
        });

    });
}

function ldap_change(user, callback){
    const changes = [];
    
    for(const attr in user){
        if(attr!='dn' && attr!='controls'){
            const modif = {};
            modif[attr]=user[attr];
            const change = new ldapjs.Change({
                operation: 'replace',
                modification: modif
            });
            changes.push(change);
        }
    }
    if (typeof(callback) === "function") callback(changes);
}

export function save_user(user, callback) {
    ldap_change(user, function (changes) {
        client.modify(user.dn, changes, function (err) {
            if (err) logger.error('modify error : ' + err);
            if (typeof(callback) === "function") callback();
        });
    });
}

export function create_user(uid, callback) {
    const dn = 'uid=' + uid + ',' + properties.getEsupProperty('ldap').baseDn;
    const entry = {
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

export function remove_user(uid, callback) {
    find_user({params: {uid: uid}}, {
        send: function () {
            if(typeof(callback) === 'function')callback();
        }
    }, function () {
        const dn = 'uid=' + uid + ',' + properties.getEsupProperty('ldap').baseDn;
        client.del(dn, function (err) {
            if (err)logger.error(utils.getFileNameFromUrl(import.meta.url)+' delete error : ' + err);
            if (typeof(callback) === "function") callback();
        });
    })
}
