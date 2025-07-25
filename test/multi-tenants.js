import test from "node:test";
import supertest from 'supertest';

import * as inMemoryMongoTest from './inMemoryMongoTest.js';

import * as properties from '../properties/properties.js';
import * as api_controller from '../controllers/api.js';
import * as userDb_controller from '../controllers/user.js';
import * as userUtils from '../databases/user/userUtils.js';

import * as utils from '../services/utils.js';
import { server } from '../server/server.js';

import * as transports from '../transports/transports.js';

let uid;
let userCounter = 0;

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
        }
    },
    "tenants": [
        {
            "name": "https://idp.univ.fr",
            "scopes": [ "univ.fr" ],
            "webauthn": {
                "relying_party": {
                    "name": "Univ",
                    "id": "univ.fr"
                },
                "allowed_origins": ["https://cas.univ.fr", "https://esup-otp-manager.univ.fr"]
            }
        }
    ],
    "methods": {
        "totp": {
            "activate": true,
            "priority": 5,
            "autoActivate": true,
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
            "activate": false,
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
    "trustedProxies": ["127.0.0.1", "loopback", "::1"]
};

async function getUser() {
    return (await getUserPreferences()).userDb;
}

async function getUserPreferences() {
    return api_controller.apiDb.find_user_by_id(uid);
}

/**
 * @param {string} httpMethod get, post, put, del...
 * @param {string} uri example: '/toto/tata?titi=tutu'
 * 
 * @returns { supertest.Test }
 */
function request(httpMethod, uri, { uid, secret, password, tenant } = {}) {
    if (uid && secret) {
        const hash = "/" + utils.get_hash(uid, secret)[1];
        if (uri.includes('?')) {
            uri.replace('?', hash + "?");
        } else {
            uri += hash;
        }
    }

    /**
     * @type { supertest.Test }
     */
    const request = supertest(server)[httpMethod](uri);

    if (password) {
        request.auth(password, { type: 'bearer' });
    }

    if (tenant) {
        request.set({'X-Tenant': tenant});
    }

    return request;
}

const get = 'get', post = "post", put = 'put', del = 'del';

await test('Esup otp api', async (t) => {
    let tenant = {
        name: config.tenants[0].name
    };

    t.before(async (t) => {
        properties.setEsup(config);
        await inMemoryMongoTest.initialise();
    });

    t.after(async (t) => {
        await inMemoryMongoTest.stop();
    });

    let pause_global_hooks = false;
    t.beforeEach(async (t) => {
        if (!pause_global_hooks) {
            uid = "user" + (userCounter++) + "@" + config.tenants[0].scopes[0];
        }
    });

    t.afterEach(async () => {
        if (!pause_global_hooks) {
            await userDb_controller.remove_user(uid);
            await api_controller.remove_user(uid);
        }
    });

    await t.test('get tenants list with wrong global API password', async (t) => {
        await request(get, "/admin/tenants", { password: "toto" })
            .expect(403)
            .then(res => {
                t.assert.equal(res.body.code, 'Forbidden');
            });
    });

    await t.test('get tenants list with correct global API password', async (t) => {
        await request(get, "/admin/tenants", { password: config.api_password })
            .expect(200)
            .expect(res => {
                t.assert.ok(Array.isArray(res.body));
                t.assert.equal(res.body.length, 1);
                t.assert.equal(res.body[0].name, tenant.name);
            })
            .then(res => { tenant.id = res.body[0].id });
    });

    await t.test('get non-existing tenant', async (t) => {
        await request(get, "/admin/tenants/42", { password: config.api_password })
            .expect(404);
    });

    await t.test('get existing tenant', async (t) => {
        await request(get, "/admin/tenants/" + tenant.id, { password: config.api_password })
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
        await request(get, "/protected/methods", { password: "toto" })
            .expect(400)
            .then(res => {
                t.assert.equal(res.body.code, 'BadRequest');
            });
    });

    await t.test('get methods with correct tenant API password, without tenant header', async (t) => {
        await request(get, "/protected/methods", { password: tenant.api_password})
            .expect(400)
            .then(res => {
                t.assert.equal(res.body.code, 'BadRequest');
            });
    });

    await t.test('get methods with wrong tenant API password, with tenant header', async (t) => {
        await request(get, "/protected/methods", { password: "toto", tenant: tenant.name })
            .expect(403)
            .then(res => {
                t.assert.equal(res.body.code, 'Forbidden');
            });
    });

    await t.test('get methods with global API password, with tenant header', async (t) => {
        await request(get, "/protected/methods", { password: config.api_password, tenant: tenant.name })
            .expect(403)
            .then(res => {
                t.assert.equal(res.body.code, 'Forbidden');
            });
    });

    await t.test('get methods with correct tenant API password, with tenant header', async (t) => {
        await request(get, "/protected/methods", { password: tenant.api_password, tenant: tenant.name })
            .expect(200);
    });

    await t.test('get existing user', async (t) => {
        try {
            await userDb_controller.create_user(uid);
            await api_controller.create_user(uid);
            await request(get, "/protected/users/" + uid, { password: tenant.api_password, tenant: tenant.name })
                .expect(200);
        } catch (e) {
            console.error(e);
            throw e;
        }
    });

    await t.test('get unknown user with auto_create', async (t) => {
        await request(get, "/protected/users/" + uid, { password: tenant.api_password, tenant: tenant.name })
            .expect(200);
    });

    await t.test('get unknown user without auto_create', async (t) => {
        properties.setEsupProperty('auto_create_user', false);

        await request(get, "/protected/users/" + uid, { password: tenant.api_password, tenant: tenant.name })
            .expect(404, {
                code: 'Error',
                message: properties.getMessage('error', 'user_not_found')
            });
        properties.setEsupProperty('auto_create_user', true);
    });

    await t.test('get test_user with wrong tenant users secret', async (t) => {
        await request(get, "/users/" + uid, { uid: uid, secret: "toto" })
            .expect(403)
            .then(res => {
                t.assert.equal(res.body.code, 'Forbidden');
            });
    });

    await t.test('get test_user with global users secret', async (t) => {
        await request(get, "/users/" + uid, { uid: uid, secret: config.users_secret })
            .expect(403)
            .then(res => {
                t.assert.equal(res.body.code, 'Forbidden');
            });
    });

    await t.test('get test_user with correct tenant users secret', async (t) => {
        await request(get, "/users/" + uid, { uid: uid, secret: tenant.users_secret })
            .expect(200);
    });

    await t.test('generate TOTP method secret for test_user', async (t) => {
        await request(post, "/protected/users/" + uid + "/methods/totp/secret", { password: tenant.api_password, tenant: tenant.name })
            .expect(200)
            .then(res => {
                t.assert.equal(res.body.code, "Ok");
                t.assert.ok(res.body.qrCode);
            });
    });

    await t.test('generate bypass method secret for test user', async (t) => {
        const method = "bypass";
        const uri = '/protected/users/' + uid + '/methods/' + method + '/secret/';

        if (properties.getMethodProperty(method, 'activate')) {
            await request(post, uri, { password: tenant.api_password, tenant: tenant.name })
                .expect(200)
                .then(res => {
                    t.assert.equal(res.body.code, "Ok");
                    t.assert.equal(res.body.codes.length, properties.getMethodProperty(method, 'codes_number'));
                });
        } else {
            await request(post, uri, { password: tenant.api_password, tenant: tenant.name })
                .expect(404, {
                    code: 'Error',
                    message: properties.getMessage('error', 'method_not_found')
                });
        }
    });

    await t.test('test random code', async (t) => {
        const method = 'random_code';
        const transport = "sms";
        const phoneNumber = '0606060606';

        t.before(async (t) => {
            pause_global_hooks = true;
            await request(put, "/protected/users/" + uid + "/transports/" + transport + "/" + phoneNumber, { password: tenant.api_password, tenant: tenant.name })
                .expect(200);
            t.assert.equal(userUtils.getTransport(await getUser(), transport), phoneNumber);
        });

        t.after(() => {
            pause_global_hooks = false;
        });

        await t.test('activate_method', async (t) => {
            await request(put, "/protected/users/" + uid + "/methods/" + method + "/deactivate", { password: tenant.api_password, tenant: tenant.name })
                .expect(200);
            await request(get, "/users/" + uid, { uid: uid, secret: tenant.users_secret })
                .expect(200)
                .then(res => {
                    t.assert.ok(!res.body.user.methods[method].active);
                });

            await request(put, "/protected/users/" + uid + "/methods/" + method + "/activate", { password: tenant.api_password, tenant: tenant.name })
                .expect(200);
            await request(get, "/users/" + uid, { uid: uid, secret: tenant.users_secret })
                .expect(200)
                .then(res => {
                    t.assert.equal(res.body.user.transports.sms, utils.cover_sms(phoneNumber));
                    t.assert.ok(res.body.user.methods[method].active);
                });
        });

        let code;

        await t.test('mock sms sending', async (t) => {
            transports.setTransport({
                name: transport,
                send_message(req, opts, res) {
                    code = opts.code;
                    res.send();
                }
            });
        });

        await t.test('send_message', async (t) => {
            await request(post, "/users/" + uid + "/methods/" + method + "/transports/" + transport, { uid: uid, secret: tenant.users_secret })
                .expect(200);
            t.assert.ok(code);
        });

        await t.test('test verify_code with wrong code', async (t) => {
            let wrongCode;

            do {
                const code_length = properties.getMethod(method).code_length;
                const code_type = properties.getMethod(method).code_type;
                wrongCode = utils.generate_code_of_type(code_length, code_type);
            } while (code == wrongCode);

            await request(post, "/protected/users/" + uid + "/" + wrongCode, { password: tenant.api_password, tenant: tenant.name })
                .expect(401, {
                    code: 'Error',
                    message: properties.getMessage('error', 'invalid_credentials')
                });
        });

        await t.test('test verify_code', async (t) => {
            await request(post, "/protected/users/" + uid + "/" + code, { password: tenant.api_password, tenant: tenant.name })
                .expect(200)
                .then(res => {
                    t.assert.equal(res.body.code, 'Ok');
                });
        });

        await t.test('deactive', async (t) => {
            await request(put, "/protected/users/" + uid + "/methods/" + method + "/deactivate", { password: tenant.api_password, tenant: tenant.name })
                .expect(200);

            // get_activate_methods
            await request(get, "/protected/users/" + uid, { password: tenant.api_password, tenant: tenant.name })
                .expect(200)
                .then(res => {
                    t.assert.ok(!res.body.user.methods[method].active);
                });

            await request(post, "/users/" + uid + "/methods/" + method + "/transports/" + transport, { secret: tenant.users_secret})
                .expect(404, {
                    code: 'Error',
                    message: properties.getMessage('error', 'method_not_found')
                });
        });
    });
});
