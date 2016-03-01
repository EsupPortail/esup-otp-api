var httpRequest = require('http_request');
var properties = require(process.cwd() + '/properties/properties');

exports.send_code = function(num, message, res) {
    var tel = properties.esup.dev.sms || num;
    var url = urlBroker(tel,message);
    console.log("Message will be sent to " + tel + ", with the message: " + message);
    httpRequest.get(url, {
        auth: {
            username: properties.esup.sms.username,
            password: properties.esup.sms.password
        }
    }).then(function(response) {
        res.send(response.getBody());
    });
}

function urlBroker(num, message) {
    var url = properties.esup.sms.url.split("$");
    url[url.indexOf('phoneNumber')]=num;
    url[url.indexOf('message')]=message;
    var resUrl='';
    for(i in url){resUrl+=url[i];}
    return resUrl;
}
