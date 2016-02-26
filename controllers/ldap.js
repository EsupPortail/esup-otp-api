var properties = require(process.cwd() + '/properties/properties');
var ldap;

exports.initialize = function(bind, callback) {
    ldap = bind;
    if (typeof(callback) === "function") callback();
}


exports.get_available_transport = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    ldap.search({
        attrs: properties.esup.ldap.transport.mail+' '+properties.esup.ldap.transport.sms,
        filter: 'uid='+req.params.uid
    }, function(err, data) {
        if (err)console.log("search error: " + err);
        var result= {};
        if(data[0][properties.esup.ldap.transport.sms])result[properties.esup.ldap.transport.sms]=data[0][properties.esup.ldap.transport.sms][0];
        if(data[0][properties.esup.ldap.transport.mail])result[properties.esup.ldap.transport.mail]=data[0][properties.esup.ldap.transport.mail][0];
        res.send(result);
    });
}
