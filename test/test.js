var assert = require('chai').assert;
var os = require('os');
var request = require('request');
var mongoose = require('mongoose');
var async = require('async');
var utils = require(__dirname + '/../services/utils');

var properties = require(__dirname + '/../properties/properties');
var default_properties = properties;

var port = process.env.PORT || 3000;
var server_url = 'http://' + os.hostname() + ':' + port;

var test_user = 'karlito'

describe('Esup otp api', function () {
    it('Server is running', function (done) {
        var port = process.env.PORT || 3000;
        request({url: server_url}, function (error, response, body) {
            if (error) throw error;
            done();
        });
    });

    describe('Simple user api', function () {
        beforeEach(function (done) {
            create_user(test_user, function () {
                done();
            })
        });

        it('get test_user', function (done) {
            var url = server_url + '/user/'+test_user+'/' + utils.get_hash(test_user)[1]
            request({url: url}, function (error, response, body) {
                if (error) throw error;
                assert(JSON.parse(body).code == 'Ok');
                done();
            });
        })

        it('get test_user with wrong hash', function (done) {
            var url = server_url + '/user/'+test_user+'/turlututuchapeaupointu'
            request({url: url}, function (error, response, body) {
                if (error) throw error;
                assert(JSON.parse(body).code == 'ForbiddenError');
                done();
            });
        })

        it('get unknown user with auto_create', function (done) {
            toggle_auto_create_user(true, function () {
                var url = server_url + '/user/unknown_user/' + utils.get_hash('unknown_user')[1]
                request({url: url}, function (error, response, body) {
                    if (error) throw error;
                    if(properties.getEsupProperty('userDb')=='mongodb')assert(JSON.parse(body).code == 'Ok');
                    else assert(JSON.parse(body).message == properties.getMessage('error','user_not_found'));
                    done();
                });
            })
        })

        it('get unknown user without auto_create', function (done) {
            toggle_auto_create_user(false, function () {
                var url = server_url + '/user/unknown_user/' + utils.get_hash('unknown_user')[1]
                request({url: url}, function (error, response, body) {
                    if (error) throw error;
                    assert(JSON.parse(body).message == properties.getMessage('error','user_not_found'));
                    done();
                });
            })
        })

        it('get test_user totp method secret, qrCode must be empty', function (done) {
                var url = server_url + '/protected/user/'+test_user+'/method/totp/secret/' +properties.getEsupProperty('api_password')
                request({url: url}, function (error, response, body) {
                    if (error) throw error;
                    assert(JSON.parse(body).qrCode == '');
                    done();
                });
        })

        it('get test_user bypass method secret response must be an error message', function (done) {
            var url = server_url + '/protected/user/'+test_user+'/method/bypass/secret/' +properties.getEsupProperty('api_password')
            request({url: url}, function (error, response, body) {
                if (error) throw error;
                assert(JSON.parse(body).message == properties.getMessage('error','unvailable_method_operation'));
                done();
            });
        })

        it('get test_user random_code method secret response must be an error message', function (done) {
            var url = server_url + '/protected/user/'+test_user+'/method/random_code/secret/' +properties.getEsupProperty('api_password')
            request({url: url}, function (error, response, body) {
                if (error) throw error;
                assert(JSON.parse(body).message == properties.getMessage('error','unvailable_method_operation'));
                done();
            });
        })

        it('get test_user totp method generate secret', function (done) {
            var url = server_url + '/protected/user/'+test_user+'/method/totp/secret/' +properties.getEsupProperty('api_password')
            request({url: url, method : "POST"}, function (error, response, body) {
                if (error) throw error;
                assert(JSON.parse(body).code == 'Ok');
                done();
            });
        })

        afterEach(function (done) {
            properties = default_properties;
            toggle_auto_create_user(true, function () {
                remove_user(test_user, function () {
                    remove_user('unknown_user', function () {
                        done();
                    })
                })
            })
        })
    })
});

function toggle_auto_create_user(activate, callback) {
    var bool = 'deactivate'
    if (activate)bool = 'activate';
    var url = server_url + '/test/auto_create/' + bool + '/' + properties.getEsupProperty('api_password');
    request({url: url, method: 'PUT'}, function (error, response, body) {
        if (error)throw error;
        if (typeof(callback) === 'function')callback();
    });
}

function create_user(uid, callback) {
    var url = server_url + '/test/user/' + uid + '/' + properties.getEsupProperty('api_password');
    request({url: url, method: 'POST'}, function (error, response, body) {
        if (error)throw error;
        if (typeof(callback) === 'function')callback();
    });
}

function remove_user(uid, callback) {
    var url = server_url + '/test/user/' + uid + '/' + properties.getEsupProperty('api_password');
    request({url: url, method: 'DELETE'}, function (error, response, body) {
        if (error)throw error;
        if (typeof(callback) === 'function')callback();
    });
}