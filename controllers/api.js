var userDb_controller = require(__dirname + '/user');
var restify = require('restify');
var utils = require(__dirname + '/../services/utils');
var mailer = require(__dirname + '/../services/mailer');
var sms = require(__dirname + '/../services/sms');
var properties = require(__dirname + '/../properties/properties');
var methods;
var apiDb;

var logger = require(__dirname + '/../services/logger').getInstance();

exports.initialize = function (callback) {
    if (properties.getEsupProperty('apiDb')) {
        apiDb = require(__dirname + '/../databases/api/' + properties.getEsupProperty('apiDb'));
        methods = require(__dirname + '/../methods/methods');
        apiDb.initialize(callback);
        exports.apiDb = apiDb;
    } else logger.error(utils.getFileName(__filename) + ' ' + "Unknown apiDb");
}

exports.get_methods = function (req, res, next) {
    var response = {
        "code": "Error",
        "message": "No method found"
    };
    response.methods = {};
    for (method in properties.getEsupProperty('methods')) {
        response.methods[method] = properties.getMethod(method);
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
exports.activate_method_admin = function (req, res, next) {
    if (properties.getMethod(req.params.method)) {
        properties.setMethodProperty(req.params.method, 'activate', true);
        apiDb.update_api_preferences();
        res.send({
            code: 'Ok',
            message: ''
        });
    } else res.send({
        "code": "Error",
        "message": properties.getMessage('error', 'method_not_found')
    });
};

/**
 * Désctive la méthode req.params.method
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.deactivate_method_admin = function (req, res, next) {
    if (properties.getMethod(req.params.method)) {
        properties.setMethodProperty(req.params.method, 'activate', false);
        apiDb.update_api_preferences();
        res.send({
            code: 'Ok',
            message: ''
        });
    } else res.send({
        "code": "Error",
        "message": properties.getMessage('error', 'method_not_found')
    });
};

/**
 * Active le transport req.params.transport pour la  méthode req.params.method
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.activate_method_transport = function (req, res, next) {
    if (properties.getMethod(req.params.method)) {
        properties.addMethodTransport(req.params.method, req.params.transport);
        apiDb.update_api_preferences();
        res.send({
            code: 'Ok',
            message: ''
        });
    } else res.send({
        "code": "Error",
        "message": properties.getMessage('error', 'method_not_found')
    });
};

/**
 * Désactive le transport req.params.transport pour la  méthode req.params.method
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.deactivate_method_transport = function (req, res, next) {
    if (properties.getMethod(req.params.method)) {
        properties.removeMethodTransport(req.params.method, req.params.transport);
        apiDb.update_api_preferences();
        res.send({
            code: 'Ok',
            message: ''
        });
    } else res.send({
        "code": "Error",
        "message": properties.getMessage('error', 'method_not_found')
    });
};

/**
 * Crée l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.create_user = function (uid, callback) {
    apiDb.create_user(uid, callback);
}

/**
 * Sauve l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.save_user = function (user, callback) {
    apiDb.save_user(user, callback);
}

/**
 * Supprime l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.remove_user = function (uid, callback) {
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
exports.transport_code = function (code, req, res, next) {
    var opts = {};
    opts.object = properties.getMessage('transport', 'code').object;
    opts.message = code;
    opts.codeRequired = properties.getMethodProperty(req.params.method, 'codeRequired');
    opts.waitingFor = properties.getMethodProperty(req.params.method, 'waitingFor');
    switch (req.params.transport) {
        case 'mail':
            opts.message = properties.getMessage('transport', 'code').mail.pre_test + code + properties.getMessage('transport', 'code').mail.post_test
            break;
        case 'sms':
            opts.message = properties.getMessage('transport', 'code').sms.pre_test + code + properties.getMessage('transport', 'code').sms.post_test
            break;
        default:
            opts.message = properties.getMessage('transport', 'code').mail.pre_test + code + properties.getMessage('transport', 'code').mail.post_test
            break;
    }
    transport(opts, req, res, next);
}

/**
 * Envoie un message de confirmation sur le transport
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.transport_test = function (req, res, next) {
    var opts = {}
    opts.object = properties.getMessage('transport', 'test').object;
    opts.message = '';
    switch (req.params.transport) {
        case 'mail':
            opts.message = properties.getMessage('transport', 'test').mail.pre_test + req.params.uid + properties.getMessage('transport', 'test').mail.post_test
            break;
        case 'sms':
            opts.message = properties.getMessage('transport', 'test').sms.pre_test + req.params.uid + properties.getMessage('transport', 'test').sms.post_test
            break;
        default:
            opts.message = properties.getMessage('transport', 'test').mail.pre_test + req.params.uid + properties.getMessage('transport', 'test').mail.post_test
            break;
    }
    transport(opts, req, res, next);
};

/**
 * Envoie un message
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
function transport(opts, req, res, next) {
    switch (req.params.transport) {
        case 'mail':
            userDb_controller.send_mail(req, res, function (mail) {
                mailer.send_message(mail, opts, res);
            });
            break;
        case 'sms':
            userDb_controller.send_sms(req, res, function (num) {
                sms.send_message(num, opts, res);
            });
            break;
        default:
            res.send({
                code: 'Error',
                message: properties.getMessage('error', 'unvailable_method_transport')
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
exports.get_user = function (req, res, next) {
    apiDb.find_user(req, res, function (user) {
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
exports.get_user_infos = function (req, res, next) {
    apiDb.find_user(req, res, function (user) {
        userDb_controller.get_available_transports(req, res, function (data) {
            var response = {};
            response.code = 'Ok';
            response.message = '';
            response.user = {};
            response.user.methods = apiDb.parse_user(user);
            data.push = user.push.device.platform+' Push';
            response.user.transports = data;
            res.send(response);
        })
    });
};

/**
 * 
 * 
 */
/**
 * Envoie un code à l'utilisateur avec l'uid == req.params.uid et via la method == req.params.method
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.send_message = function (req, res, next) {
    if (properties.getMethod(req.params.method)) {
        apiDb.find_user(req, res, function (user) {
            if (user[req.params.method].active && properties.getMethodProperty(req.params.method, 'activate') && methods[req.params.method]) {
                methods[req.params.method].send_message(user, req, res, next);
            } else {
                res.send({
                    code: 'Error',
                    message: properties.getMessage('error', 'method_not_found')
                });
            }
        });
    } else {
        res.send({
            code: 'Error',
            message: properties.getMessage('error', 'method_not_found')
        });
    }
};

exports.accept_authentication = function (req, res, next) {
    if (properties.getMethod(req.params.method) && req.params.method=='push') {
        apiDb.find_user(req, res, function (user) {
            if (user[req.params.method].active && properties.getMethodProperty(req.params.method, 'activate') && methods[req.params.method]) {
                methods[req.params.method].accept_authentication(user, req, res, next);
            } else {
                res.send({
                    code: 'Error',
                    message: properties.getMessage('error', 'method_not_found')
                });
            }
        });
    } else {
        res.send({
            code: 'Error',
            message: properties.getMessage('error', 'method_not_found')
        });
    }
};

exports.check_accept_authentication = function (req, res, next) {
    if (properties.getMethod(req.params.method) && req.params.method=='push') {
        apiDb.find_user(req, res, function (user) {
            if (user[req.params.method].active && properties.getMethodProperty(req.params.method, 'activate') && methods[req.params.method]) {
                methods[req.params.method].check_accept_authentication(user, req, res, next);
            } else {
                res.send({
                    code: 'Error',
                    message: properties.getMessage('error', 'method_not_found')
                });
            }
        });
    } else {
        res.send({
            code: 'Error',
            message: properties.getMessage('error', 'method_not_found')
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
exports.verify_code = function (req, res, next) {
    apiDb.find_user(req, res, function (user) {
        logger.debug("verify_code: " + user.uid);
        var callbacks = [function () {
            logger.info(utils.getFileName(__filename) + ' ' + "Invalid credentials submit for user with uid : " + user.uid);
            res.send({
                "code": "Error",
                "message": properties.getMessage('error', 'invalid_credentials')
            });
        }];
        var methods_length = Object.keys(methods).length;
        var it = 1;
        for (method in methods) {
            if (it == methods_length)
                methods[method].verify_code(user, req, res, callbacks);
            else
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
exports.generate_method_secret = function (req, res, next) {
    if (properties.getMethod(req.params.method)) {
        apiDb.find_user(req, res, function (user) {
            if (methods[req.params.method] && properties.getMethodProperty(req.params.method, 'activate')) {
                methods[req.params.method].generate_method_secret(user, req, res, next);
            } else {
                res.send({
                    code: 'Error',
                    message: properties.getMessage('error', 'method_not_found')
                });
            }
        });
    } else {
        res.send({
            code: 'Error',
            message: properties.getMessage('error', 'method_not_found')
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
exports.delete_method_secret = function (req, res, next) {
    if (properties.getMethod(req.params.method)) {
        apiDb.find_user(req, res, function (user) {
            methods[req.params.method].delete_method_secret(user, req, res, next);
        });
    } else {
        res.send({
            code: 'Error',
            message: properties.getMessage('error', 'method_not_found')
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
exports.get_method_secret = function (req, res, next) {
    if (properties.getMethod(req.params.method)) {
        apiDb.find_user(req, res, function (user) {
            methods[req.params.method].get_method_secret(user, req, res, next);
        });
    } else {
        res.send({
            code: 'Error',
            message: properties.getMessage('error', 'method_not_found')
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
exports.get_activate_methods = function (req, res, next) {
    apiDb.find_user(req, res, function (user) {
        var response = {};
        var result = {};
        for (method in properties.getEsupProperty('methods')) {
            result[method] = user[method].active;
        }
        response.code = "Ok";
        response.message = properties.getMessage('success', 'methods_found');
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
exports.activate_method = function (req, res, next) {
    logger.info(utils.getFileName(__filename) + ' ' + req.params.uid + " activate_method " + req.params.method);
    if (methods[req.params.method]) {
        apiDb.find_user(req, res, function (user) {
            methods[req.params.method].user_activate(user, req, res, next);
        });
    } else res.send({
        "code": "Error",
        "message": properties.getMessage('error', 'method_not_found')
    });
};

/**
 * Certaine méthode (push) nécessite une activation en deux étapes
 * Confirme l'activation de la méthode l'utilisateur ayant l'uid req.params.uid
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.confirm_activate_method = function (req, res, next) {
    logger.info(utils.getFileName(__filename) + ' ' + req.params.uid + " activate_method " + req.params.method);
    if (methods[req.params.method]) {
        apiDb.find_user(req, res, function (user) {
            methods[req.params.method].confirm_user_activate(user, req, res, next);
        });
    } else res.send({
        "code": "Error",
        "message": properties.getMessage('error', 'method_not_found')
    });
};


/**
 * Désctive la méthode l'utilisateur ayant l'uid req.params.uid
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.deactivate_method = function (req, res, next) {
    logger.info(utils.getFileName(__filename) + ' ' + req.params.uid + " deactivate_method " + req.params.method);
    logger.info(methods[req.params.method]);
    if (methods[req.params.method]) {
        apiDb.find_user(req, res, function (user) {
            methods[req.params.method].user_deactivate(user, req, res, next);
        });
    } else res.send({
        "code": "Error",
        "message": properties.getMessage('error', 'method_not_found')
    });
};

/**
 * Certaine méthode (push) peuvent être désactiver sans passer par le manager
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.desync = function (req, res, next) {
    logger.info(utils.getFileName(__filename) + ' ' + req.params.uid + " desync " + req.params.method);
    if (methods[req.params.method]) {
        apiDb.find_user(req, res, function (user) {
            methods[req.params.method].user_desync(user, req, res, next);
        });
    } else res.send({
        "code": "Error",
        "message": properties.getMessage('error', 'method_not_found')
    });
};

/**
 * Get all UserPreferences, list of uid
 */
exports.get_uids = function (req, res, next) {
    apiDb.get_uids(req, res, next);
};

/**
 * Drop Users
 */
exports.drop = function (req, res, next) {
    apiDb.drop(req, res, next);
};