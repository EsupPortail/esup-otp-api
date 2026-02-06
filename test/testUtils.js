import supertest from 'supertest';
import assert from 'node:assert';
import { mock } from 'node:test';

import * as OTPAuth from "otpauth";
import * as nodemailerMock from 'nodemailer-mock';

import * as properties from '../properties/properties.js';
import * as inMemoryMongoTest from './inMemoryMongoTest.js';

let server;
let restifyServer;
let utils;
let api_controller;
let userDb_controller;
let transports;

export async function start(config) {
    properties.setEsup(config);
    const mongoDbUri = await inMemoryMongoTest.initialise();
    config.mongodb.uri = mongoDbUri;

    mock.module("nodemailer", { defaultExport: nodemailerMock });

    server = await import('../server/server.js');
    await server.start(0);
    restifyServer = server.server;

    stAgent = supertest(restifyServer);

    api_controller = await import('../controllers/api.js');
    userDb_controller = await import('../controllers/user.js');
    utils = await import('../services/utils.js');
    transports = await import('../transports/transports.js');
}

export async function stop() {
    await server.stop();
    await inMemoryMongoTest.stop();
}

const sms = [];

export function mockSms() {
    transports.setTransport({
        name: "sms",
        async send_message(req, opts, res, user) {
            sms.push(opts);
            res?.send({
                "code": "Ok",
                "message": "Message sent",
                "codeRequired": opts.codeRequired,
                "waitingFor": opts.waitingFor,
            });
        },
    });
}

/** @returns {[import('../transports/transports.js').opts]} */
export function getSentSms() {
    return sms;
}

export function clearSms() {
    sms.length = 0;
}

export function getSentEmails() {
    return nodemailerMock.mock.getSentMail();
}

export function clearEmails() {
    nodemailerMock.mock.reset();
}

/** @returns {Promise<[String]>} */
export async function getUsers(/** @type {api_passwordAuthentication} */ auth) {
    const res = await request(get, '/protected/users', auth).expect(200);
    return res.body.uids;
}

export async function clearUsers(/** @type {api_passwordAuthentication} */ auth) {
    for (const uid of await getUsers(auth)) {
        await api_controller.remove_user(uid);
        await userDb_controller.remove_user(uid);
    }
}

export function before() {
    mockSms();
}

export async function after() {
    await stop();
}

let pause_global_hooks = false;

export function pauseBeforeAndAfterEach() {
    pause_global_hooks = true;
}

export function resumeBeforeAndAfterEach() {
    pause_global_hooks = false;
}

export function areBeforeAndAfterEachPaused() {
    return pause_global_hooks;
}

export async function afterEach() {
    if (!areBeforeAndAfterEachPaused()) {
        const tenants = properties.getEsupProperty('tenants');
        if (tenants?.length) {
            const promises = tenants
                //.filter(({ api_password }) => api_password)
                .map(({ api_password, name }) => clearUsers({ password: api_password, tenant: name }));
            await Promise.all(promises);
        } else {
            await clearUsers({ password: properties.getEsupProperty('api_password') });
        }
        clearEmails();
        clearSms();
    }
}

export const get = 'get', post = "post", put = 'put', del = 'del';

/**
 * @typedef {{uid:String, secret: String, tenant: String?}} hashAuthentication
*/

/**
 * @typedef {{password: String, tenant: String?}} api_passwordAuthentication
*/

/**
 * @typedef {hashAuthentication|api_passwordAuthentication} Authentication
*/

/** @type {supertest.Agent} */
let stAgent;
/**
 * @param {get|post|put|del} httpMethod
 * @param {string} uri example: '/toto/tata?titi=tutu'
 * 
 * @returns { supertest.Test }
 */
export function request(httpMethod, uri, { uid, secret, password, tenant } = /** @type {Authentication} */ ({})) {
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
    const request = stAgent[httpMethod](uri);

    if (password) {
        request.auth(password, { type: 'bearer' });
    }

    if (tenant) {
        request.set({ 'X-Tenant': tenant });
    }

    return request;
}

