import test from "node:test";

import * as testUtils from './testUtils.js';

// test-specific configuration, without multi-tenant support
const config = {
    "casVhost": "cas.univ.fr",
    "api_password": "api_password",
    "users_secret": "users_secret",
    "apiDb": "mongodb",
    "userDb": "mixedUserDb",
    "auto_create_user": true,
    "mongodb": {
        "uri": "mongodb://localhost:27017/test-otp",
        "transport": {
            "mail": "mail",
            "sms": "mobile",
        },
        "uid": "employeeNumber",
    },
    "ldap": {
        "uri": "ldap://127.0.0.1:389",
        "timeout": 0,
        "connectTimeout": 0,
        "baseDn": "dc=univ,dc=fr",
        "adminDn": "cn=admin,dc=univ,dc=fr",
        "password": "changeit",
        "transport": {
            "mail": "mail",
            "sms": "mobile",
        },
        "uid": "employeeNumber",
        "displayName": "displayName",
    },
    "mysql": {
        "host": "127.0.0.1",
        "user": "admin",
        "password": "changeit",
        "database": "test_otp",
        "userTable": "User",
        "transport": {
            "mail": "mail",
            "sms": "sms",
        },
        "displayName": "displayName",
        "uid": "employeeNumber",
    },
    "mixedUserDb": {
        "readOnly": "ldap",
        "readWrite": "mongodb"
    },
    "methods": {
        "totp": {
            "activate": true,
            "priority": 5,
            "autoActivateWithPush": true,
            "name": "Esup Auth",
            "transports": []
        },
        "random_code": {
            "activate": true,
            "priority": 5,
            "validity_time": 15,
            "code_type": "digit",
            "code_length": 6,
            "transports": ["sms"]
        },
        "random_code_mail": {
            "activate": true,
            "priority": 5,
            "validity_time": 30,
            "code_type": "digit",
            "code_length": 6,
            "transports": ["mail"]
        },
        "bypass": {
            "activate": true,
            "priority": 5,
            "codes_number": 10,
            "code_type": "digit",
            "code_length": 6,
            "transports": []
        },
        "passcode_grid": {
            "activate": true,
            "priority": 5,
            "lines": 8,
            "cols": 8,
            "code_type": "digit",
            "code_length": 6,
            "validity_time": 3,
            "transports": []
        },
        "push": {
            "serviceAccount": {
                "type": "service_account",
                "project_id": "esup-otp-276500",
                "private_key_id": "",
                "private_key": "",
                "client_email": "",
                "client_id": "",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": "",
                "universe_domain": "googleapis.com"
            },
            "activate": true,
            "priority": 5,
            "validity_time": 3,
            "trustGcm_id": false,
            "notification": true,
            "pending": true,
            "title": "Esup Auth",
            "body": "Demande de connexion à votre compte",
            "text1": "Demande de connexion à votre compte",
            "text2": " à proximité de $city",
            "nbMaxFails": 3,
            "transports": ["push"]
        },
        "esupnfc": {
            "activate": true,
            "priority": 5,
            "server_infos": {
                "numeroId": "numeroId",
                "url": "https://esupnfctag.example.com/",
                "etablissement": "Univ"
            },
            "#how_to_autoActivateWithPush": "requires server_infos (ignored otherwise)",
            "autoActivateWithPush": true,
            "#how_to_autoActivate": "esupnfc will automatically be enabled IF the user has enabled any other method. This allows users to use their NFC card as a backup method (Without the user having to explicitly enable the method)",
            "autoActivate": false,
            "#how_to_saveAutoActivation": "If the user disables all other methods, esupnfc auto-activated stay active. (Only applies to 'autoActivate'. With 'autoActivateWithPush', it is persistent in all cases.)",
            "saveAutoActivation": false,
            "#how_to_autoActivateForAllUsers": "esupnfc will automatically enabled for all users. NFC can thus be used for initial enrollment, or later as a backup method. (Without the user having to explicitly enable the method)",
            "autoActivateForAllUsers": false,
            "validity_time": 3,
            "transports": []
        },
        "webauthn": {
            "activate": true,
            "priority": 5,
            "transports": []
        }
    },
    "transports": ["sms", "mail", "push"],
    "mailer": {
        "sender_mail": "auth-api",
        "sender_name": "Université",
        "port": 25,
        "hostname": "mail.univ.fr",
        "use_proxy": false,
        "use_templates": false,
        "accept_self_signed_certificate": false,
    },
    "sms": {
        "url": "https://user:mdp@sms.univ.fr/esup-smsuapi/?action=SendSms&phoneNumber=$phoneNumber$&message=$message$",
        "method": "GET",
    },
    "esupnfc": {
        "server_ip": "IP_ESUP-SGC-SERVER"
    },
    "userChangesNotifier": {
        "enabled": true,
        "emailAddressProvider": "getEmailAddressFromUser"
    },
    "logs": {
        "main": {
            "level": "debug",
            "console": true,
        },
        "audit": {
            "console": true,
        },
        "access": {
            "format": "dev",
            "console": true,
        }
    },
    "trustedProxies": ["127.0.0.1", "loopback", "::1"]
};

await testUtils.start(config);

const auth = { password: config.api_password };

const api_controller = await import('../controllers/api.js');
const userDb_controller = await import('../controllers/user.js');
const utils = await import('../services/utils.js');

const fnari = {
    uid: "fnari",
    mail: {
        initial: "flo@example.com",
        updated: "florian@example.org",
    },
    sms: {
        initial: undefined,
        updated: "+33606060606",
    },
}

const toto = {
    uid: "toto",
    mail: {
        initial: "toto@example.com",
        updated: "tata.toto@example.org",
    },
    sms: {
        initial: "0678901234",
        updated: "0606060606",
    },
}

const transports = ["mail", "sms"];


await test('Esup otp api', async (t) => {
    t.before(testUtils.before);

    t.after(testUtils.after);

    await t.test('test initial values', async (t) => {
        for (const user of [fnari, toto]) {
            await testUtils.get_user_infos(user.uid, auth)
                .expect(200)
                .then(res => {
                    for (const transport of transports) {
                        t.assert.equal(res.body.user.transports[transport], utils.cover_transport(user[transport].initial, transport));
                    }
                });
        }
    });

    await t.test('test updated values', async (t) => {
        for (const user of [fnari, toto]) {
            for (const transport of transports) {
                await testUtils.setTransport(user.uid, { transport: transport, new_transport: user[transport].updated }, auth);

            }
            await testUtils.get_user_infos(user.uid, auth)
                .expect(200)
                .then(res => {
                    for (const transport of transports) {
                        t.assert.equal(res.body.user.transports[transport], utils.cover_transport(user[transport].updated, transport));
                    }
                });
        }
    });

    await t.test('test reset value', async (t) => {
        for (const user of [fnari, toto]) {
            for (const transport of transports) {
                await testUtils.deleteTransport(user.uid, transport, auth);

            }
            await testUtils.get_user_infos(user.uid, auth)
                .expect(200)
                .then(res => {
                    for (const transport of transports) {
                        t.assert.equal(res.body.user.transports[transport], utils.cover_transport(user[transport].initial, transport));
                    }
                });
        }
    });
});