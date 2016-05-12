var assert = require('chai').assert;
var os = require('os');
var request = require('request');
var mongoose = require('mongoose');
var async = require('async');

var properties = require(__dirname + '/../properties/properties');

var user_api_tests = require(__dirname + '/user.api.js');

var mongo_connection;
var userDb_controller;

describe('Esup otp api', function() {
    it('Server is running', function(done) {
        var port = process.env.PORT || 3000;
        var url = 'http://' + os.hostname() + ':' + port;
        request({ url: url }, function(error, response, body) {
            if (error) throw error;
            done();
        });
    });

    describe('Databases are reachable', function () {

    })

    it('Mongodb is reachable', function(done) {
        mongo_connection = mongoose.createConnection('mongodb://' + properties.esup.mongodb.address + '/' + properties.esup.mongodb.db, function(error) {
            if (error) throw error;
            done();
        });
    });

    it('UserDB is reachable', function(done) {
        userDb_controller = require(__dirname + '/../databases/user/' + properties.esup.userDb);
        userDb_controller.initialize(done);
    });

    it('Simple user api', function () {
        var Schema = mongoose.Schema;
        var UserSchema = new Schema(require(__dirname + '/../databases/api/userPreferencesSchema').schema);
        mongo_connection.model('UserPreferences', UserSchema, 'UserPreferences');
        var UserModel = mongo_connection.model('UserPreferences');
        user_api_tests.run(mongo_connection, userDb_controller);
    })

});
