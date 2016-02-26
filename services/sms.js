var httpRequest = require('http_request'); 

exports.send_code = function(tel, message, res) {
    console.log("Message sent to " + tel + ", with the message: " + message);
    httpRequest.get('https://sms.univ-paris1.fr/esup-smsuapi/?action=SendSms&phoneNumber='+tel+'&message='+message, {
        auth: {
            username: properties.esup.sms.username,
            password: properties.esup.sms.password
        }
    }).then(function(response) {
        res.send(response.getBody());
    });
}
