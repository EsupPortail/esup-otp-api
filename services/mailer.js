var properties = require(process.cwd() + '/properties/properties');
var nodemailer = require("nodemailer");
var smtpTransport = require('nodemailer-smtp-transport');

// create reusable transport method (opens pool of SMTP connections)
var options = {
    service: properties.esup.mailer.service,
    auth: {
        user: properties.esup.mailer.address,
        pass: properties.esup.mailer.password
    }
};

var transporter = nodemailer.createTransport(smtpTransport(options))
    // setup e-mail data with unicode symbols
var mailOptions = {
    from: "Esup otp api <"+properties.esup.mailer.address+">", // sender address
}

exports.sendQRCode = function(mail, message, img, res) {
    mailOptions.text = message;
    mailOptions.html = img;
    mailOptions.to= mail;
    mailOptions.subject= "Google Authenticator QRCode";
    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, response) {
        if (error) {
            res.send(error);
        } else {
            res.send("Message sent.");
        }
    });
}

exports.send_code = function(mail, message, res) {
	console.log("Message sent to "+mail+" with the message: "+message);
    mailOptions.text = message;
    mailOptions.to= mail;
    mailOptions.subject= "Code";
    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, response) {
        if (error) {
            res.send(error);
        } else {
            res.send("Message sent.");
        }
    });
}
