var properties = require(process.cwd() + '/properties/properties');

exports.get_methods = function(req, res, next) {
    console.log("get_methods");

    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    var response = {
        "code": "Error",
        "message": "No method found"
    };
    response.methods = [];
    for (method in properties.esup.methods) {
        if (properties.esup.methods[method].activate) {
            response.methods.push(method);
            response.code = "Ok";
            response.message = "Method(s) found";
        }
    }
    res.send(response);
}

exports.get_methods_admin = function(req, res, next) {
    console.log("get__methods_admin");

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