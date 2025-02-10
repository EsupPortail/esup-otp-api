import { describe, test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import supertest from 'supertest';

import { MongoMemoryServer } from 'mongodb-memory-server';
import * as mongoose from 'mongoose';

import * as properties from '../properties/properties.js';
import * as apiDb from '../databases/api/mongodb.js';
import * as userDb from '../databases/user/mongodb.js';
import * as api_controller from '../controllers/api.js';
import * as userDb_controller from '../controllers/user.js';
import * as userUtils from '../databases/user/userUtils.js';

import * as utils from '../services/utils.js';
import * as server from '../server/server.js';

import * as transports from '../transports/transports.js';

let uid;
let userCounter = 0;

async function getUser() {
    return userDb_controller.userDb.find_user(uid);
}

async function getUserPreferences() {
    return api_controller.apiDb.find_user(uid);
}

/**
 * @param {string} httpMethod get, post, put, del...
 * @param {string} uri example: '/toto/tata?titi=tutu'
 * 
 * @returns supertest.Test
 */
function request(httpMethod, uri, { appendHash, setApiPwd } = {}, customApiPwd) {
    if (appendHash) {
        const hash = "/" + utils.get_hash(uid)[1];
        if (uri.includes('?')) { // if 
            uri.replace('?', hash + "?");
        } else {
            uri += hash;
        }
    }

    /**
     * @type supertest.Test
     */
    const request = supertest(server.server)[httpMethod](uri);
    if (setApiPwd) {
        request.auth(customApiPwd || properties.getEsupProperty('api_password'), { type: 'bearer' });
    }
    return request;
}
const get = 'get', post = "post", put = 'put', del = 'del';

describe('Esup otp api', async () => {
    let mongoMemoryServer;
    
    before(async () => {
        // use in memory mongodb
        properties.setEsupProperty("apiDb", "mongodb");
        properties.setEsupProperty("userDb", "mongodb");
    
        mongoMemoryServer = await MongoMemoryServer.create({ instance: { dbName: "test-otp" } });
    
        await apiDb.initialize(mongoMemoryServer.getUri());
        await userDb.initialize(mongoMemoryServer.getUri());
        await api_controller.initialize(apiDb);
        await userDb_controller.initialize(userDb);
        await server.initialize_routes();
        server.server.listen();
    });
    after(async (done) => {
        console.log('🛑 Fermeture de MongoMemoryServer...');
        await mongoose.disconnect();
        await mongoMemoryServer.stop();
        console.log('🛑 Fermeture du serveur...');
        server.server.close(() => {
            console.log('✅ Serveur fermé proprement');
            process.exit(0);
        });
    });


    beforeEach(async () => {
        uid = "user" + (userCounter++);
    });

    afterEach(async () => {
        await userDb_controller.remove_user(uid);
        await api_controller.remove_user(uid);
    });

    await test('get methods with good ApiPwd', async () => {
        await request(get, "/protected/methods", { setApiPwd: true }, properties.getEsupProperty('api_password'))
            .expect(200);
    });

    await test('get methods with wrong ApiPwd', async () => {
        await request(get, "/protected/methods", { setApiPwd: true }, "toto")
            .expect(403)
            .then(res => {
                assert.equal(res.body.code, 'Forbidden');
            });
    });

    await test('get existing user', async () => {
        try {
            await userDb_controller.create_user(uid);
            await api_controller.create_user(uid);
            await request(get, "/protected/users/" + uid, { setApiPwd: true })
                .expect(200);
        } catch (e) {
            console.error(e);
            throw e;
        }
    });

    await test('get unknown user with auto_create', async () => {
        await request(get, "/protected/users/" + uid, { setApiPwd: true })
            .expect(200);
    });

    await test('get unknown user without auto_create', async () => {
        properties.setEsupProperty('auto_create_user', false);

        await request(get, "/protected/users/" + uid, { setApiPwd: true })
            .expect(404, {
                code: 'Error',
                message: properties.getMessage('error', 'user_not_found')
            });
        properties.setEsupProperty('auto_create_user', true);
    });

    await test('get test_user with good hash', async () => {
        await request(get, "/users/" + uid + "/" + utils.get_hash(uid)[1])
            .expect(200);
    });

    await test('get test_user with wrong hash', async () => {
        await request(get, "/users/" + uid + "/" + utils.get_hash("toto")[1])
            .expect(403)
            .then(res => {
                assert.equal(res.body.code, 'Forbidden');
            });
    });

    await test('get test_user totp method generate secret', async () => {
        await request(post, "/protected/users/" + uid + "/methods/totp/secret", { setApiPwd: true })
            .expect(200)
            .then(res => {
                assert.equal(res.body.code, "Ok");
                assert(res.body.qrCode);
            });
    });

    await test('get test_user bypass method generate secret', async () => {
        const method = "bypass";
        const uri = '/protected/users/' + uid + '/methods/' + method + '/secret/';

        if (properties.getMethodProperty(method, 'activate')) {
            await request(post, uri, { setApiPwd: true })
                .expect(200)
                .then(res => {
                    assert.equal(res.body.code, "Ok");
                    assert.equal(res.body.codes.length, properties.getMethodProperty(method, 'codes_number'));
                });
        } else {
            await request(post, uri, { setApiPwd: true })
                .expect(404, {
                    code: 'Error',
                    message: properties.getMessage('error', 'method_not_found')
                });
        }
    });

    await test('test random code', async () => {
        const method = 'random_code';
        const transport = "sms";
        const phoneNumber = '0606060606';

        before(async () => {
            await request(put, "/protected/users/" + uid + "/transports/" + transport + "/" + phoneNumber, { setApiPwd: true })
                .expect(200);

            assert.equal(userUtils.getTransport(await getUser(), transport), phoneNumber);
        });

        await describe('activate_method_admin', async () => {
            await request(put, "/admin/methods/" + method + "/deactivate", { setApiPwd: true })
                .expect(200);
            assert(!properties.getMethodProperty(method, 'activate'));

            await request(put, "/protected/users/" + uid + "/methods/" + method + "/activate", { setApiPwd: true })
                .expect(404, {
                    code: 'Error',
                    message: properties.getMessage('error', 'method_not_found')
                });

            await request(put, "/admin/methods/" + method + "/activate", { setApiPwd: true })
                .expect(200);
            assert(properties.getMethodProperty(method, 'activate'));

            await request(put, "/protected/users/" + uid + "/methods/" + method + "/activate", { setApiPwd: true })
                .expect(200);
        });

        await describe('activate_method_transport', async () => {
            await request(put, "/admin/methods/" + method + "/transports/" + transport + "/deactivate", { setApiPwd: true })
                .expect(200);
            assert(!properties.containsMethodTransport(method, transport));

            await request(put, "/admin/methods/" + method + "/transports/" + transport + "/activate", { setApiPwd: true })
                .expect(200);
            assert(properties.containsMethodTransport(method, transport));
        });

        await describe('activate_method', async () => {
            await request(put, "/protected/users/" + uid + "/methods/" + method + "/deactivate", { setApiPwd: true })
                .expect(200);
            await request(get, "/users/" + uid, { appendHash: true })
                .expect(200)
                .then(res => {
                    assert(!res.body.user.methods[method].active);
                });

            await request(put, "/protected/users/" + uid + "/methods/" + method + "/activate", { setApiPwd: true })
                .expect(200);
            await request(get, "/users/" + uid, { appendHash: true })
                .expect(200)
                .then(res => {
                    assert.equal(res.body.user.transports.sms, utils.cover_string(phoneNumber, 2, 2));
                    assert(res.body.user.methods[method].active);
                });
        });

        let code;

        await describe('mock sms sending', async () => {
            transports.setTransport({
                name: transport,
                send_message(req, opts, res) {
                    code = opts.code;
                    res.send();
                }
            });
        });

        await describe('send_message', async () => {
            await request(post, "/users/" + uid + "/methods/" + method + "/transports/" + transport, { appendHash: true })
                .expect(200);
            assert(code);
        });

        await describe('test verify_code with wrong code', async () => {
            let wrongCode;

            do {
                const code_length = properties.getMethod(method).code_length;
                const code_type = properties.getMethod(method).code_type;
                wrongCode = utils.generate_code_of_type(code_length, code_type);
            } while (code == wrongCode);

            await request(post, "/protected/users/" + uid + "/" + wrongCode, { setApiPwd: true })
                .expect(401, {
                    code: 'Error',
                    message: properties.getMessage('error', 'invalid_credentials')
                });
        });

        await describe('test verify_code', async () => {
            await request(post, "/protected/users/" + uid + "/" + code, { setApiPwd: true })
                .expect(200)
                .then(res => {
                    assert.equal(res.body.code, 'Ok');
                });
        });

        await describe('deactive', async () => {
            await request(put, "/protected/users/" + uid + "/methods/" + method + "/deactivate", { setApiPwd: true })
                .expect(200);

            // get_activate_methods
            await request(get, "/admin/users/" + uid + "/methods", { setApiPwd: true })
                .expect(200)
                .then(res => {
                    assert(!res.body.methods[method]);
                });

            await request(post, "/users/" + uid + "/methods/" + method + "/transports/" + transport, { appendHash: true })
                .expect(404, {
                    code: 'Error',
                    message: properties.getMessage('error', 'method_not_found')
                });
        });
    });
});
