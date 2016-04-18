var properties = require(process.cwd() + '/properties/properties');

var apiDb;

exports.initialize= function(callback) {
    if (properties.esup.apiDb) {
        apiDb = require(process.cwd() + '/controllers/api/' + properties.esup.apiDb);
    	apiDb.initialize(callback);
    } else console.log("Unknown apiDb");
}

exports.get_methods = function(req, res, next) {
    console.log("get_methods");
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

/**
 * Active la méthode req.params.method
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.activate_method_admin = function(req, res, next) {
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