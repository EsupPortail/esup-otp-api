import test from "node:test";

import * as testUtils from './testUtils.js';

import * as properties from '../properties/properties.js';

// test-specific configuration, without multi-tenant support
const config = {
    "auto_create_user": true,
    "casVhost": "cas.univ.fr",
    "api_password": "api_password",
    "users_secret": "users_secret",
    "apiDb": "mongodb",
    "userDb": "mongodb",
    //"userDb": "ldap",
    //"userDb": "mysql",
    "mongodb": {
        "uri": "mongodb://localhost:27017/test-otp",
        "transport": {
            "mail": "mail",
            "sms": "mobile",
        },
        "displayName": "displayName",
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

const api_controller = await import('../controllers/api.js');
const userDb_controller = await import('../controllers/user.js');
const utils = await import('../services/utils.js');

let uid;
let userCounter = 0;


await test('Esup otp api', async (t) => {
    t.before(testUtils.before);

    t.after(testUtils.after);

    t.beforeEach(t => {
        if (!testUtils.areBeforeAndAfterEachPaused()) {
            uid = "user" + (userCounter++);
        }
    });

    t.afterEach(testUtils.afterEach);

    await t.test('get methods with correct global API password', async (t) => {
        await testUtils.getMethods({ password: config.api_password })
            .expect(200);
    });

    await t.test('get methods with wrong global API password', async (t) => {
        await testUtils.getMethods({ password: "toto" })
            .expect(403)
            .then(res => {
                t.assert.equal(res.body.code, 'Forbidden');
            });
    });

    await t.test('get existing user', async (t) => {
        await userDb_controller.create_user(uid);
        await api_controller.create_user(uid);
        await testUtils.get_user_infos(uid, { password: config.api_password })
            .expect(200);
    });

    await t.test('get unknown user with auto_create', async (t) => {
        await testUtils.get_user_infos(uid, { password: config.api_password })
            .expect(200);
    });

    await t.test('get unknown user without auto_create', async (t) => {
        properties.setEsupProperty('auto_create_user', false);

        await testUtils.get_user_infos(uid, { password: config.api_password })
            .expect(404, {
                code: 'Error',
                message: properties.getMessage('error', 'user_not_found')
            });
        properties.setEsupProperty('auto_create_user', true);
    });

    await t.test('user_exists', async (t) => {
        // user does not exist
        await testUtils.assertUserExists(uid, false, { password: config.api_password });
        // make sure that the previous call did not create it
        await testUtils.assertUserExists(uid, false, { password: config.api_password });
        // user is automatically created
        await testUtils.get_user_infos(uid, { password: config.api_password }).expect(200);
        // user exists
        await testUtils.assertUserExists(uid, true, { password: config.api_password });
    });

    await t.test('get user with good hash', async (t) => {
        await testUtils.get_user_infos(uid, { uid: uid, secret: config.users_secret })
            .expect(200);
    });

    await t.test('get user with wrong hash', async (t) => {
        await testUtils.get_user_infos(uid, { uid: uid, secret: "toto" })
            .expect(403)
            .then(res => {
                t.assert.equal(res.body.code, 'Forbidden');
            });
    });

    await t.test('generate TOTP method secret for user', async (t) => {
        await testUtils.generate_method_secret(uid, "totp", { password: config.api_password })
            .expect(200)
            .then(res => {
                t.assert.equal(res.body.code, "Ok");
                t.assert.ok(res.body.qrCode);
            });
    });

    await t.test('generate bypass method secret for user', async (t) => {
        const method = "bypass";
        await testUtils.generate_method_secret(uid, method, { password: config.api_password })
            .expect(200)
            .then(res => {
                t.assert.equal(res.body.code, "Ok");
                t.assert.equal(res.body.codes.length, properties.getMethodProperty(method, 'codes_number'));
            });
    });

    await t.test('test random_code', async (t) => {
        const method = 'random_code';
        const transport = "sms";
        const phoneNumber = '0606060606';

        t.before(async (t) => {
            testUtils.pauseBeforeAndAfterEach();
            await testUtils.setTransport(uid, { transport: transport, new_transport: phoneNumber }, { password: config.api_password })
                .expect(200);
        });

        t.after(() => {
            testUtils.resumeBeforeAndAfterEach();
        });

        await t.test('activate_method_admin', async (t) => {
            await testUtils.admin.deactivate_method(method, { password: config.api_password })
                .expect(200);
            t.assert.ok(!properties.getMethodProperty(method, 'activate'));

            await testUtils.standardActivate(uid, method, { password: config.api_password })
                .expect(404, {
                    code: 'Error',
                    message: properties.getMessage('error', 'method_not_found')
                });

            await testUtils.admin.activate_method(method, { password: config.api_password })
                .expect(200);
            t.assert.ok(properties.getMethodProperty(method, 'activate'));

            await testUtils.standardActivate(uid, method, { password: config.api_password })
                .expect(200);
        });

        await t.test('activate_method_transport', async (t) => {
            await testUtils.admin.deactivate_method_transport(method, transport, { password: config.api_password })
                .expect(200);
            t.assert.ok(!properties.containsMethodTransport(method, transport));

            await testUtils.admin.activate_method_transport(method, transport, { password: config.api_password })
                .expect(200);
            t.assert.ok(properties.containsMethodTransport(method, transport));
        });

        await t.test('activate_method', async (t) => {
            await testUtils.deactivate(uid, method, { password: config.api_password })
                .expect(200);
            await testUtils.get_user_infos(uid, { password: config.api_password })
                .expect(200)
                .then(res => {
                    t.assert.ok(!res.body.user.methods[method].active);
                });

            await testUtils.standardActivate(uid, method, { password: config.api_password })
                .expect(200);
            await testUtils.get_user_infos(uid, { password: config.api_password })
                .expect(200)
                .then(res => {
                    t.assert.equal(res.body.user.transports.sms, utils.cover_sms(phoneNumber));
                    t.assert.ok(res.body.user.methods[method].active);
                });
        });

        let code;

        await t.test('send_message', async (t) => {
            await testUtils.send_message(uid, method, transport, { uid: uid, secret: config.users_secret })
                .expect(200);
            t.assert.equal(testUtils.getSentSms().length, 1);
            code = testUtils.getSentSms()[0].code;
        });

        await t.test('test verify_code with wrong code', async (t) => {
            let wrongCode;

            do {
                const { code_length, code_type } = properties.getMethod(method);
                wrongCode = utils.generate_code_of_type(code_length, code_type);
            } while (code == wrongCode);

            await testUtils.verify_code(uid, wrongCode, { password: config.api_password })
                .expect(401, {
                    code: 'Error',
                    message: properties.getMessage('error', 'invalid_credentials')
                });
        });

        await t.test('test verify_code', async (t) => {
            await testUtils.verify_code(uid, code, { password: config.api_password })
                .expect(200)
                .then(res => {
                    t.assert.equal(res.body.code, 'Ok');
                });
            testUtils.clearSms();
        });

        await t.test('deactive', async (t) => {
            await testUtils.deactivate(uid, method, { password: config.api_password })
                .expect(200);

            await testUtils.get_user_infos(uid, { password: config.api_password })
                .expect(200)
                .then(res => {
                    t.assert.ok(!res.body.user.methods[method].active);
                });

            await testUtils.send_message(uid, method, transport, { uid: uid, secret: config.users_secret })
                .expect(404, {
                    code: 'Error',
                    message: properties.getMessage('error', 'method_not_found')
                });
            t.assert.equal(testUtils.getSentSms().length, 0);
        });
    });

    await t.test('test search_users', async (t) => {
        const users = [
            { uid: "alanteigne", displayName: "Aubine Lanteigne" },
            { uid: "zbabin", displayName: "Zacharie Babin" },
            { uid: "ebabin", displayName: "Émile Babin" },
            { uid: "acressac", displayName: "Aubin Cressac" },
            { uid: "agingras", displayName: "Aubin Gingras" },
            { uid: "ddoddu", displayName: "Durandana Goddu" },
            { uid: "jrocher", displayName: "Jay Rocher" },
            { uid: "clemieux", displayName: "Jessamine Lemieux" },
            { uid: "flaramee", displayName: "Florian Laramée" },
            { uid: "fletourneau", displayName: "Florent Létourneau" },
        ];

        await testUtils.setDisplayNames(users, { password: config.api_password });

        const userByUid = Object.fromEntries(users.map(user => [user.uid, user]));

        const expecteds = [
            { token: "Aubin", result: ["acressac", "agingras", "alanteigne"] },
            { token: "Babin", result: ["zbabin", "ebabin"] },
            { token: "jroch", result: ["jrocher"] },
            { token: "azerty", result: [] },
            { token: "ine", result: ["alanteigne", "clemieux"] },
            { token: "flo", result: ["flaramee", "fletourneau"] },
        ].map(({ token, result }) => ({ token, expected: result.map(uid => userByUid[uid]) }));

        testUtils.assertSearch_usersReturns(expecteds, { password: config.api_password });
    });

    await t.test('test stats', async (t) => {
        /** @type {Parameters<typeof testUtils.activateMethods>[0]} */
        const activations = [
            { uid: "user1", method: "bypass" },
            { uid: "user2", method: "esupnfc" },
            { uid: "user3", method: "passcode_grid" },
            { uid: "user4", method: "push", params: { platform: "android", manufacturer: "xiaomi", model: "24116RACCG" } },
            { uid: "user4", method: "totp" },
            { uid: "user5", method: "push", params: { platform: "ios", manufacturer: "Apple", model: "iPhone 12 mini" } },
            { uid: "user6", method: "random_code", params: { new_transport: "0606060601" } },
            { uid: "user7", method: "random_code_mail", params: { new_transport: "user7@example.com" } },
            { uid: "user8", method: "totp" },
            { uid: "user9", method: "push", params: { platform: "ios", manufacturer: "Apple", model: "iPhone 14 pro" } },
            { uid: "user9", method: "totp" },
            { uid: "user9", method: "random_code", params: { new_transport: "0606060602" } },
            { uid: "user20", method: "totp" },
            { uid: "user20", method: "totp", deactive: true },
            { uid: "user21" },
            { uid: "user22" },
        ];

        await testUtils.activateMethods(activations, { password: config.api_password });

        const expectedStats = {
            totalUsers: 12,
            totalMfaUsers: 9,
            users: {
                "total": 12,
                "enrolled": 9,
                "methodsCount": {
                    "0": 3,
                    "1": 7,
                    "2": 1,
                    "3": 1,
                }
            },
            methods: {
                bypass: 1,
                esupnfc: 1,
                passcode_grid: 1,
                push: 3,
                totp: 3,
                random_code: 2,
                random_code_mail: 1,
                webauthn: 0,
            },
            pushPlatforms: {
                Android: 1,
                iOS: 2,
            },
        };

        await testUtils.assertStatsEquals(expectedStats, { password: config.api_password });
    });

    await t.test('test userChangesNotifier', async (t) => {
        /** @type {Parameters<typeof testUtils.activateMethods>[0]} */
        const activations = [
            { uid: "user1", method: "bypass" },
            { uid: "user2", method: "esupnfc" },
            { uid: "user3", method: "passcode_grid" },
            { uid: "user4", method: "push", params: { platform: "android", manufacturer: "xiaomi", model: "24116RACCG" } },
            { uid: "user4", method: "totp" },
            { uid: "user5", method: "push", params: { platform: "ios", manufacturer: "Apple", model: "iPhone 12 mini" } },
            { uid: "user6", method: "random_code", params: { new_transport: "0606060601" } },
            { uid: "user7", method: "random_code_mail", params: { new_transport: "user7@example.com" } },
            { uid: "user7", params: { transport: "mail", new_transport: "user7@email2.com" } },
            { uid: "user7", params: { transport: "mail", deleteTransport: true } },
            { uid: "user8", method: "totp" },
            { uid: "user9", method: "push", params: { platform: "ios", manufacturer: "Apple", model: "iPhone 14 pro" } },
            { uid: "user9", method: "totp" },
            { uid: "user9", method: "random_code", params: { new_transport: "0606060602" } },
            { uid: "user20", method: "totp" },
            { uid: "user20", method: "totp", deactive: true },
            { uid: "user21" },
            { uid: "user22" },
        ];

        await testUtils.activateMethods(activations, { password: config.api_password });

        const expected = [
            {
                "recipients": ["user1@example.org"],
                "mainContent": "L'authentification par codes de secours a été activée pour votre compte."
            },
            {
                "recipients": ["user2@example.org"],
                "mainContent": "L'authentification par NFC avec votre carte multi-service a été activée pour votre compte."
            }, {
                "recipients": ["user3@example.org"],
                "mainContent": "L'authentification par grille de code a été activée pour votre compte."
            }, {
                "recipients": ["user4@example.org"],
                "mainContent": "L'authentification par notifications sur l'application mobile Esup Auth a été activée pour votre compte."
            }, {
                "recipients": ["user4@example.org"],
                "mainContent": "L'authentification par codes TOTP a été activée pour votre compte."
            }, {
                "recipients": ["user5@example.org"],
                "mainContent": "L'authentification par notifications sur l'application mobile Esup Auth a été activée pour votre compte."
            }, {
                "recipients": ["user6@example.org"],
                "mainContent": "Vous recevrez vos codes d'authentification par SMS au numéro 06******601"
            }, {
                "recipients": ["user7@example.org", "user7@example.com"],
                "mainContent": "Vous recevrez vos codes d'authentification par mail à l'adresse user********le.com"
            }, {
                "recipients": ["user7@example.org", "user7@example.com", "user7@email2.com"],
                "mainContent": "Vous recevrez vos codes d'authentification par mail à l'adresse user*******l2.com (au lieu de user********le.com précédemment)"
            }, {
                "recipients": ["user7@example.org", "user7@email2.com"],
                "mainContent": "Vous ne recevrez plus de codes d'authentification par mail à l'adresse user*******l2.com"
            }, {
                "recipients": ["user8@example.org"],
                "mainContent": "L'authentification par codes TOTP a été activée pour votre compte."
            }, {
                "recipients": ["user9@example.org"],
                "mainContent": "L'authentification par notifications sur l'application mobile Esup Auth a été activée pour votre compte."
            }, {
                "recipients": ["user9@example.org"],
                "mainContent": "L'authentification par codes TOTP a été activée pour votre compte."
            }, {
                "recipients": ["user9@example.org"],
                "mainContent": "Vous recevrez vos codes d'authentification par SMS au numéro 06******602"
            }, {
                "recipients": ["user20@example.org"],
                "mainContent": "L'authentification par codes TOTP a été activée pour votre compte."
            }, {
                "recipients": ["user20@example.org"],
                "mainContent": "L'authentification par codes TOTP a été désactivée pour votre compte."
            }
        ];

        await testUtils.assertUserChangesNotified(expected);
    });
});
