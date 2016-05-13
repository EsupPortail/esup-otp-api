var userDb_controller = require(__dirname + '/user');
var restify = require('restify');
var mailer = require(__dirname + '/../services/mailer');
var sms = require(__dirname + '/../services/sms');

var apiDb;

exports.initialize= function(callback) {
    if (global.properties.esup.apiDb) {
        apiDb = require(__dirname + '/../databases/api/' + global.properties.esup.apiDb);
    	apiDb.initialize(callback);
        exports.apiDb = apiDb;
    } else console.log("Unknown apiDb");
}

exports.get_methods = function(req, res, next) {
    var response = {
        "code": "Error",
        "message": "No method found"
    };
    response.methods = {};
    for (method in global.properties.esup.methods) {
        response.methods[method] = global.properties.esup.methods[method];
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
    if (global.properties.esup.methods[req.params.method]) {
        global.properties.esup.methods[req.params.method].activate = true;
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
    if (global.properties.esup.methods[req.params.method]) {
        global.properties.esup.methods[req.params.method].activate = false;
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
    if (global.properties.esup.methods[req.params.method]) {
        var index = global.properties.esup.methods[req.params.method].transports.indexOf(req.params.transport);
        if (index < 0) {
            global.properties.esup.methods[req.params.method].transports.push(req.params.transport);
        }
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
    if (global.properties.esup.methods[req.params.method]) {
        var index = global.properties.esup.methods[req.params.method].transports.indexOf(req.params.transport);
        if (index >= 0) {
            global.properties.esup.methods[req.params.method].transports.splice(index, 1);
        }
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
 * Crée l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.create_user=function(uid, callback) {
    apiDb.create_user(uid, callback);
}

/**
 * Sauve l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.save_user=function(user, callback) {
    apiDb.save_user(user, callback);
}

/**
 * Supprime l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.remove_user=function(uid, callback) {
    apiDb.remove_user(uid, callback);
}

/**
 * Envoie le code via le transport == req.params.transport
 * Retourne la réponse du service mail
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.transport_code = function(code, req, res, next) {
    transport(code, req, res, next);
}

/**
 * Envoie un message de confirmation sur le transport
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.transport_test = function(req, res, next) {
    transport(properties.messages.transport.pre_test+req.params.uid+properties.messages.transport.post_test,req ,res, next);
};

/**
 * Envoie un message
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
function transport(message, req, res, next) {
    switch (req.params.transport) {
        case 'mail':
            userDb_controller.send_mail(req, res, function(mail) {
                mailer.send_message(mail, message, res);
            });
            break;
        case 'sms':
            userDb_controller.send_sms(req, res, function(num) {
                sms.send_message(num, message, res);
            });
            break;
        default:
            res.send({
                code: 'Error',
                message: properties.messages.error.unvailable_method_transport
            });
            break;
    }
}



/**
 * Renvoie l'utilisateur avec l'uid == req.params.uid
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.get_user = function(req, res, next) {
    apiDb.find_user(req, res, function(user){
        var response = {};
        response.code = 'Ok';
        response.message = '';
        response.user = apiDb.parse_user(user);
        res.send(response);
    });
};

/**
 * Renvoie les infos (methodes activees, transports) de utilisateur avec l'uid == req.params.uid
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.get_user_infos = function(req, res, next) {
    apiDb.find_user(req, res, function(user) {
        userDb_controller.get_available_transports(req, res, function(data) {
            var response = {};
            response.code = 'Ok';
            response.message = '';
            response.user = {};
            response.user.methods = apiDb.parse_user(user);
            response.user.transports = data;
            res.send(response);
        })
    });
};


/**
 * Envoie un code à l'utilisateur avec l'uid == req.params.uid et via la method == req.params.method
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.send_message = function(req, res, next) {
    console.log("send_code :" + req.params.uid);
    if (global.properties.esup.methods[req.params.method]) {
        apiDb.find_user(req, res, function(user) {
            if (user[req.params.method].active && global.properties.esup.methods[req.params.method].activate && methods[req.params.method]) {
                methods[req.params.method].send_message(user, req, res, next);
            } else {
                res.send({
                    code: 'Error',
                    message: properties.messages.error.method_not_found
                });
            }
        });
    } else {
        res.send({
            code: 'Error',
            message: properties.messages.error.method_not_found
        });
    }
};


/**
 * Vérifie si le code fourni correspond à celui stocké en base de données
 * si oui: on retourne un réponse positive et on supprime l'otp de la base de donnée
 * sinon: on renvoie une erreur 401 InvalidCredentialsError
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.verify_code = function(req, res, next) {
    console.log('verify_code : '+req.params.uid);
    apiDb.find_user(req, res, function(user) {
        var callbacks = [function() {
            console.log('Error : '+properties.messages.error.invalid_credentials);
            res.send({
                "code": "Error",
                "message": properties.messages.error.invalid_credentials
            });
        }];
        var methods_length = Object.keys(methods).length;
        var it = 1;
        for (method in methods) {
            if (user[method].active && global.properties.esup.methods[method].activate) {
                if(it==methods_length)methods[method].verify_code(user, req, res, callbacks);
            }
            callbacks.push(methods[method].verify_code);
            it++;
        }
    });
};


/**
 * Génére un nouvel attribut d'auth (secret key ou matrice ou bypass codes)
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.generate_method_secret = function(req, res, next) {
    if (global.properties.esup.methods[req.params.method]) {
        apiDb.find_user(req, res, function(user) {
            if (methods[req.params.method] && global.properties.esup.methods[req.params.method].activate) {
                methods[req.params.method].generate_method_secret(user, req, res, next);
            } else {
                res.send({
                    code: 'Error',
                    message: properties.messages.error.method_not_found
                });
            }
        });
    } else {
        res.send({
            code: 'Error',
            message: properties.messages.error.method_not_found
        });
    }
};


/**
 * Supprime l'attribut d'auth (secret key ou matrice ou bypass codes)
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.delete_method_secret = function(req, res, next) {
    if (global.properties.esup.methods[req.params.method]) {
        apiDb.find_user(req, res, function(user) {
            methods[req.params.method].delete_method_secret(user, req, res, next);
        });
    } else {
        res.send({
            code: 'Error',
            message: properties.messages.error.method_not_found
        });
    }
};

/**
 * Renvoie le secret de l'utilisateur afin qu'il puisse l'entrer dans son appli smartphone
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.get_method_secret = function(req, res, next) {
    if (global.properties.esup.methods[req.params.method]) {
        apiDb.find_user(req, res, function(user) {
            methods[req.params.method].get_method_secret(user, req, res, next);
        });
    } else {
        res.send({
            code: 'Error',
            message: properties.messages.error.method_not_found
        });
    }
};

/**
 * Renvoie les méthodes activées de l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.get_activate_methods = function(req, res, next) {
    apiDb.find_user(req, res, function(user) {
        var response = {};
        var result = {};
        for (method in global.properties.esup.methods) {
            if (global.properties.esup.methods[method].activate) {
                if(!user[method].active)result[method] = user[method].active;
                else result[method] = global.properties.esup.methods[method];
            }
        }
        response.code = "Ok";
        response.message = properties.messages.success.methods_found;
        response.methods = result;
        res.send(response);
    });

};


/**
 * Active la méthode l'utilisateur ayant l'uid req.params.uid
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.activate_method = function(req, res, next) {
    console.log(req.params.uid + " activate_method " + req.params.method);
    if (methods[req.params.method]) {
        apiDb.find_user(req, res, function(user) {
            methods[req.params.method].user_activate(user, req, res, next);
        });
    } else res.send({
        "code": "Error",
        "message": properties.messages.error.method_not_found
    });
};


/**
 * Désctive la méthode l'utilisateur ayant l'uid req.params.uid
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.deactivate_method = function(req, res, next) {
    console.log(req.params.uid + " deactivate_method " + req.params.method);
    if (methods[req.params.method]) {
        apiDb.find_user(req, res, function(user) {
            methods[req.params.method].user_deactivate(user, req, res, next);
        });
    } else res.send({
        "code": "Error",
        "message": properties.messages.error.method_not_found
    });
};

/**
 * Drop Users
 */
exports.drop = function(req, res, next) {
    apiDb.drop(req, res, next);
};