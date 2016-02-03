var restify = require('restify');
var UserModel;

exports.initiate = function(mongoose) {
    var Schema = mongoose.Schema;

    var UserSchema = new Schema({
        uid: String,
        firstname: String,
        lastname: String,
        password: String,
        otp: String,
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
    // Create a new message model, fill it up and save it to Mongodb
    var user = new UserModel();
    user.uid = req.params.uid;
    user.firstname = req.params.firstname;
    user.lastname = req.params.lastname;
    user.password = req.params.password;
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
 * Drop Users
 */
exports.drop = function(req, res, next) {
    UserModel.remove({}, function(err, data) {
        if (err) console.log(err);
        console.log('users removed');
        res.send(data);
    });
};
