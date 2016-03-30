var properties = require(process.cwd() + '/properties/properties');
var mysql = require('mysql');


var connection;

exports.initialize = function(callback) {
    connection = mysql.createConnection(properties.esup.mysql);
    if (typeof(callback) === "function") callback();
}

function get_user(req, res, callback) {
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

exports.get_available_transports = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    get_user(req, res, function(user) {
        res.send({
            code: "Ok",
            message: "Transports list found",
            "transports_list": {
                sms: user.sms,
                mail: user.mail
            }
        });
    });
}

exports.send_sms = function(req, res, callback) {
    get_user(req, res, function(user) {
        console.log(user);
        if (typeof(callback) === "function" && user[properties.esup.mysql.transport.sms]) callback(user[properties.esup.mysql.transport.sms]);
    });
}


exports.send_mail = function(req, res, callback) {
    get_user(req, res, function(user) {
        if (typeof(callback) === "function" && user[properties.esup.mysql.transport.mail]) callback(user[properties.esup.mysql.transport.mail]);
    });
}

exports.update_transport = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    connection.query(
        "UPDATE " + properties.esup.mysql.userTable + " SET " + req.params.transport + " = ? Where uid = ?", [req.params.new_transport, req.params.uid],
        function(err, result) {
            if (err) throw err;
            else res.send({
                code: 'Ok',
                message: properties.messages.success.update
            });
        }
    );
}
