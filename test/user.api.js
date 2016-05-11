var assert = require('chai').assert;

var properties = require(__dirname + '/../properties/properties');

var mongo_connection;


/** User Model **/
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

    after(function() {
        UserModel.remove({ uid: 'test_user' }, function(err, data) {
            if (err) throw err;
        });
    })
}
