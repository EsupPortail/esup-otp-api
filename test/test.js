import assert from 'node:assert';
import 'mocha';
import os from 'os';
import requestLib from 'request';
import * as utils from '../services/utils.js';
import * as properties from '../properties/properties.js';


const port = process.env.PORT || 3000;
const server_url = 'http://' + os.hostname() + ':' + port;

const test_user = 'karlito';

describe('Esup otp api', function () {
    it('Server is running', function (done) {
        request({url: server_url}, function (error, response, body) {
            if (error) throw error;
            done();
        });
    });

    describe('Simple user api', function () {
		before(reset);
		
        beforeEach(function (done) {
            create_user(test_user, function () {
                done();
            })
        });

        it('get test_user', function (done) {
            const url = server_url + '/users/'+test_user+'/' + utils.get_hash(test_user)[1]
            request({url: url}, function (error, response, body) {
                if (error) throw error;
                assert.equal(JSON.parse(body).code, 'Ok');
                done();
            });
        });

        it('get test_user with wrong hash', function (done) {
            const url = server_url + '/users/'+test_user+'/turlututuchapeaupointu'
            request({url: url}, function (error, response, body) {
                if (error) throw error;
                assert.equal(JSON.parse(body).code, 'Forbidden');
                done();
            });
        });

        it('get unknown user with auto_create', function (done) {
            toggle_auto_create_user(true, function () {
                const url = server_url + '/users/unknown_user/' + utils.get_hash('unknown_user')[1]
                request({url: url}, function (error, response, body) {
                    if (error) throw error;
                    if(properties.getEsupProperty('userDb')=='mongodb')assert.equal(JSON.parse(body).code, 'Ok');
                    else assert.equal(JSON.parse(body).message, properties.getMessage('error','user_not_found'));
                    done();
                });
            })
        });

        it('get unknown user without auto_create', function (done) {
            toggle_auto_create_user(false, function () {
                const url = server_url + '/users/unknown_user/' + utils.get_hash('unknown_user')[1]
                request({url: url}, function (error, response, body) {
                    if (error) throw error;
                    assert.equal(JSON.parse(body).message, properties.getMessage('error','user_not_found'));
                    done();
                });
            })
        });

        it('get test_user totp method secret response must be an error message', function (done) {
                const url = server_url + '/protected/users/'+test_user+'/methods/totp/secret/';
                request({url: url}, function (error, response, body) {
                    if (error) throw error;
                    assert.equal(JSON.parse(body).message, properties.getMessage('error','unvailable_method_operation'));
                    done();
                });
        });

        it('get test_user bypass method secret response must be an error message', function (done) {
            const url = server_url + '/protected/users/'+test_user+'/methods/bypass/secret/';
            request({url: url}, function (error, response, body) {
                if (error) throw error;
                assert.equal(JSON.parse(body).message, properties.getMessage('error','unvailable_method_operation'));
                done();
            });
        });

        it('get test_user random_code method secret response must be an error message', function (done) {
            const url = server_url + '/protected/users/'+test_user+'/methods/random_code/secret/';
            request({url: url}, function (error, response, body) {
                if (error) throw error;
                assert.equal(JSON.parse(body).message, properties.getMessage('error','unvailable_method_operation'));
                done();
            });
        });

        it('get test_user totp method generate secret', function (done) {
            const url = server_url + '/protected/users/'+test_user+'/methods/totp/secret/';
            request({url: url, method : "POST"}, function (error, response, body) {
                if (error) throw error;
                assert.equal(JSON.parse(body).code, 'Ok');
                const url = server_url + '/protected/users/'+test_user+'/methods/totp/secret/';
                request({url: url}, function (error, response, body) {
                    if (error) throw error;
                    assert.notEqual(JSON.parse(body).qrCode, '');
                    done();
                });
            });
        });

        it('get test_user bypass method generate secret', function (done) {
            const url = server_url + '/protected/users/'+test_user+'/methods/bypass/secret/';
            request({url: url, method : "POST"}, function (error, response, body) {
                if (error) throw error;
                if(JSON.parse(body).code == 'Error')
                    assert.equal(JSON.parse(body).message, properties.getMessage('error','method_not_found'));
                else{
                    assert.equal(JSON.parse(body).codes.length, properties.getMethodProperty('bypass','codes_number'));
                    console.log(JSON.parse(body));
                    assert.equal(JSON.parse(body).code, 'Ok');
                }
                done();
            });
        });

        afterEach(reset);
    });
});

function toggle_auto_create_user(activate, callback) {
	const bool = activate ? 'activate' : 'deactivate';
    const url = server_url + '/test/auto_create/' + bool;
    request({url: url, method: 'PUT'}, function (error, response, body) {
        if (error)throw error;
        if (typeof(callback) === 'function')callback();
    });
}

function create_user(uid, callback) {
    const url = server_url + '/test/users/' + uid;
    request({url: url, method: 'POST'}, function (error, response, body) {
        if (error)throw error;
        if (typeof(callback) === 'function')callback();
    });
}

function remove_user(uid, callback) {
    const url = server_url + '/test/users/' + uid;
    request({url: url, method: 'DELETE'}, function (error, response, body) {
        if (error)throw error;
        if (typeof(callback) === 'function')callback();
    });
}

const api_password = properties.getEsupProperty('api_password');
function request(opts, callback) {
	opts.auth = { 'bearer': api_password };
	requestLib(opts, callback);
}

function reset(callback) {
	toggle_auto_create_user(true, function() {
		remove_user(test_user, function() {
			remove_user('unknown_user', function() {
				if(callback instanceof Function) callback();
			})
		})
	})
}
