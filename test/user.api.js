var assert = require('chai').assert;
var os = require('os');
var request = require('request');
var utils = require(__dirname + '/../services/utils');
var properties = require(__dirname + '/../properties/properties');
var default_properties = properties;

var mongo_connection;
var port = process.env.PORT || 3000;
var server_url = 'http://' + os.hostname() + ':' + port;
var UserModel;

function initiatilize_user_model() {
    UserModel = mongo_connection.model('UserPreferences');
}

exports.run = function(mongoconn) {
    mongo_connection = mongoconn;
    initiatilize_user_model();
    describe('Simple user api usage', test);
}

function test() {
    beforeEach(function() {
        var user = new UserModel();
        user.uid = "test_user";
        user.save(function(raw) {})
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

        UserModel.remove({ uid: 'test_user' }, function(err, data) {
            if (err) throw err;
        });
        UserModel.remove({ uid: 'unknown_user' }, function(err, data) {
            if (err) throw err;
        });
    })
}
