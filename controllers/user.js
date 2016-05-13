var properties = require(__dirname + '/../properties/properties');

var userDb;

exports.initialize= function(callback) {
    if (properties.esup.apiDb) {
        userDb = require(__dirname + '/../databases/user/' + properties.esup.userDb);
        userDb.initialize(callback);
        exports.userDb = userDb;
    } else console.log("Unknown apiDb");
}