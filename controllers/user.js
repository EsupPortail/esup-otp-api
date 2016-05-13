var properties = require(__dirname + '/../properties/properties');

var userDb;

exports.initialize= function(callback) {
    if (properties.esup.apiDb) {
        userDb = require(__dirname + '/../databases/user/' + properties.esup.userDb);
        userDb.initialize(callback);
        exports.userDb = userDb;
    } else console.log("Unknown apiDb");
}

exports.user_exists= function(req, res, callback){
    console.log("user_exists mongodb_user");
    userDb.find_user(req, res, function(user){
        if (typeof(callback) === "function") callback(user);
    })
}


exports.get_available_transports = function(req, res, callback) {
    console.log("get_available_transports");
    userDb.find_user(req, res, function(user) {
        var response = {};
        var result = {};
        if (user[properties.esup.mongodb.transport.mail]) result.mail = utils.cover_string(user[properties.esup.mongodb.transport.mail], 4, 5);
        if (user[properties.esup.mongodb.transport.sms]) result.sms = utils.cover_string(user[properties.esup.mongodb.transport.sms], 2, 2);
        if (typeof(callback) === "function") callback(result);
        else {
            console.log()
            response.code = "Ok";
            response.message = properties.messages.success.transports_found;
            response.transports_list = result;
            res.send(response);
        }
    });
}



exports.send_sms = function(req, res, callback) {
    userDb.find_user(req, res, function(user) {
        if (typeof(callback) === "function") callback(user[properties.esup.mongodb.transport.sms]);
    });
}


exports.send_mail = function(req, res, callback) {
    userDb.find_user(req, res, function(user) {
        if (typeof(callback) === "function") callback(user[properties.esup.mongodb.transport.mail]);
    });
}

exports.update_transport = function(req, res, next) {
    userDb.find_user(req, res, function(user) {
        user[properties.esup.mongodb.transport[req.params.transport]]=req.params.new_transport;
        userDb.save_user(user, function(){
            res.send({
                code: 'Ok',
                message: properties.messages.success.update
            });
        });
    });
}

exports.delete_transport = function(req, res, next) {
    userDb.find_user(req, res, function(user) {
        user[properties.esup.mongodb.transport[req.params.transport]]="";
        userDb.save_user(user, function(){
            res.send({
                code: 'Ok',
                message: properties.messages.success.update
            });
        });
    });
}

exports.delete_transport = function(req, res, next) {
    userDb.delete_transport(req, res, next);
}

/**
 * Supprime l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.remove_user=function(uid, callback) {
    userDb.remove_user(uid, callback);
}

/**
 * Crée l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.create_user=function(uid, callback) {
    userDb.create_user(uid, callback);
}

/**
 * Sauve l'utilisateur
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 * @param next permet d'appeler le prochain gestionnaire (handler)
 */
exports.save_user=function(user, callback) {
    userDb.save_user(user, callback);
}