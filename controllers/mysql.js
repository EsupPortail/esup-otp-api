var properties = require(process.cwd() + '/properties/properties');
var mysql = require('mysql');


var connection;

exports.initialize = function(callback) {
    connection = mysql.createConnection(properties.esup.mysql);
    if (typeof(callback) === "function") callback();
}

exports.get_available_transports = function(req, res, next) {
    if (req.params.uid) {
        connection.query("Select * From User u Where u.uid = '" + req.params.uid + "'", function(err, rows, fields) {
            if (err) throw err;
            if (rows[0]) {
                res.send({
                    code: "Ok",
                    message: "Transports list found",
                    "transports_list": {
                        sms: rows[0].sms,
                        mail: rows[0].mail
                    }
                });
            } else res.send({
                "code": "Error",
                "message": properties.messages.error.user_not_found
            });
        });
    } else res.send({
        code: "Error",
        message: "Wrong parameters"
    });
}

exports.send_sms = function(uid, callback, res) {
    if (uid) {
        connection.query("Select * From User u Where u.uid = '" + uid + "'", function(err, rows, fields) {
            if (err) throw err;
            if (rows[0]) {
                if (typeof(callback) === "function" && rows[0].sms) callback(rows[0].sms);
            } else res.send({
                "code": "Error",
                "message": properties.messages.error.user_not_found
            });
        });
    } else res.send({
        code: "Error",
        message: "Wrong parameters"
    });
}


exports.send_mail = function(uid, callback, res) {
    if (uid) {
        connection.query("Select * From User u Where u.uid = '" + uid + "'", function(err, rows, fields) {
            if (err) throw err;
            if (rows[0]) {
                if (typeof(callback) === "function" && rows[0].mail) callback(rows[0].mail);
            } else res.send({
                "code": "Error",
                "message": properties.messages.error.user_not_found
            });
        });
    } else res.send({
        code: "Error",
        message: "Wrong parameters"
    });
}
