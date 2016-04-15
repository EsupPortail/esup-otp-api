var properties = require(process.cwd() + '/properties/properties');
var CryptoJS = require('crypto-js');

exports.get_methods = function(req, res, next) {
    console.log("get_methods");

    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    var response = {
        "code": "Error",
        "message": "No method found"
    };
    response.methods = {};
    for (method in properties.esup.methods) {
        response.methods[method] = properties.esup.methods[method];
        response.code = "Ok";
        response.message = "Method(s) found";
    }
    res.send(response);
}

exports.get_hash = function(uid) {
    var d = new Date();
    var day = d.getDay();
    var hour = d.getHours();

    var next_day = day;
    var past_day = day;
    if(hour==23)next_day = day +1;
    if(hour==0) past_day = day -1;

    var next_hour;
    var past_hour;    
    next_hour = (hour + 1)%24;
    past_hour = (hour - 1)%24;

    var present_salt = day.toString()+hour.toString();
    var next_salt = next_day.toString()+next_hour.toString();
    var past_salt = past_day.toString()+past_hour.toString();

    present_hash = CryptoJS.SHA256(CryptoJS.MD5(properties.esup.users_secret).toString()+uid+present_salt).toString(); 
    next_hash = CryptoJS.SHA256(CryptoJS.MD5(properties.esup.users_secret).toString()+uid+next_salt).toString(); 
    past_hash = CryptoJS.SHA256(CryptoJS.MD5(properties.esup.users_secret).toString()+uid+past_salt).toString(); 

    var hashes = [past_hash, present_hash, next_hash];

    return hashes;
}

exports.cover_string = function(str, start, end) {
    if (str.length <= (start + end)) return str;
    var start_str = str.substr(0, start);
    var end_str = str.substr(str.length - (end + 1), str.length - 1);
    var middle_str = '';
    for (var i = 0; i < str.length - (start + end); i++) {
        middle_str += '*';
    }
    return start_str + middle_str + end_str;
}

/**
 * Active la méthode req.params.method
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.activate_method_admin = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    console.log("ADMIN activate_method " + req.params.method);
    if (properties.esup.methods[req.params.method]) {
        properties.esup.methods[req.params.method].activate = true;
        res.send({
            code: 'Ok',
            message: ''
        });
    } else res.send({
        "code": "Error",
        "message": properties.messages.error.method_not_found
    });
};

/**
 * Désctive la méthode req.params.method
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.deactivate_method_admin = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    console.log("ADMIN deactivate_method " + req.params.method);
    if (properties.esup.methods[req.params.method]) {
        properties.esup.methods[req.params.method].activate = false;
        res.send({
            code: 'Ok',
            message: ''
        });
    } else res.send({
        "code": "Error",
        "message": properties.messages.error.method_not_found
    });
};

/**
 * Active le transport req.params.transport pour la  méthode req.params.method
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.activate_method_transport = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    console.log("ADMIN activate_method_transport " +req.params.transport +' '+ req.params.method);
    if (properties.esup.methods[req.params.method]) {
        properties.esup.methods[req.params.method][req.params.transport] = true;
        res.send({
            code: 'Ok',
            message: ''
        });
    } else res.send({
        "code": "Error",
        "message": properties.messages.error.method_not_found
    });
};

/**
 * Désctive le transport req.params.transport pour la  méthode req.params.method
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.deactivate_method_transport = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    console.log("ADMIN deactivate_method_transport " +req.params.transport +' '+req.params.method);
    if (properties.esup.methods[req.params.method]) {
        properties.esup.methods[req.params.method][req.params.transport] = false;
        res.send({
            code: 'Ok',
            message: ''
        });
    } else res.send({
        "code": "Error",
        "message": properties.messages.error.method_not_found
    });
};

exports.generate_string_code = function(code_length) {
    return Math.random().toString(36).substr(2, code_length);
}

exports.generate_digit_code = function(code_length) {
    return Math.random().toString().substr(2, code_length);
}