export function getMethods(/** @type {api_passwordAuthentication} */ auth) {
    return request(get, "/protected/methods", auth);
}

/**
 * @param {[{ uid: String, method: String?, deactive: Boolean?, params: Object? }]} activations 
 */
export async function activateMethods(activations, /** @type {api_passwordAuthentication} */ auth) {
    for (const activation of activations) {
        if (activation.method) {
            if (activation.deactive) {
                await deactivate(activation.uid, activation.method, auth).expect(200);
            } else {
                await activateMethodForUser(activation, auth);
            }
        } else if (activation.params?.transport) {
            if (activation.params.deleteTransport) {
                await deleteTransport(activation.uid, activation.params.transport, auth);
            } else {
                await setTransport(activation.uid, activation.params, auth);
            }
        } else {
            await get_user_infos(activation.uid, auth).expect(200);
        }
    }
}

export function activateMethodForUser({ uid, method, params }, /** @type {api_passwordAuthentication} */ auth) {
    switch (method) {
        case 'push':
            return activatePush(uid, method, params, auth);
        case 'bypass':
            return activateBypass(uid, auth);
        case 'random_code':
        case 'random_code_mail':
            return activateRandom_code(uid, method, params, auth);
        case 'totp':
            return activateTotp(uid, auth);
        default:
            return standardActivate(uid, method, auth);
    }
}

export function standardActivate(uid, method, /** @type {api_passwordAuthentication} */ auth) {
    return request(put, `/protected/users/${uid}/methods/${method}/activate/`, auth);
}

export async function activatePush(uid, method, { platform, manufacturer, model }, /** @type {api_passwordAuthentication} */ auth) {
    const { body } = await request(put, `/protected/users/${uid}/methods/${method}/activate`, auth);
    await request(post, `/users/${uid}/methods/${method}/activate/${body.activationCode}/${platform}/${manufacturer}/${model}`);
}

export async function activateBypass(uid, /** @type {api_passwordAuthentication} */ auth) {
    await standardActivate(uid, "bypass", auth);
    return generate_method_secret(uid, "bypass", auth);
}

export async function activateRandom_code(uid, method, { new_transport }, /** @type {api_passwordAuthentication} */ auth) {
    await standardActivate(uid, method, auth);

    if (new_transport) {
        const transport = method === "random_code_mail" ? "mail" : "sms";
        await setTransport(uid, { transport, new_transport }, auth);
    }
}

export async function activateTotp(uid, /** @type {api_passwordAuthentication} */ auth) {
    const { body } = await generate_method_secret(uid, "totp", auth)
        .query("require_method_validation", true)
    // confirm_user_activate
    const token = OTPAuth.URI.parse(body.uri).generate();
    await confirm_activate_method(uid, "totp", token, auth);
    return body;
}

export function generate_method_secret(uid, method, /** @type {api_passwordAuthentication} */ auth) {
    return request(post, `/protected/users/${uid}/methods/${method}/secret`, auth);
}

export function confirm_activate_method(uid, method, activation_code, /** @type {api_passwordAuthentication} */ auth) {
    return request(post, `/protected/users/${uid}/methods/${method}/activate/${activation_code}`, auth);
}

export function deactivate(uid, method, /** @type {api_passwordAuthentication} */ auth) {
    return request(put, `/protected/users/${uid}/methods/${method}/deactivate`, auth);
}

export function verify_code(uid, code, /** @type {api_passwordAuthentication} */ auth) {
    return request(post, `/protected/users/${uid}/${code}`, auth)
}

export function get_user_infos(uid, /** @type {Authentication} */ auth) {
    if (auth.secret) {
        return request(get, `/users/${uid}`, auth);
    } else {
        return request(get, `/protected/users/${uid}`, auth);
    }
}

export async function user_exists(uid, /** @type {api_passwordAuthentication} */ auth) {
    const res = await request(get, "/protected/users/" + uid + "/exists", auth)
        .expect(200);
    return res.body.user_exists;
}

