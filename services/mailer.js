var properties = require(process.cwd() + '/properties/properties');
var nodemailer = require("nodemailer");
var smtpTransport = require('nodemailer-smtp-transport');

// create reusable transport method (opens pool of SMTP connections)
var options = {
    // service: properties.esup.mailer.service,
    // auth: {
    //     user: properties.esup.mailer.address,
    //     pass: properties.esup.mailer.password
    // }
    host: properties.esup.mailer.hostname,
    port: properties.esup.mailer.port,
    secure: false
};

if(properties.esup.proxyUrl)options.proxy=properties.esup.proxyUrl;
var transporter = nodemailer.createTransport(smtpTransport(options))
    // setup e-mail data with unicode symbols
var mailOptions = {
    from: properties.esup.mailer.sender_name+" <"+properties.esup.mailer.sender_mail+">", // sender address
}

exports.send_message = function(mail, message, res) {
    mailOptions.text = message;
    mailOptions.to =mail;
    mailOptions.subject = "Code";
    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, response) {
        if (error) {
            res.send({
                "code": "Error",
                "message": error
            });
        } else {
            console.log("Message sent to " + mail + " with the message: " + message);
            res.send({
                "code": "Ok",
                "message": "Message sent"
            });
        }
    });
}