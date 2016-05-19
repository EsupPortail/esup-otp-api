var properties = require(__dirname + '/../properties/properties');
var utils = require(__dirname + '/../services/utils');
var request = require('request');

var proxyUrl = properties.getEsupProperty('proxyUrl') || '';

exports.send_message = function(num, opts, res) {
    if (utils.check_transport_validity('sms', num)) {
        var tel = num;
        var url = urlBroker(tel, opts.message);
        var opts = {
            url: url
        };
        if (proxyUrl != '') opts.proxy = proxyUrl;
        request(opts, function(error, response, body) {
            if (error) console.log(error);
            if (!error && response.statusCode == 200) {
                console.log("Message will be sent to " + tel + ", with the message: " + opts.message);
                res.send({
                    "code": "Ok",
                    "message": body
                });
            } else res.send({
                "code": "Error",
                "message": error
            });
        });
    } else res.send({
        "code": "Error",
        "message": properties.getMessage('error','invalid_sms')
    });
}

function urlBroker(num, message) {
    var url = properties.getEsupProperty('sms').url.split("$");
    url[url.indexOf('phoneNumber')] = num;
    url[url.indexOf('message')] = message;
    return url.join("");
}