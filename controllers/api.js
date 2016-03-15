var properties = require(process.cwd() + '/properties/properties');

exports.get_available_methods = function(req, res, next) {
    console.log("get_available_methods_v2");

    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    var response = {
        "code": "Error",
        "message": "No method found"
    };
    response.methods = [];
    for (method in properties.esup.methods) {
        if (properties.esup.methods[method].login_view) {
            response.methods.push(method);
            response.code = "Ok";
            response.message = "Method(s) found";
        }
    }
    res.send(response);
}
