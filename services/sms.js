var properties = require(process.cwd() + '/properties/properties');
var request = require('request');

var proxyUrl = properties.esup.proxyUrl;

exports.send_code = function(num, message, res) {
    var tel = properties.esup.dev.sms || num;
    var url = urlBroker(tel, message);
    console.log(url);
    console.log("Message will be sent to " + tel + ", with the message: " + message);
    request({
        'url': url,
        'proxy': proxyUrl
    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
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
