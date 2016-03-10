var properties = require(process.cwd() + '/properties/properties');
var ldap;

exports.initialize = function(bind, callback) {
    ldap = bind;
    if (typeof(callback) === "function") callback();
}


exports.get_available_transports = function(req, res, next) {
    console.log("get_available_transports");
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    var response = {
        "code" : "Error",
        "message" : "User not found"
    };
    ldap.search({
        attrs: properties.esup.ldap.transport.mail + ' ' + properties.esup.ldap.transport.sms,
        filter: 'uid=' + req.params.uid
    }, function(err, data) {
        if (err) console.log("search error: " + err);
        if(!data[0])res.send(response);
        var result = {};
        if (data[0][properties.esup.ldap.transport.sms]) {
            var tel = "******" + data[0][properties.esup.ldap.transport.sms][0].substr(data[0][properties.esup.ldap.transport.sms][0].length - 4, 4);
            result.sms = tel;
        };
        if (data[0][properties.esup.ldap.transport.mail]) { 
        	var size = data[0][properties.esup.ldap.transport.mail][0].length-10;
        	var email = data[0][properties.esup.ldap.transport.mail][0].substr(0,4);
        	for(var i=0;i<size;i++){
        		email+='*';
        	}
        	email+=data[0][properties.esup.ldap.transport.mail][0].substr(data[0][properties.esup.ldap.transport.mail][0].length - 6,6)
        	result.mail = email; 
        };
        response.code = "Ok";
        response.message = "Transports List found";
        response.transports_list = result;
        res.send(response);
    });
}

exports.send_sms = function(uid, callback, res) {
    ldap.search({
        attrs: properties.esup.ldap.transport.sms,
        filter: 'uid=' + uid
    }, function(err, data) {
        if (err) console.log("search error: " + err);
        if (data[0]) {
            if (typeof(callback) === "function" && data[0][properties.esup.ldap.transport.sms]) callback(data[0][properties.esup.ldap.transport.sms][0]);
        }else res.send({
                "code": "Error",
                "message": "User not found"
        });
    });
}


exports.send_mail = function(uid, callback, res) {
    ldap.search({
        attrs: properties.esup.ldap.transport.mail,
        filter: 'uid=' + uid
    }, function(err, data) {
        if (err) console.log("search error: " + err);
        if (data[0]) {
            if (typeof(callback) === "function" && data[0][properties.esup.ldap.transport.mail]) callback(data[0][properties.esup.ldap.transport.mail][0]);
        }else res.send({
                "code": "Error",
                "message": "User not found"
            });
    });
}

exports.send_app = function(uid, callback, res) {
    ldap.search({
        attrs: 'uid',
        filter: 'uid=' + uid
    }, function(err, data) {
        if (err) console.log("search error: " + err);
        if (data[0]) {
            if (typeof(callback) === "function") callback();
        }else res.send({
                "code": "Error",
                "message": "User not found"
            });
    });
}

