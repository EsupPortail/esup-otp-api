var properties = require(process.cwd() + '/properties/properties');

exports.get_available_methods = function(req, res, next) {
    console.log("get_available_methods");

    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    
    var response = {
        "code" : "Error",
        "message" : "No method found"
    };
    response.methods_list = [];
    for (method in properties.esup.methods_list) {
        var method_name = properties.esup.methods_list[method];
        if (properties.esup[method_name].transports) {
            var m = {
                "method": method_name,
                "transports": properties.esup[method_name].transports
            }
            response.methods_list.push(m);
            response.code = "Ok";
            response.message = "Method(s) found";
        }
    }
    res.send(response);
}