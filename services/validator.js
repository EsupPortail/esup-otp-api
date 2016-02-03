var restify = require('restify');

function check_post_parameters(req) {
    if (req.params.firstname == undefined || req.params.lastname == undefined || req.params.password == undefined) {
        return false
    } else {
        return true;
    }
}

exports.create_user = function(req, res, next) {
    if (check_post_parameters(req)) {
        return next();
    } else {
        return next(new restify.InvalidArgumentError());
    }
}