var properties = require(__dirname + '/../properties/properties');
var  utils = require(__dirname + '/../services/utils');
var nodemailer = require("nodemailer");
var smtpTransport = require('nodemailer-smtp-transport');
var logger = require(__dirname + '/../services/logger').getInstance();

// create reusable transport method (opens pool of SMTP connections)
var options = {
    // service: properties.esup.mailer.service,
    // auth: {
    //     user: properties.esup.mailer.address,
    //     pass: properties.esup.mailer.password
    // }
    host: properties.getEsupProperty('mailer').hostname,
    port: properties.getEsupProperty('mailer').port,
    secure: false
};

if(properties.getEsupProperty('proxyUrl'))options.proxy=properties.getEsupProperty('proxyUrl');
var transporter = nodemailer.createTransport(smtpTransport(options))
    // setup e-mail data with unicode symbols
var mailOptions = {
    from: properties.getEsupProperty('mailer').sender_name+" <"+properties.getEsupProperty('mailer').sender_mail+">", // sender address
}

exports.send_message = function(mail, opts, res) {
    if (utils.check_transport_validity('mail', mail)) {
        mailOptions.text = opts.message;
        mailOptions.to = mail;
        mailOptions.subject = opts.object;
        // send mail with defined transport object
        transporter.sendMail(mailOptions, function(error, response) {
            if (error) {
                logger.info(error.message);
                res.send({
                    "code": "Error",
                    "message": error.message
                });

            } else {
                console.log("Message sent to " + mail + " with the message: " + opts.message);
                res.send({
                    "code": "Ok",
                    "message": "Message sent",
                    "codeRequired" : opts.codeRequired,
                    "waitingFor" : opts.waitingFor
                });
            }
        });
    } else res.send({
        "code": "Error",
        "message": properties.getMessages('error','invalid_mail')
    });
}