export async function assertUserExists(uid, expected, /** @type {api_passwordAuthentication} */ auth) {
    const userExists = await user_exists(uid, auth);
    assert.equal(userExists, expected);
}

export function setTransport(uid, { transport, new_transport }, /** @type {api_passwordAuthentication} */ auth) {
    return request(put, `/protected/users/${uid}/transports/${transport}/${new_transport}`, auth);
}

export function deleteTransport(uid, transport, /** @type {api_passwordAuthentication} */ auth) {
    return request(del, `/protected/users/${uid}/transports/${transport}`, auth);
}

export function send_message(uid, method, transport, /** @type {hashAuthentication} */ auth) {
    return request(post, `/users/${uid}/methods/${method}/transports/${transport}`, auth);
}

export function setDisplayName(uid, displayName, /** @type {api_passwordAuthentication} */ auth) {
    return request(put, `/protected/users/${uid}`, auth)
        .send({ displayName: displayName })
}

/**
 * @param {[{uid: String, displayName: String}]} users 
 */
export async function setDisplayNames(users, /** @type {api_passwordAuthentication} */ auth) {
    for (const { uid, displayName } of users) {
        await setDisplayName(uid, displayName, auth)
            .expect(200);
    }
}

export async function search_users(/** @type {String} */ token, /** @type {api_passwordAuthentication} */ auth) {
    return request(get, `/protected/users?token=${token}`, auth);
}

/**
 * @typedef {[{uid: String, displayName: String}]} search_usersResult
 */

export async function assertASearch_usersReturns(/** @type {String} */ token, /** @type {search_usersResult} */ expected, /** @type {api_passwordAuthentication} */ auth) {
    return search_users(token, auth)
        .then(res => {
            /** @type {search_usersResult} */
            const actual = res.body.users;
            for (const array of [actual, expected]) {
                utils.sortArray(array, user => user.uid);
            }
            assert.deepEqual(actual, expected);
        })
}

/**
 * @param { [{ mainContent: String, recipients: String[] }] } expected
 */
export async function assertUserChangesNotified(expected) {
    const emails = getSentEmails();
    /*expected.forEach((expected, index) => {
        const result = emails[index];
        assert.equal(result.mainContent, expected.mainContent);
        assert.deepEqual(result.userTransport.sort(), expected.recipients.sort());
    });*/
    assert.equal(emails.length, expected.length);
}

/**
 * @param {[{token: String, expected: search_usersResult}]} expected
 */
export async function assertSearch_usersReturns(expected, /** @type {api_passwordAuthentication} */ auth) {
    return Promise.all(expected.map(({ token, expected }) => assertASearch_usersReturns(token, expected, auth)));
}

export function assertStatsEquals(expected, /** @type {api_passwordAuthentication} */ auth) {
    return admin.stats(auth)
        .expect(200, expected);
}

export const admin = {
    activate_method: function(method, /** @type {api_passwordAuthentication} */ auth) {
        return request(put, `/admin/methods/${method}/activate`, auth);
    },
    deactivate_method: function(method, /** @type {api_passwordAuthentication} */ auth) {
        return request(put, `/admin/methods/${method}/deactivate`, auth);
    },
    activate_method_transport: function(method, transport, /** @type {api_passwordAuthentication} */ auth) {
        return request(put, `/admin/methods/${method}/transports/${transport}/activate`, auth);
    },
    deactivate_method_transport: function(method, transport, /** @type {api_passwordAuthentication} */ auth) {
        return request(put, `/admin/methods/${method}/transports/${transport}/deactivate`, auth);
    },
    stats: function(/** @type {api_passwordAuthentication} */ auth) {
        return request(get, "/admin/stats", auth);
    },
    getTenants: function(/** @type {api_passwordAuthentication} */ auth) {
        return request(get, "/admin/tenants", auth);
    },
    getTenant: function(id, /** @type {api_passwordAuthentication} */ auth) {
        return request(get, `/admin/tenants/${id}`, auth);
    },
}
