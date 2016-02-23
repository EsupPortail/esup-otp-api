var nodemailer = require("nodemailer");
var smtpTransport = require('nodemailer-smtp-transport');

// create reusable transport method (opens pool of SMTP connections)
var options = {
    service: 'gmail',
    auth: {
        user: 'esup.otp@gmail.com',
        pass: 'esup1234'
    }
};

var transporter = nodemailer.createTransport(smtpTransport(options))
    // setup e-mail data with unicode symbols
var mailOptions = {
    from: "Esup otp api <esup.otp@gmail.com>", // sender address
    to: "abouskine@gmail.com", // list of receivers
    subject: "Hello", // Subject line
}

exports.sendMail = function(message, img, res) {
    mailOptions.text = message;
    mailOptions.html = img;
    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, response) {
        if (error) {
            res.send(error);
        } else {
            res.send("Message sent.");
        }
    });
}
