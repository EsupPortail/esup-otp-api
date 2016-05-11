var assert = require('chai').assert;
var os = require('os');
var request = require('request');
var utils = require(__dirname + '/../services/utils');
var properties = require(__dirname + '/../properties/properties');

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
    before(function() {
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

    after(function() {
        UserModel.remove({ uid: 'test_user' }, function(err, data) {
            if (err) throw err;
        });
    })
}
