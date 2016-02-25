var httpRequest = require('http_request'); 

exports.send_code = function(tel, message, res) {
    console.log("Message sent to " + tel + ", with the message: " + message);
    httpRequest.get('https://sms.univ-paris1.fr/esup-smsuapi/?action=SendSms&phoneNumber=0652328590&message='+message, {
        auth: {
            username: 'esup-otp-api',
            password: 'chat auto air'
        }
    }).then(function(response) {
        res.send(response.getBody());
    });
}
