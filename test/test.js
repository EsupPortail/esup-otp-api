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

var api_controller;
var userDb_controller;

describe('Esup otp api', function() {
    it('Server is running', function(done) {
        var port = process.env.PORT || 3000;
        request({ url: server_url }, function(error, response, body) {
            if (error) throw error;
            done();
        });
    });

    describe('Databases access', function () {
        it('Api Controller can be initialized', function(done) {
            api_controller = require(__dirname + '/../controllers/api');
            api_controller.initialize(done);
        });

        it('UserDB controller initialized', function(done) {
            userDb_controller = require(__dirname + '/../databases/user/' + properties.esup.userDb);
            userDb_controller.initialize(done);
        });
    })

    describe('Simple user api', function () {
        before(function () {
            api_controller = require(__dirname + '/../controllers/api');
            api_controller.initialize();
            userDb_controller = require(__dirname + '/../databases/user/' + properties.esup.userDb);
            userDb_controller.initialize();
        })
        beforeEach(function() {
            api_controller.create_user('test_user');
        });

        it('get test_user', function(done) {
            var url = server_url + '/user/test_user/'+ utils.get_hash('test_user')[1]
            request({ url: url }, function(error, response, body) {
                if (error) throw error;
                assert(JSON.parse(body).code == 'Ok');
                done();
            });
        })

        it('get test_user with wrong hash', function(done) {
            var url = server_url + '/user/test_user/turlututuchapeaupointu'
            request({ url: url }, function(error, response, body) {
                if (error) throw error;
                assert(JSON.parse(body).code == 'ForbiddenError');
                done();
            });
        })

        it('get unknown user with auto_create', function(done) {
            var url = server_url + '/user/unknown_user/'+ utils.get_hash('unknown_user')[1]
            request({ url: url }, function(error, response, body) {
                if (error) throw error;
                assert(JSON.parse(body).code == 'Ok');
                done();
            });
        })

        afterEach(function() {
            properties = default_properties;
            api_controller.remove_user('test_user');
            api_controller.remove_user('unknown_user');
        })
    })
});
