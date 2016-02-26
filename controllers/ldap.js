var ldap;

exports.initialize = function(bind, callback) {
    ldap = bind;
    if (typeof(callback) === "function") callback();
}


exports.searchJohn = function() {
    ldap.search({
        attrs: 'uid mobile mail',
        filter: 'uid=john'

    }, function(err, data) {
        if (err)
            console.log("search error: " + err);
        // console.log(JSON.stringify(data, null, 2));
        console.log("uid: " + data[0].uid);
        console.log("mobile: " + data[0].mobile);
        console.log("mail: " + data[0].mail);
        ldap.close();
    });
}
