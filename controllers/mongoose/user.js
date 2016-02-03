var UserModel;

exports.initiate = function(mongoose) {
    var Schema = mongoose.Schema;

    var UserSchema = new Schema({
        firstname: String,
        lastname: String,
        password: String
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
    if (req.params.lastname == '') {
        UserModel.find({}).exec(function(arr, data) {
            res.send(data);
        });
    } else {
        UserModel.find({
            'lastname': req.params.lastname
        }).exec(function(arr, data) {
            res.send(data);
        });
    }
};