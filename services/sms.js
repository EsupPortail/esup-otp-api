var properties = require(process.cwd() + '/properties/properties');
var request = require('request');

var proxyUrl = properties.esup.proxyUrl || '';

exports.send_message = function(num, message, res) {
    var tel = num;
    var url = urlBroker(tel, message);
    var opts = {
        url: url
    };
    if (proxyUrl != '') opts.proxy = proxyUrl;
    request(opts, function(error, response, body) {
        if(error)console.log(error);
        if (!error && response.statusCode == 200) {
            console.log("Message will be sent to " + tel + ", with the message: " + message);
            res.send({
                "code": "Ok",
                "message": body
            });
        } else res.send({
            "code": "Error",
            "message": error
        });
    });
}




function urlBroker(num, message) {
    var url = properties.esup.sms.url.split("$");
    url[url.indexOf('phoneNumber')] = num;
    url[url.indexOf('message')] = message;
    return url.join("");
}
