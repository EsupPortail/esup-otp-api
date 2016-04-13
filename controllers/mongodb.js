var properties = require(process.cwd() + '/properties/properties');
var restify = require('restify');
var speakeasy = require('speakeasy');
var mailer = require(process.cwd() + '/services/mailer');
var sms = require(process.cwd() + '/services/sms');
var simple_generator = require(process.cwd() + '/services/simple-generator');
var qrCode = require('qrcode-npm')
var userDb_controller = require(process.cwd() + '/controllers/' + properties.esup.userDb);
var mongoose = require('mongoose');

exports.initialize = function(callback) {
    mongoose.connect('mongodb://' + properties.esup.mongodb.address + '/' + properties.esup.mongodb.db, function(error) {
        if (error) {
            console.log(error);
        } else {
            initiatilize_user_model();
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

    mongoose.model('User', UserSchema, 'User');
    UserModel = mongoose.model('User');
}

function find_user(criteria, res, callback) {
    var response = {
        "code": "Error",
        "message": properties.messages.error.user_not_found
    };
    UserModel.find(criteria).exec(function(err, data) {
        if (data[0]) {
            if (typeof(callback) === "function") callback(data[0]);
        } else {
            res.send(response);
        }
    });
}


/**
 * Renvoie l'utilisateur avec l'uid == req.params.uid
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.get_user = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    
    find_user({
        'uid': req.params.uid
    }, res, function(user){
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
        response.user.bypass.used_code = properties.esup.methods.bypass.codes_number - user.bypass.codes.length;
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
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    switch (req.params.method) {
        case 'google_authenticator':
            send_code_google_authenticator(req, res, next);
            break;
        case 'simple_generator':
            send_code_simple_generator(req, res, next);
            break;
        case 'bypass':
            res.send({
                "code": "Error",
                "message": properties.messages.error.unvailable_method_operation
            });
            break;
        default:
            res.send({
                "code": "Error",
                "message": properties.messages.error.method_not_found
            });
            break;
    }
};

/**
 * Envoie le code via le transport == req.params.transport
 * Retourne la réponse du service mail
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
function send_code_google_authenticator(req, res, next) {
    console.log("send_google_authenticator :" + req.params.uid);
    find_user({
        'uid': req.params.uid
    }, res, function(user) {
        if (user.google_authenticator.active && properties.esup.methods.google_authenticator.activate) {
            user.google_authenticator.window = properties.esup.methods.google_authenticator.mail_window;
            user.save(function() {
                switch (req.params.transport) {
                    case 'mail':
                        userDb_controller.send_mail(req, res, function(mail) {
                            mailer.send_code(mail, speakeasy.totp({
                                secret: user.google_authenticator.secret.base32,
                                encoding: 'base32'
                            }), res);
                        });
                        break;
                    case 'sms':
                        userDb_controller.send_sms(req, res, function(num) {
                            sms.send_code(num, speakeasy.totp({
                                secret: user.google_authenticator.secret.base32,
                                encoding: 'base32'
                            }), res);
                        });
                        break;
                    default:
                        res.send({
                            code: 'Error',
                            message: properties.messages.error.unvailable_method_transport
                        });
                        break;
                }
            });
        } else {
            res.send({
                code: 'Error',
                message: properties.messages.error.method_not_found
            });
        }
    });
};

/**
 * Envoie le code via le transport == req.params.transport
 * Retourne la réponse du service mail
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
function send_code_simple_generator(req, res, next) {
    console.log("send_code_simple_generator :" + req.params.uid);
    find_user({
        'uid': req.params.uid
    }, res, function(user) {
        if (user.simple_generator.active && properties.esup.methods.simple_generator.activate) {
            var new_otp = {};
            switch (properties.esup.methods.simple_generator.code_type) {
                case "string":
                    new_otp.code = simple_generator.generate_string_code(properties.esup.methods.simple_generator.code_length);
                    break;
                case "digit":
                    new_otp.code = simple_generator.generate_digit_code(properties.esup.methods.simple_generator.code_length);
                    break;
                default:
                    new_otp.code = simple_generator.generate_string_code(properties.esup.methods.simple_generator.code_length);
                    break;
            }
            validity_time = properties.esup.methods.simple_generator.mail_validity * 60 * 1000;
            validity_time += new Date().getTime();
            new_otp.validity_time = validity_time;
            user.simple_generator = new_otp;
            user.save(function() {
                switch (req.params.transport) {
                    case 'mail':
                        userDb_controller.send_mail(req, res, function(mail) {
                            mailer.send_code(mail, new_otp.code, res);
                        });
                        break;
                    case 'sms':
                        userDb_controller.send_sms(req, res, function(num) {
                            sms.send_code(num, new_otp.code, res);
                        });
                        break;
                    default:
                        res.send({
                            code: 'Error',
                            message: properties.messages.error.unvailable_method_transport
                        });
                        break;
                }
            });
        } else {
            res.send({
                code: 'Error',
                message: properties.messages.error.methods_not_found
            });
        }
    });
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
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    find_user({
        'uid': req.params.uid
    }, res, function(user) {
        verify_simple_generator(req, res, function(req, res) {
            verify_google_authenticator(req, res, function() {
                verify_bypass(req, res, function() {
                    res.send({
                        "code": "Error",
                        "message": properties.messages.error.invalid_credentials
                    });
                });
            });
        });
    });
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
function verify_simple_generator(req, res, next) {
    find_user({
        'uid': req.params.uid
    }, res, function(user) {
        if (user.simple_generator.active && properties.esup.methods.simple_generator.activate) {
            if (user.simple_generator.code == req.params.otp) {
                if (Date.now() < user.simple_generator.validity_time) {
                    delete user.simple_generator.code;
                    delete user.simple_generator.validity_time;
                    user.save(function(){
                        res.send({
                            "code": "Ok",
                            "message": properties.messages.success.valid_credentials
                        });
                    });
                } else {
                    next(req, res);
                }
            } else {
                next(req, res);
            }
        } else {
            next(req, res);
        }
    });
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
function verify_bypass(req, res, next) {
    find_user({
        'uid': req.params.uid
    }, res, function(user) {
        if (user.bypass.active && properties.esup.methods.bypass.activate) {
            if (user.bypass.codes) {
                var checkOtp = false;
                var codes = user.bypass.codes;
                for (code in codes) {
                    if (user.bypass.codes[code] == req.params.otp) {
                        checkOtp = true;
                        codes.splice(code, 1);
                        user.bypass.codes = codes;
                    }
                }
                if (checkOtp) {
                    user.save(function(){
                        res.send({
                            "code": "Ok",
                            "message": properties.messages.success.valid_credentials
                        });
                    });
                } else {
                    next(req, res);
                }
            } else {
                next(req, res);
            }
        } else {
            next(req, res);
        }
    });
};



/**
 * Vérifie si l'otp fourni correspond à celui généré
 * si oui: on retourne un réponse positive
 * sinon: on renvoie une erreur 401 InvalidCredentialsError
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
function verify_google_authenticator(req, res, next) {
    var checkSpeakeasy = false;

    find_user({
        'uid': req.params.uid
    }, res, function(user) {
        if (user.google_authenticator.active && properties.esup.methods.google_authenticator.activate) {
            var transport_window = 0;
            checkSpeakeasy = speakeasy.totp.verify({
                secret: user.google_authenticator.secret.base32,
                encoding: 'base32',
                token: req.params.otp,
                window: user.google_authenticator.window
            });
            if (checkSpeakeasy) {
                user.google_authenticator.window = properties.esup.methods.google_authenticator.default_window;
                user.save(function() {
                    res.send({
                        "code": "Ok",
                        "message": properties.messages.success.valid_credentials
                    });
                });
            } else {
                next(req, res);
            }
        } else {
            next(req, res);
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
exports.generate = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    switch (req.params.method) {
        case 'google_authenticator':
            generate_google_authenticator(req, res, next);
            break;
        case 'simple_generator':
            res.send({
                "code": "Error",
                "message": properties.messages.error.unvailable_method_operation
            });
            break;
        case 'bypass':
            generate_bypass(req, res, next);
            break;
        default:
            res.send({
                "code": "Error",
                "message": properties.messages.error.method_not_found
            });
            break;
    }
};

/**
 * Retourne la réponse de la base de donnée suite à l'association d'un nouveau secret à l'utilisateur.
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
function generate_google_authenticator(req, res, next) {
    if (properties.esup.methods.google_authenticator.activate) {
        find_user({
            'uid': req.params.uid
        }, res, function(user) {
            user.google_authenticator.secret = speakeasy.generateSecret({ length: 16 });
            user.save(function() {
                var response = {};
                var qr = qrCode.qrcode(4, 'M');
                qr.addData(user.google_authenticator.secret.otpauth_url);
                qr.make();
                response.code = 'Ok';
                response.message = user.google_authenticator.secret.base32;
                response.qrCode = qr.createImgTag(4);
                res.send(response);
            });
        });
    } else res.send({
        code: 'Error',
        message: properties.messages.error.method_not_found
    });
};


/**
 * Retourne la réponse de la base de donnée suite à la génération de nouveau bypass codes
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
function generate_bypass(req, res, next) {
    if (properties.esup.methods.bypass.activate) {
        find_user({
            'uid': req.params.uid
        }, res, function(user) {
            var codes = new Array();
            for (var it = 0; it < properties.esup.methods.bypass.codes_number; it++) {
                switch (properties.esup.methods.simple_generator.code_type) {
                    case "string":
                        codes.push(simple_generator.generate_string_code(properties.esup.methods.bypass.code_length));
                        break;
                    case "digit":
                        codes.push(simple_generator.generate_digit_code(properties.esup.methods.bypass.code_length));
                        break;
                    default:
                        codes.push(simple_generator.generate_string_code(properties.esup.methods.bypass.code_length));
                        break;
                }
            }
            user.bypass.codes = codes;
            user.save(function() {
                res.send({
                    code: "Ok",
                    message: "",
                    codes : codes

                });
            });
        });
    } else res.send({
        code: 'Error',
        message: properties.messages.error.method_not_found
    });
};

/**
 * Supprime l'attribut d'auth (secret key ou matrice ou bypass codes)
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.delete_method_secret = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    switch (req.params.method) {
        case 'google_authenticator':
            delete_google_authenticator_secret(req, res, next);
            break;
        case 'simple_generator':
            res.send({
                "code": "Error",
                "message": properties.messages.error.unvailable_method_operation
            });
            break;
        case 'bypass':
            delete_bypass_codes(req, res, next);
            break;
        default:
            res.send({
                "code": "Error",
                "message": properties.messages.error.method_not_found
            });
            break;
    }
};

/**
 * Supprime le secret de l'utilisateur et désactive la méthode
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
function delete_google_authenticator_secret(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    find_user({
        'uid': req.params.uid
    }, res, function(user) {
        user.google_authenticator.secret={};
        user.save(function() {
            console.log("delete google auth secret "+user.uid);
            res.send({
                "code": "Ok",
                "message": 'Secret removed'
            });
        });
    });
};

/**
 * Supprime le secret de l'utilisateur et désactive la méthode
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
function delete_bypass_codes(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    find_user({
        'uid': req.params.uid
    }, res, function(user) {
        user.bypass.codes = [];
        user.save(function() {
            console.log("delete bypass codes "+user.uid);
            res.send({
                "code": "Ok",
                "message": 'Codes removed'
            });
        });
    });
};

/**
 * Renvoie le secret de l'utilisateur afin qu'il puisse l'entrer dans son appli smartphone
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.get_google_authenticator_secret = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    find_user({
        'uid': req.params.uid
    }, res, function(user) {
        var response = {};
        var qr = qrCode.qrcode(4, 'M');
        qr.addData(user.google_authenticator.secret.otpauth_url);
        qr.make();
        response.code = 'Ok';
        response.message = user.google_authenticator.secret.base32;
        response.qrCode = qr.createImgTag(4);

        res.send(response);
    });
};


/**
 * Renvoie les méthodes activées de l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.get_activate_methods = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    find_user({
        'uid': req.params.uid
    }, res, function(user) {
        var response = {};
        var result = {};
        for (method in properties.esup.methods) {
            if (properties.esup.methods[method].activate && user[method].active) result[method] = properties.esup.methods[method];
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
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    console.log(req.params.uid + " activate_method " + req.params.method);
    switch (req.params.method) {
        case 'google_authenticator':
            activate_google_authenticator(req, res, next);
            break;
        case 'simple_generator':
            activate_simple_generator(req, res, next);
            break;
        case 'bypass':
            activate_bypass(req, res, next);
            break;
        default:
            res.send({
                "code": "Error",
                "message": properties.messages.error.method_not_found
            });
            break;
    }
};

/**
 * Active la méthode google auth pour l'utilisateur ayant l'uid req.params.uid
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
function activate_google_authenticator(req, res, next) {
    find_user({
        'uid': req.params.uid
    }, res, function(user) {
        user.google_authenticator.active = true;
        user.save(function() {
            res.send({
                "code": "Ok",
                "message": ""
            });
        });
    });
};


/**
 * Active la méthode simple_generator pour l'utilisateur ayant l'uid req.params.uid
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
function activate_simple_generator(req, res, next) {
    find_user({
        'uid': req.params.uid
    }, res, function(user) {
        user.simple_generator.active = true;
        user.save(function() {
            res.send({
                "code": "Ok",
                "message": ""
            });
        });
    });
};

/**
 * Active la méthode bypass pour l'utilisateur ayant l'uid req.params.uid
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
function activate_bypass(req, res, next) {
       find_user({
        'uid': req.params.uid
    }, res, function(user) {
        user.bypass.active = true;
        user.save(function() {
            res.send({
                "code": "Ok",
                "message": ""
            });
        });
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
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    console.log(req.params.uid + " deactivate_method " + req.params.method);
    switch (req.params.method) {
        case 'google_authenticator':
            deactivate_google_authenticator(req, res, next);
            break;
        case 'simple_generator':
            deactivate_simple_generator(req, res, next);
            break;
        case 'bypass':
            deactivate_bypass(req, res, next);
            break;
        default:
            res.send({
                "code": "Error",
                "message": properties.messages.error.method_not_found
            });
            break;
    }
};

/**
 * Désactive la méthode google auth pour l'utilisateur ayant l'uid req.params.uid
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
function deactivate_google_authenticator(req, res, next) {
    find_user({
        'uid': req.params.uid
    }, res, function(user) {
        user.google_authenticator.active = false;
        user.save(function() {
            res.send({
                "code": "Ok",
                "message": ""
            });
        });
    });
};


/**
 * Désactive la méthode simple_generator pour l'utilisateur ayant l'uid req.params.uid
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
function deactivate_simple_generator(req, res, next) {
    find_user({
        'uid': req.params.uid
    }, res, function(user) {
        user.google_authenticator.active = false;
        user.save(function() {
            res.send({
                "code": "Ok",
                "message": ""
            });
        });
    });
};


/**
 * Désactive la méthode bypass pour l'utilisateur ayant l'uid req.params.uid
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
function deactivate_bypass(req, res, next) {
    find_user({
        'uid': req.params.uid
    }, res, function(user) {
        user.google_authenticator.active = false;
        user.save(function() {
            res.send({
                "code": "Ok",
                "message": ""
            });
        });
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
