var properties = require(__dirname + '/../../properties/properties');
var utils = require(__dirname + '/../../services/utils');
var mysql = require('mysql');


var connection;

exports.initialize = function(callback) {
    connection = mysql.createConnection(properties.esup.mysql);
    if (typeof(callback) === "function") callback();
}

function find_user(req, res, callback) {
    connection.query("Select * From " + properties.esup.mysql.userTable + " u Where u.uid = ?", [req.params.uid], function(err, rows, fields) {
        if (err) throw err;
        if (rows[0]) {
            if (typeof(callback) === "function") callback(rows[0]);
        } else res.send({
            "code": "Error",
            "message": properties.messages.error.user_not_found
        });
    });
}

exports.user_exist= function(req, res, callback){
    find_user(req, res, function(user){
         if (typeof(callback) === "function") callback(user);
    })
}

exports.get_available_transports = function(req, res, next) {
    find_user(req, res, function(user) {
        var response = {};
        var result = {};
        if (user[properties.esup.mongodb.transport.mail]) result.mail = utils.cover_string(user[properties.esup.mysql.transport.mail], 4, 5);
        if (user[properties.esup.mongodb.transport.sms]) result.sms = utils.cover_string(user[properties.esup.mysql.transport.sms], 2, 2);
        if (typeof(callback) === "function") callback(result);
        else {
            response.code = "Ok";
            response.message = properties.messages.success.transports_found;
            response.transports_list = result;
            res.send(response);
        }
    });
}


exports.send_sms = function(req, res, callback) {
    find_user(req, res, function(user) {
        console.log(user);
        if (typeof(callback) === "function") callback(user[properties.esup.mysql.transport.sms]);
    });
}


exports.send_mail = function(req, res, callback) {
    find_user(req, res, function(user) {
        if (typeof(callback) === "function") callback(user[properties.esup.mysql.transport.mail]);
    });
}

exports.update_transport = function(req, res, next) {
    connection.query(
        "UPDATE " + properties.esup.mysql.userTable + " SET " + properties.esup.mongodb.transport[req.params.transport] + " = ? Where uid = ?", [req.params.new_transport, req.params.uid],
        function(err, result) {
            if (err) throw err;
            else res.send({
                code: 'Ok',
                message: properties.messages.success.update
            });
        }
    );
}

exports.delete_transport = function(req, res, next) {
    connection.query(
        "UPDATE " + properties.esup.mysql.userTable + " SET " + properties.esup.mongodb.transport[req.params.transport] + " = ? Where uid = ?", ["", req.params.uid],
        function(err, result) {
            if (err) throw err;
            else res.send({
                code: 'Ok',
                message: properties.messages.success.update
            });
        }
    );
}
