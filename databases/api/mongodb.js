var properties = require(process.cwd() + '/properties/properties');
var methods;
var restify = require('restify');
var mailer = require(process.cwd() + '/services/mailer');
var sms = require(process.cwd() + '/services/sms');
var userDb_controller = require(process.cwd() + '/databases/user/' + properties.esup.userDb);
var mongoose = require('mongoose');
var connection;

exports.initialize = function(callback) {
    connection = mongoose.createConnection('mongodb://' + properties.esup.mongodb.address + '/' + properties.esup.mongodb.db, function(error) {
        if (error) {
            console.log(error);
        } else {
            initiatilize_user_model();
            methods = require(process.cwd() + '/methods/methods');
            if (typeof(callback) === "function") callback();
        }
    });
}

/** User Model **/
var UserModel;

function initiatilize_user_model() {
    var Schema = mongoose.Schema;

    var UserSchema = new Schema({
        uid: {
            type: String,
            required: true,
            unique: true
        },
        random_code: {
            code: String,
            validity_time: Number,
            active: {
                type: Boolean,
                default: false
            },
            transports: {
                type: Array,
                default: properties.esup.methods.random_code.transports
            }
        },
        bypass: {
            codes: {
                type: Array,
                default: []
            },
            used_codes: { type: Number, default: 0 },
            active: {
                type: Boolean,
                default: false
            },
            transports: {
                type: Array,
                default: properties.esup.methods.bypass.transports
            }
        },
        totp: {
            secret: {
                type: Object,
                default: {}
            },
            window: Number,
            active: {
                type: Boolean,
                default: false
            },
            transports: {
                type: Array,
                default: properties.esup.methods.totp.transports
            }
        },
    });

    connection.model('UserPreferences', UserSchema, 'UserPreferences');
    UserModel = connection.model('UserPreferences');
}

/**
 * Retourne l'utilisateur mongo
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
function find_user(req, res, callback) {
    var response = {
        "code": "Error",
        "message": properties.messages.error.user_not_found
    };
    UserModel.find({
        'uid': req.params.uid
    }).exec(function(err, data) {
        if (data[0]) {
            if (typeof(callback) === "function") callback(data[0]);
        } else {
            userDb_controller.user_exists(req, res, function(user) {
                if (user) {
                    var new_user = new UserModel({
                        uid: user.uid
                    });
                    new_user.save(function() {
                         if (typeof(callback) === "function") callback(new_user);
                    })
                }else res.send(response);
            });
        }
    });
}


function parse_user(user){
    var parsed_user = {};
    parsed_user.totp = {};
    parsed_user.totp.active = user.totp.active;
    parsed_user.totp.transports = user.totp.transports;
    parsed_user.random_code = {};
    parsed_user.random_code.active = user.random_code.active;
    parsed_user.random_code.transports = user.random_code.transports;
    parsed_user.bypass = {};
    parsed_user.bypass.active = user.bypass.active;
    parsed_user.bypass.available_code = user.bypass.codes.length;
    parsed_user.bypass.used_code = user.bypass.used_codes;
    parsed_user.bypass.transports = user.bypass.transports;
    parsed_user.matrix = user.matrix;
    // parsed_user.matrix.active = user.matrix.active;
    return parsed_user;
}

/**
 * Sauve l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.save_user=function(user, callback) {
    user.save(function() {
        if (typeof(callback) === "function") callback();
    })
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
    transport("Ceci est un message de test à destination de l'utilisateur "+req.params.uid,req ,res, next);
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
    find_user(req, res, function(user){
        var response = {};
        response.code = 'Ok';
        response.message = '';
        response.user = parse_user(user);
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
    if(properties.esup.auto_create_user)req.params.create_user=true;
    find_user(req, res, function(user) {
        userDb_controller.get_available_transports(req, res, function(data) {
            var response = {};
            response.code = 'Ok';
            response.message = '';
            response.user = {};
            response.user.methods = parse_user(user);
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
    if (properties.esup.methods[req.params.method]) {
        find_user(req, res, function(user) {
            if (user[req.params.method].active && properties.esup.methods[req.params.method].activate && methods[req.params.method]) {
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
    find_user(req, res, function(user) {
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
            if (user[method].active && properties.esup.methods[method].activate) {
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
    if (properties.esup.methods[req.params.method]) {
        find_user(req, res, function(user) {
            if (methods[req.params.method] && properties.esup.methods[req.params.method].activate) {
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
    if (properties.esup.methods[req.params.method]) {
        find_user(req, res, function(user) {
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
    if (properties.esup.methods[req.params.method]) {
        find_user(req, res, function(user) {
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
    find_user(req, res, function(user) {
        var response = {};
        var result = {};
        for (method in properties.esup.methods) {
            if (properties.esup.methods[method].activate) {
                if(!user[method].active)result[method] = user[method].active;
                else result[method] = properties.esup.methods[method];
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
        find_user(req, res, function(user) {
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
        find_user(req, res, function(user) {
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
    UserModel.remove({}, function(err, data) {
        if (err) console.log(err);
        console.log('users removed');
        res.send(data);
    });
};
