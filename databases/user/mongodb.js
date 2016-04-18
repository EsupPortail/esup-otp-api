var properties = require(process.cwd() + '/properties/properties');
var utils = require(process.cwd() + '/services/utils');
var mongoose = require('mongoose');
var connection;

exports.initialize = function(callback) {
    connection = mongoose.createConnection('mongodb://' + properties.esup.mongodb.address + '/' + properties.esup.mongodb.user_db, function(error) {
        if (error) {
            console.log(error);
        } else {
            initiatilize_user_model();
            if (typeof(callback) === "function") callback();
        }
    });
}

/** User Model **/
var UserModel;

function initiatilize_user_model() {
    var Schema = mongoose.Schema;

    var UserSchema = new Schema({
        uid: {
            type: String,
            required: true,
            unique: true
        },
       mobile: String,
       mail: String
    });

    connection.model('User', UserSchema, 'User');
    UserModel = connection.model('User');
}

function find_user(req, res, callback) {
    var response = {
        "code": "Error",
        "message": properties.messages.error.user_not_found
    };
    UserModel.find({
        'uid': req.params.uid
    }).exec(function(err, data) {
        if (data[0]) {
            if (typeof(callback) === "function") callback(data[0]);
        } else {
            res.send(response);
        }
    });
}


exports.get_available_transports = function(req, res, next) {
    console.log("get_available_transports");


    find_user(req, res, function(user) {
        var response = {};
        var result = {};
        if (user[properties.esup.mongodb.transport.mail]) result.mail = utils.cover_string(user[properties.esup.mongodb.transport.mail], 4, 5);
        if (user[properties.esup.mongodb.transport.sms]) result.sms = utils.cover_string(user[properties.esup.mongodb.transport.sms], 2, 2);
        response.code = "Ok";
        response.message = properties.messages.success.transports_found;
        response.transports_list = result;
        res.send(response);
    });
}


exports.send_sms = function(req, res, callback) {
    find_user(req, res, function(user) {
        if (typeof(callback) === "function" && user[properties.esup.mongodb.transport.sms]) callback(user[properties.esup.mongodb.transport.sms]);
    });
}


exports.send_mail = function(req, res, callback) {
    find_user(req, res, function(user) {
        if (typeof(callback) === "function" && user[properties.esup.mongodb.transport.mail]) callback(user[properties.esup.mongodb.transport.mail]);
    });
}

exports.update_transport = function(req, res, next) {


    find_user(req, res, function(user) {
        user[properties.esup.mongodb.transport[req.params.transport]]=req.params.new_transport;
        user.save(function(){
            res.send({
                code: 'Ok',
                message: properties.messages.success.update
            });
        })
    });
}