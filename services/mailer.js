var properties = require(process.cwd() + '/properties/properties');
var nodemailer = require("nodemailer");
var smtpTransport = require('nodemailer-smtp-transport');

// create reusable transport method (opens pool of SMTP connections)
var options = {
    service: properties.esup.mailer.service,
    auth: {
        user: properties.esup.mailer.address,
        pass: properties.esup.mailer.password
    },
    proxy : properties.esup.proxyUrl
};

var transporter = nodemailer.createTransport(smtpTransport(options))
    // setup e-mail data with unicode symbols
var mailOptions = {
    from: "Esup otp api <"+properties.esup.mailer.address+">", // sender address
}

exports.send_code = function(mail, message, res) {
    console.log("Message sent to " + mail + " with the message: " + message);
    mailOptions.text = message;
    mailOptions.to = properties.esup.dev.mail || mail;
    mailOptions.subject = "Code";
    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, response) {
        if (error) {
            res.send({
                "code": "Error",
                "message": error
            });
        } else {
            res.send({
                "code": "Ok",
                "message": "Message sent"
            });
        }
    });
}

