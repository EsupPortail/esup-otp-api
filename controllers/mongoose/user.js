var properties = require(process.cwd() + '/properties/properties');
var restify = require('restify');
var speakeasy = require('speakeasy');
var mailer = require(process.cwd() + '/services/mailer');
var sms = require(process.cwd() + '/services/sms');
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
        transport: String,
        otp: String,
        google_authenticator: {
            secret: Object
        },
    });

    mongoose.model('User', UserSchema, 'User');
    UserModel = mongoose.model('User');
}

/**
 * Ajoute une personne et retourne la personne ajoutee.
 *
 * @param req requete HTTP contenant le nom et prenom de la personne a creer
 * @param res reponse HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.create = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    // Create a new user model, fill it up and save it to Mongodb
    var user = new UserModel();
    user.uid = req.params.uid;
    user.google_authenticator.secret = speakeasy.generateSecret({ length: 16 });
    user.save(function() {
        res.send(req.body);
    });
}

/**
 * Retourne un tableau contenant l'ensemble des personnes dont le nom
 * correspond au nom specifie. Si aucun nom est donne alors toutes les
 * personnes sont retournees.
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res reponse HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.get = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    if (req.params.uid == '') {
        UserModel.find({}).exec(function(arr, data) {
            res.send(data);
        });
    } else {
        UserModel.find({
            'uid': req.params.uid
        }).exec(function(err, data) {
            res.send(data);
        });
    }
};

//mail a changer
exports.send_google_authenticator_mail = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    UserModel.find({
        'uid': req.params.uid
    }).exec(function(err, data) {
        if (data[0]) {
            data[0].transport = "mail";
            data[0].save(function() {
                userDb_controller.send_mail(req.params.uid, function(mail) {
                    mailer.send_code(mail, speakeasy.totp({
                        secret: data[0].google_authenticator.secret.base32,
                        encoding: 'base32'
                    }), res);
                });
            });
        } else {
            var user = new UserModel();
            user.uid = req.params.uid;
            user.google_authenticator.secret = speakeasy.generateSecret({ length: 16 });
            user.transport = "mail";
            user.save(function() {
                userDb_controller.send_mail(req.params.uid, function(mail) {
                    mailer.send_code(mail, speakeasy.totp({
                        secret: user.google_authenticator.secret.base32,
                        encoding: 'base32'
                    }), res);
                });
            });
        }
    });
};

//tel a changer
exports.send_google_authenticator_sms = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    UserModel.find({
        'uid': req.params.uid
    }).exec(function(err, data) {
        if (data[0]) {
            data[0].transport = "sms";
            data[0].save(function() {
                userDb_controller.send_sms(req.params.uid, function(num) {
                    sms.send_code(num, speakeasy.totp({
                        secret: data[0].google_authenticator.secret.base32,
                        encoding: 'base32'
                    }), res);
                });
            });
        } else {
            var user = new UserModel();
            user.uid = req.params.uid;
            user.google_authenticator.secret = speakeasy.generateSecret({ length: 16 });
            user.transport = "sms";
            user.save(function() {
                userDb_controller.send_sms(req.params.uid, function(num) {
                    sms.send_code(num, speakeasy.totp({
                        secret: user.google_authenticator.secret.base32,
                        encoding: 'base32'
                    }), res);
                });
            });
        }
    });
};

exports.send_google_authenticator_app = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    UserModel.find({
        'uid': req.params.uid
    }).exec(function(err, data) {
        if (data[0]) {
            data[0].transport = "app";
            data[0].save(function() {
                res.send('code generated');
            });
        } else {
            var user = new UserModel();
            user.uid = req.params.uid;
            user.google_authenticator.secret = speakeasy.generateSecret({ length: 16 });
            user.transport = "app";
            user.save(function() {
                res.send('code generated');
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
 * Retourne la réponse de la base de donnée suite à l'association d'un otp à l'utilisateur.
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res reponse HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.otp = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    UserModel.update({
        'uid': req.params.uid
    }, {
        $set: {
            otp: req.params.otp
        }
    }, function(err, raw) {
        if (err) return handleError(err);
        res.send(raw);
    })

};

/**
 * Vérifie si l'otp fourni correspond à celui stocké en base de données
 * si oui: on retourne un réponse positive et on supprime l'otp de la base de donnée
 * sinon: on renvoie une erreur 401 InvalidCredentialsError
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res reponse HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.verify = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    UserModel.find({
        'uid': req.params.uid
    }).exec(function(err, data) {
        if (data[0].otp == req.params.otp) {
            UserModel.update({
                'uid': req.params.uid
            }, {
                $set: {
                    otp: ''
                }
            }, function(err, data) {
                if (err) return handleError(err);
                res.send({
                    "code": "Ok",
                    "message": "Valid credentials"
                });
            })
        } else {
            next(new restify.InvalidCredentialsError());
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
exports.verify_google_authenticator = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    var checkSpeakeasy = false;
    UserModel.find({
        'uid': req.params.uid
    }).exec(function(err, data) {
        var transport_window = 0;
        switch (data[0].transport) {
            case 'sms':
                transport_window = properties.esup.google_authenticator.sms_window;
                break;
            case 'mail':
                transport_window = properties.esup.google_authenticator.mail_window;
                break;
            case 'app':
                transport_window = properties.esup.google_authenticator.app_window;
                break;
            default:
                transport_window = properties.esup.google_authenticator.app_window;
                break;
        }
        checkSpeakeasy = speakeasy.totp.verify({
            secret: data[0].google_authenticator.secret.base32,
            encoding: 'base32',
            token: req.params.otp,
            window: transport_window
        });
        if (checkSpeakeasy) {
            res.send({
                "code": "Ok",
                "message": "Valid credentials"
            });
        } else {
            next(new restify.InvalidCredentialsError());
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
exports.get_google_secret = function(req, res, next) {
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
        } else next(new restify.NotFoundError());
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
