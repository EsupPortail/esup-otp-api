var properties = require(process.cwd() + '/properties/properties');
var methods;
var restify = require('restify');
var mailer = require(process.cwd() + '/services/mailer');
var sms = require(process.cwd() + '/services/sms');
var userDb_controller = require(process.cwd() + '/controllers/user/' + properties.esup.userDb);
var mongoose = require('mongoose');
var connection;

exports.initialize = function(callback) {
    connection = mongoose.createConnection('mongodb://' + properties.esup.mongodb.address + '/' + properties.esup.mongodb.api_db, function(error) {
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
        simple_generator: {
            code: String,
            validity_time: Number,
            active: {
                type: Boolean,
                default: false
            },
            transport: {
                sms: {
                    type: Boolean,
                    default: false
                },
                mail: {
                    type: Boolean,
                    default: false
                },
            }
        },
        bypass: {
            codes: Array,
            used_codes: { type: Number, default: 0 },
            active: {
                type: Boolean,
                default: false
            },
            transport: {
                sms: {
                    type: Boolean,
                    default: false
                },
                mail: {
                    type: Boolean,
                    default: false
                },
            }
        },
        google_authenticator: {
            secret: Object,
            window: Number,
            active: {
                type: Boolean,
                default: false
            },
            transport: {
                sms: {
                    type: Boolean,
                    default: false
                },
                mail: {
                    type: Boolean,
                    default: false
                },
            }
        },
    });

    connection.model('User', UserSchema, 'User');
    UserModel = connection.model('User');
}

function create_user(){

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
            res.send(response);
        }
    });
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
    switch (req.params.transport) {
        case 'mail':
            userDb_controller.send_mail(req, res, function(mail) {
                mailer.send_code(mail,code, res);
            });
            break;
        case 'sms':
            userDb_controller.send_sms(req, res, function(num) {
                sms.send_code(num, code, res);
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
        response.user = {};
        response.user.google_authenticator = {};
        response.user.google_authenticator.active = user.google_authenticator.active;
        response.user.simple_generator = {};
        response.user.simple_generator.active = user.simple_generator.active;
        response.user.bypass = {};
        response.user.bypass.active = user.bypass.active;
        response.user.bypass.available_code = user.bypass.codes.length;
        response.user.bypass.used_code = user.bypass.used_codes;
        response.user.matrix = user.matrix;
        // response.user.matrix.active = user.matrix.active;
        res.send(response);
    });
};

/**
 * Envoie un code à l'utilisateur avec l'uid == req.params.uid et via la method == req.params.method
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.send_code = function(req, res, next) {
    console.log("send_code :" + req.params.uid);
    if (properties.esup.methods[req.params.method]) {
        find_user(req, res, function(user) {
            if (user[req.params.method].active && properties.esup.methods[req.params.method].activate && methods[req.params.method]) {
                methods[req.params.method].send_code(user, req, res, next);
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
    console.log("exports.get_activate_methods = function(req, res, next) {");
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
