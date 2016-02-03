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
