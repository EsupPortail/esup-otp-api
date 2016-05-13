var properties = require(__dirname + '/../../properties/properties');
var utils = require(__dirname + '/../../services/utils');
var mongoose = require('mongoose');
var connection;

exports.initialize = function(callback) {
    connection = mongoose.createConnection('mongodb://' + properties.esup.mongodb.address + '/' + properties.esup.mongodb.db, function(error) {
        if (error) {
            console.log(error);
        } else {
            initiatilize_user_model();
            if (typeof(callback) === "function") callback();
        }
    });
}

/** User Model **/
var User;

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
    User = connection.model('User');
}

function find_user(req, res, callback) {
    var response = {
        "code": "Error",
        "message": properties.messages.error.user_not_found
    };
    User.find({
        'uid': req.params.uid
    }).exec(function(err, data) {
        if (data[0]) {
            if (typeof(callback) === "function") callback(data[0]);
        } else {
            if(properties.esup.auto_create_user)create_user(req, res, callback);
            else res.send(response);
        }
    });
}

function create_user(req, res, callback) {
    var new_user = new User({
        uid : req.params.uid
    });
    new_user.save(function() {
        if (typeof(callback) === "function") callback(new_user);
    });
}

exports.user_exists= function(req, res, callback){
    console.log("user_exists mongodb_user");
    find_user(req, res, function(user){
         if (typeof(callback) === "function") callback(user);
    })
}


exports.get_available_transports = function(req, res, callback) {
    console.log("get_available_transports");
    find_user(req, res, function(user) {
        var response = {};
        var result = {};
        if (user[properties.esup.mongodb.transport.mail]) result.mail = utils.cover_string(user[properties.esup.mongodb.transport.mail], 4, 5);
        if (user[properties.esup.mongodb.transport.sms]) result.sms = utils.cover_string(user[properties.esup.mongodb.transport.sms], 2, 2);
        if (typeof(callback) === "function") callback(result);
        else {
            console.log()
            response.code = "Ok";
            response.message = properties.messages.success.transports_found;
            response.transports_list = result;
            res.send(response);
        }
    });
}



exports.send_sms = function(req, res, callback) {
    find_user(req, res, function(user) {
        if (typeof(callback) === "function") callback(user[properties.esup.mongodb.transport.sms]);
    });
}


exports.send_mail = function(req, res, callback) {
    find_user(req, res, function(user) {
        if (typeof(callback) === "function") callback(user[properties.esup.mongodb.transport.mail]);
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

exports.delete_transport = function(req, res, next) {
    find_user(req, res, function(user) {
        user[properties.esup.mongodb.transport[req.params.transport]]="";
        user.save(function(){
            res.send({
                code: 'Ok',
                message: properties.messages.success.update
            });
        })
    });
}