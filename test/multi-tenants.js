import test from "node:test";

import * as testUtils from './testUtils.js';

import * as properties from '../properties/properties.js';

// test-specific configuration, with multi-tenant support
const config = {
    "auto_create_user": true,
    "casVhost": "cas.univ.fr",
    "api_password": "api_password",
    "users_secret": "users_secret",
    "apiDb": "mongodb",
    "userDb": "mongodb",
    "mongodb": {
        "uri": "mongodb://localhost:27017/test-otp",
        "transport": {
            "mail": "mail",
            "sms": "mobile"
        },
        "displayName": "displayName",
    },
    "tenants": [
        {
            "name": "https://idp.univ.fr",
            "scopes": ["univ.fr", "univ3.fr"],
            "webauthn": {
                "relying_party": {
                    "name": "Univ",
                    "id": "univ.fr"
                },
                "allowed_origins": ["https://cas.univ.fr", "https://esup-otp-manager.univ.fr"]
            }
        },
        {
            "name": "https://idp.univ2.fr",
            "scopes": ["univ2.fr"],
            "webauthn": {
                "relying_party": {
                    "name": "Univ2",
                    "id": "univ2.fr"
                },
                "allowed_origins": ["https://cas.univ2.fr", "https://esup-otp-manager.univ2.fr"]
            },
            api_password: "toto",
            users_secret: "tata"
        },
    ],
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
            "console": true
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
    const tenant = {
        name: config.tenants[0].name,
        scopes: config.tenants[0].scopes,
    };

    const tenant2 = config.tenants[1];

    t.before(testUtils.before);

    t.after(testUtils.after);

    t.beforeEach(t => {
        if (!testUtils.areBeforeAndAfterEachPaused()) {
            uid = "user" + (userCounter++) + "@" + config.tenants[0].scopes[0];
        }
    });

    t.afterEach(testUtils.afterEach);

    await t.test('get tenants list with wrong global API password', async (t) => {
        await testUtils.admin.getTenants({ password: "toto" })
            .expect(403)
            .then(res => {
                t.assert.equal(res.body.code, 'Forbidden');
            });
    });

    await t.test('get tenants list with correct global API password', async (t) => {
        await testUtils.admin.getTenants({ password: config.api_password })
            .expect(200)
            .expect(res => {
                t.assert.ok(Array.isArray(res.body));
                t.assert.equal(res.body.length, 2);
                for (const t of [tenant, tenant2]) {
                    const res_tenant = res.body.find(tenant => tenant.name == t.name);
                    t.id = res_tenant.id;
                }
            });
    });

    await t.test('get non-existing tenant', async (t) => {
        await testUtils.admin.getTenant("42", { password: config.api_password })
            .expect(404);
    });

    await t.test('get existing tenant', async (t) => {
        await testUtils.admin.getTenant(tenant.id, { password: config.api_password })
            .expect(200)
            .expect(res => {
                t.assert.equal(res.body.name, tenant.name);
            })
            .then(res => {
                tenant.api_password = res.body.api_password;
                tenant.users_secret = res.body.users_secret;
            });
    });

    await t.test('get methods with wrong tenant API password, without tenant header', async (t) => {
        await testUtils.getMethods({ password: "toto" })
            .expect(400)
            .then(res => {
                t.assert.equal(res.body.code, 'BadRequest');
            });
    });

    await t.test('get methods with correct tenant API password, without tenant header', async (t) => {
        await testUtils.getMethods({ password: tenant.api_password })
            .expect(400)
            .then(res => {
                t.assert.equal(res.body.code, 'BadRequest');
            });
    });

    await t.test('get methods with wrong tenant API password, with tenant header', async (t) => {
        await testUtils.getMethods({ password: "toto", tenant: tenant.name })
            .expect(403)
            .then(res => {
                t.assert.equal(res.body.code, 'Forbidden');
            });
    });

    await t.test('get methods with global API password, with tenant header', async (t) => {
        await testUtils.getMethods({ password: config.api_password, tenant: tenant.name })
            .expect(403)
            .then(res => {
                t.assert.equal(res.body.code, 'Forbidden');
            });
    });

    await t.test('get methods with correct tenant API password, with tenant header', async (t) => {
        await testUtils.getMethods({ password: tenant.api_password, tenant: tenant.name })
            .expect(200);
    });

    await t.test('get existing user', async (t) => {
        await userDb_controller.create_user(uid);
        await api_controller.create_user(uid);
        await testUtils.get_user_infos(uid, { password: tenant.api_password, tenant: tenant.name })
            .expect(200);
    });

    await t.test('get unknown user with auto_create', async (t) => {
        await testUtils.get_user_infos(uid, { password: tenant.api_password, tenant: tenant.name })
            .expect(200);
    });

    await t.test('get unknown user without auto_create', async (t) => {
        properties.setEsupProperty('auto_create_user', false);

        await testUtils.get_user_infos(uid, { password: tenant.api_password, tenant: tenant.name })
            .expect(404, {
                code: 'Error',
                message: properties.getMessage('error', 'user_not_found')
            });
        properties.setEsupProperty('auto_create_user', true);
    });

    await t.test('get test_user with wrong tenant users secret', async (t) => {
        await testUtils.get_user_infos(uid, { uid: uid, secret: "toto" })
            .expect(403)
            .then(res => {
                t.assert.equal(res.body.code, 'Forbidden');
            });
    });

    await t.test('get test_user with global users secret', async (t) => {
        await testUtils.get_user_infos(uid, { uid: uid, secret: config.users_secret })
            .expect(403)
            .then(res => {
                t.assert.equal(res.body.code, 'Forbidden');
            });
    });

    await t.test('get test_user with correct tenant users secret', async (t) => {
        await testUtils.get_user_infos(uid, { uid: uid, secret: tenant.users_secret })
            .expect(200);
    });

    await t.test('user_exists', async (t) => {
        // user does not exist
        await testUtils.assertUserExists(uid, false, { password: tenant.api_password, tenant: tenant.name });
        // make sure that the previous call did not create it
        await testUtils.assertUserExists(uid, false, { password: tenant.api_password, tenant: tenant.name });
        // user is automatically created
        await testUtils.get_user_infos(uid, { password: tenant.api_password, tenant: tenant.name }).expect(200);
        // user exists
        await testUtils.assertUserExists(uid, true, { password: tenant.api_password, tenant: tenant.name });
    });

    await t.test('generate TOTP method secret for user', async (t) => {
        await testUtils.generate_method_secret(uid, "totp", { password: tenant.api_password, tenant: tenant.name })
            .expect(200)
            .then(res => {
                t.assert.equal(res.body.code, "Ok");
                t.assert.ok(res.body.qrCode);
            });
    });

    await t.test('generate bypass method secret for test user', async (t) => {
        const method = "bypass";
        await testUtils.generate_method_secret(uid, method, { password: tenant.api_password, tenant: tenant.name })
            .expect(200)
            .then(res => {
                t.assert.equal(res.body.code, "Ok");
                t.assert.equal(res.body.codes.length, properties.getMethodProperty(method, 'codes_number'));
            });
    });

    await t.test('test random code', async (t) => {
        const method = 'random_code';
        const transport = "sms";
        const phoneNumber = '0606060606';

        t.before(async (t) => {
            testUtils.pauseBeforeAndAfterEach();
            await testUtils.setTransport(uid, { transport: transport, new_transport: phoneNumber }, { password: tenant.api_password, tenant: tenant.name })
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
                .expect(403);

            await testUtils.admin.activate_method(method, { password: config.api_password })
                .expect(200);
            t.assert.ok(properties.getMethodProperty(method, 'activate'));

            await testUtils.standardActivate(uid, method, { password: tenant.api_password, tenant: tenant.name })
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
            await testUtils.deactivate(uid, method, { password: tenant.api_password, tenant: tenant.name })
                .expect(200);
            await testUtils.get_user_infos(uid, { uid: uid, secret: tenant.users_secret })
                .expect(200)
                .then(res => {
                    t.assert.ok(!res.body.user.methods[method].active);
                });

            await testUtils.standardActivate(uid, method, { password: tenant.api_password, tenant: tenant.name })
                .expect(200);
            await testUtils.get_user_infos(uid, { uid: uid, secret: tenant.users_secret })
                .expect(200)
                .then(res => {
                    t.assert.equal(res.body.user.transports.sms, utils.cover_sms(phoneNumber));
                    t.assert.ok(res.body.user.methods[method].active);
                });
        });

        let code;

        await t.test('send_message', async (t) => {
            await testUtils.send_message(uid, method, transport, { uid: uid, secret: tenant.users_secret })
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

            await testUtils.verify_code(uid, wrongCode, { password: tenant.api_password, tenant: tenant.name })
                .expect(401, {
                    code: 'Error',
                    message: properties.getMessage('error', 'invalid_credentials')
                });
        });

        await t.test('test verify_code', async (t) => {
            await testUtils.verify_code(uid, code, { password: tenant.api_password, tenant: tenant.name })
                .expect(200)
                .then(res => {
                    t.assert.equal(res.body.code, 'Ok');
                });
            testUtils.clearSms();
        });

        await t.test('deactive', async (t) => {
            await testUtils.deactivate(uid, method, { password: tenant.api_password, tenant: tenant.name })
                .expect(200);

            await testUtils.get_user_infos(uid, { password: tenant.api_password, tenant: tenant.name })
                .expect(200)
                .then(res => {
                    t.assert.ok(!res.body.user.methods[method].active);
                });

            await testUtils.send_message(uid, method, transport, { secret: tenant.users_secret })
                .expect(404, {
                    code: 'Error',
                    message: properties.getMessage('error', 'method_not_found')
                });
            t.assert.equal(testUtils.getSentSms().length, 0);
        });
    });

    await test('test search_users', async (t) => {
        const tenantsAndUsers = [
            {
                tenant: tenant,
                users: [
                    { uid: "alanteigne" + "@" + tenant.scopes[0], displayName: "Aubine Lanteigne" },
                    { uid: "zbabin" + "@" + tenant.scopes[1], displayName: "Zacharie Babin" },
                    { uid: "ebabin" + "@" + tenant.scopes[0], displayName: "Émile Babin" },
                    { uid: "acressac" + "@" + tenant.scopes[1], displayName: "Aubin Cressac" },
                    { uid: "agingras" + "@" + tenant.scopes[0], displayName: "Aubin Gingras" },
                    { uid: "ddoddu" + "@" + tenant.scopes[1], displayName: "Durandana Goddu" },
                    { uid: "jrocher" + "@" + tenant.scopes[0], displayName: "Jay Rocher" },
                    { uid: "clemieux" + "@" + tenant.scopes[1], displayName: "Jessamine Lemieux" },
                    { uid: "flaramee" + "@" + tenant.scopes[0], displayName: "Florian Laramée" },
                    { uid: "fletourneau" + "@" + tenant.scopes[1], displayName: "Florent Létourneau" },
                ],
            },
            {
                tenant: tenant2,
                users: [
                    { uid: "agingras" + "@" + tenant2.scopes[0], displayName: "Aubine Gingras" },
                    { uid: "flaramee" + "@" + tenant2.scopes[0], displayName: "Floriane Laramée" },
                    { uid: "fletourneau" + "@" + tenant2.scopes[0], displayName: "Florence Létourneau" },
                ],
            }
        ]

        for (const { users, tenant } of tenantsAndUsers) {
            await testUtils.setDisplayNames(users, { password: tenant.api_password });
        }
        const userByUid = Object.fromEntries(tenantsAndUsers[0].users.map(user => [user.uid, user]));

        /** @type { [{ token: String, result: [String] }] }  */
        const expecteds = [
            { token: "Aubin", result: ["acressac" + "@" + tenant.scopes[1], "agingras" + "@" + tenant.scopes[0], "alanteigne" + "@" + tenant.scopes[0]] },
            { token: "Babin", result: ["zbabin" + "@" + tenant.scopes[1], "ebabin" + "@" + tenant.scopes[0]] },
            { token: "jroch", result: ["jrocher" + "@" + tenant.scopes[0]] },
            { token: "azerty", result: [] },
            { token: "ine", result: ["alanteigne" + "@" + tenant.scopes[0], "clemieux" + "@" + tenant.scopes[1]] },
            { token: "flo", result: ["flaramee" + "@" + tenant.scopes[0], "fletourneau" + "@" + tenant.scopes[1]] },
        ].map(({ token, result }) => ({ token, expected: result.map(uid => userByUid[uid]) }));

        testUtils.assertSearch_usersReturns(expecteds, { password: tenant.api_password, tenant: tenant.name });
    });
});
