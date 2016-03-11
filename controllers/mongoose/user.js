var properties = require(process.cwd() + '/properties/properties');
var restify = require('restify');
var speakeasy = require('speakeasy');
var mailer = require(process.cwd() + '/services/mailer');
var sms = require(process.cwd() + '/services/sms');
var simple_generator = require(process.cwd() + '/services/simple-generator');
var qrCode = require('qrcode-npm')
var userDb_controller = require(process.cwd() + '/controllers/' + properties.esup.userDb);


var UserModel;

exports.initiate = function(mongoose) {
    var Schema = mongoose.Schema;

    var UserSchema = new Schema({
        uid: {
            type: String,
            required: true,
            unique: true
        },
        simple_generator: {
            code: String,
            date_generation: Date,
            validity_time: Number
        },
        google_authenticator: {
            secret: Object,
            window : Number
        },
    });

    mongoose.model('User', UserSchema, 'User');
    UserModel = mongoose.model('User');
}

/**
 * Associe "mail" au transport de l'utilisateur et un code google authenaticator
 * Retourne la réponse du service mail
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res reponse HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.send_google_authenticator_mail = function(req, res, next) {
    console.log("send_google_authenticator_mail :"+ req.params.uid);
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    UserModel.find({
        'uid': req.params.uid
    }).exec(function(err, data) {
        if (data[0]) {
            data[0].google_authenticator.window = properties.esup.methods.google_authenticator.mail_window;
            data[0].save(function() {
                userDb_controller.send_mail(req.params.uid, function(mail) {
                    mailer.send_code(mail, speakeasy.totp({
                        secret: data[0].google_authenticator.secret.base32,
                        encoding: 'base32'
                    }), res);
                }, res);
            });
        } else {
            var user = new UserModel();
            user.uid = req.params.uid;
            user.google_authenticator.secret = speakeasy.generateSecret({ length: 16 });
            user.google_authenticator.window = properties.esup.methods.google_authenticator.mail_window;
            user.save(function() {
                userDb_controller.send_mail(req.params.uid, function(mail) {
                    mailer.send_code(mail, speakeasy.totp({
                        secret: user.google_authenticator.secret.base32,
                        encoding: 'base32'
                    }), res);
                }, res);
            });
        }
    });
};

/**
 * Associe "sms" au transport de l'utilisateur et un code google authenaticator
 * Retourne la réponse du service sms
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res reponse HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.send_google_authenticator_sms = function(req, res, next) {
    console.log("send_google_authenticator_sms :"+ req.params.uid);
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    UserModel.find({
        'uid': req.params.uid
    }).exec(function(err, data) {
        if (data[0]) {
            data[0].google_authenticator.window = properties.esup.methods.google_authenticator.sms_window;
            data[0].save(function() {
                userDb_controller.send_sms(req.params.uid, function(num) {
                    sms.send_code(num, speakeasy.totp({
                        secret: data[0].google_authenticator.secret.base32,
                        encoding: 'base32'
                    }), res);
                }, res);
            });
        } else {
            var user = new UserModel();
            user.uid = req.params.uid;
            user.google_authenticator.secret = speakeasy.generateSecret({ length: 16 });
            user.google_authenticator.window = properties.esup.methods.google_authenticator.sms_window;
            user.save(function() {
                userDb_controller.send_sms(req.params.uid, function(num) {
                    sms.send_code(num, speakeasy.totp({
                        secret: user.google_authenticator.secret.base32,
                        encoding: 'base32'
                    }), res);
                }, res);
            });
        }
    });
};

/**
 * Retourne la réponse de la base de donnée suite à l'association d'un nouveau secret à l'utilisateur.
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res reponse HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.regenerate_secret = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    UserModel.update({
        'uid': req.params.uid
    }, {
        $set: {
            google_authenticator: {
                secret: speakeasy.generateSecret({ length: 16 })
            }
        }
    }, function(err, raw) {
        if (err) return handleError(err);
        res.send(raw);
    })
};

/**
 * Associe "mail" au transport de l'utilisateur et un code simple generator
 * Retourne la réponse du service mail
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res reponse HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.send_simple_generator_mail = function(req, res, next) {
    console.log("send_simple_generator_mail :"+ req.params.uid);

    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    UserModel.find({
        'uid': req.params.uid
    }).exec(function(err, data) {
        var new_otp = {};
        switch(properties.esup.methods.simple_generator.code_type){
            case "string":
            new_otp.code = simple_generator.generate_string_code();
            break;
            case "digit":
            new_otp.code = simple_generator.generate_digit_code();
            break;
            default:
            new_otp.code = simple_generator.generate_string_code();
            break;
        }
        validity_time = properties.esup.methods.simple_generator.mail_validity * 60 * 1000;
        validity_time += new Date().getTime();
        new_otp.validity_time = validity_time;
        if (data[0]) {
            data[0].simple_generator = new_otp;
            data[0].save(function() {
                userDb_controller.send_mail(req.params.uid, function(mail) {
                    mailer.send_code(mail, new_otp.code, res);
                }, res);
            });
        } else {
            var user = new UserModel();
            user.uid = req.params.uid;
            user.simple_generator = new_otp;
            user.save(function() {
                userDb_controller.send_mail(req.params.uid, function(mail) {
                    mailer.send_code(mail, new_otp.code, res);
                }, res);
            });
        }
    });
};

/**
 * Associe "sms" au transport de l'utilisateur et un code simple generator
 * Retourne la réponse du service sms
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res reponse HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.send_simple_generator_sms = function(req, res, next) {
    console.log("send_simple_generator_sms :"+ req.params.uid);

    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    UserModel.find({
        'uid': req.params.uid
    }).exec(function(err, data) {
        var new_otp = {};
        switch(properties.esup.methods.simple_generator.code_type){
            case "string":
            new_otp.code = simple_generator.generate_string_code();
            break;
            case "digit":
            new_otp.code = simple_generator.generate_digit_code();
            break;
            default:
            new_otp.code = simple_generator.generate_string_code();
            break;
        }
        validity_time = properties.esup.methods.simple_generator.sms_validity * 60 * 1000;
        validity_time += new Date().getTime();
        new_otp.validity_time = validity_time;
        if (data[0]) {
            data[0].simple_generator = new_otp;
            data[0].save(function() {
                userDb_controller.send_sms(req.params.uid, function(num) {
                    sms.send_code(num, new_otp.code, res);
                }, res);
            });
        } else {
            var user = new UserModel();
            user.uid = req.params.uid;
            user.simple_generator = new_otp;
            user.save(function() {
                userDb_controller.send_sms(req.params.uid, function(num) {
                    sms.send_code(num, new_otp.code, res);
                }, res);
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
 * @param res reponse HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.verify_code = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    UserModel.find({
        'uid': req.params.uid
    }).exec(function(err, data) {
        verify_simple_generator(req, res, function(req, res){
            verify_google_authenticator(req, res, function(){
                res.send({
                    "code": "Error",
                    "message": "Invalid credentials"
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
 * @param res reponse HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
function verify_simple_generator(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    UserModel.find({
        'uid': req.params.uid
    }).exec(function(err, data) {
        if (data[0].simple_generator.code == req.params.otp) {
            if (Date.now() < data[0].simple_generator.validity_time) {
                UserModel.update({
                    'uid': req.params.uid
                }, {
                    $set: {
                        simple_generator: {}
                    }
                }, function(err, data) {
                    if (err) {
                        console.log(err)
                        next(req, res);
                    }
                    res.send({
                        "code": "Ok",
                        "message": "Valid credentials"
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
 * Vérifie si l'otp fourni correspond à celui généré
 * si oui: on retourne un réponse positive
 * sinon: on renvoie une erreur 401 InvalidCredentialsError
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res reponse HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
function verify_google_authenticator(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    var checkSpeakeasy = false;
    UserModel.find({
        'uid': req.params.uid
    }).exec(function(err, data) {
        if (err){
            console.log(err);
            next(req, res);
        }
        else if (data[0] == undefined) res.send({
            "code": "Error",
            "message": "User not found"
        });
        else {
            var transport_window = 0;
            checkSpeakeasy = speakeasy.totp.verify({
                secret: data[0].google_authenticator.secret.base32,
                encoding: 'base32',
                token: req.params.otp,
                window: data[0].google_authenticator.window
            });
            if (checkSpeakeasy) {
                data[0].google_authenticator.window = properties.esup.methods.google_authenticator.default_window;
                data[0].save(function() {
                    res.send({
                        "code": "Ok",
                        "message": "Valid credentials"
                    });
                });
            } else {
                next(req, res);
            }
        }
    });
};



/**
 * Renvoie le secret de l'utilisateur afin qu'il puisse l'entrer dans son appli smartphone
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res reponse HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.get_google_authenticator_secret = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    UserModel.find({
        'uid': req.params.uid
    }).exec(function(err, data) {
        if (data[0]) {
            var qr = qrCode.qrcode(4, 'M');
            qr.addData(data[0].google_authenticator.secret.otpauth_url);
            qr.make();
            mailer.sendQRCode(data[0].mail, data[0].google_authenticator.secret.base32, qr.createImgTag(4), res);
        } else res.send({
                "code": "Error",
                "message": "Resource not Found"
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
