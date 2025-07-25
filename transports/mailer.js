import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import * as fileUtils from '../services/fileUtils.js';
import * as nodemailer from "nodemailer";
import { Eta } from "eta";
import { logger } from '../services/logger.js';
import * as errors from '../services/errors.js';
import { getMail } from '../databases/user/userUtils.js';

export const name = "mail";

const mailerProperty = properties.getEsupProperty('mailer');

// create reusable transport method (opens pool of SMTP connections)
const options = {
    // service: properties.esup.mailer.service,
    // auth: {
    //     user: properties.esup.mailer.address,
    //     pass: properties.esup.mailer.password
    // }
    host: mailerProperty.hostname,
    port: mailerProperty.port,
    secure: false,
    tls: {
        rejectUnauthorized: !mailerProperty.accept_self_signed_certificate,
    },
};

if (properties.getEsupProperty('proxyUrl') && mailerProperty.use_proxy) 
    options.proxy = properties.getEsupProperty('proxyUrl');
const transporter = nodemailer.createTransport(options);
// setup e-mail data with unicode symbols
const senderAddress = mailerProperty.sender_name + " <" + mailerProperty.sender_mail + ">";

/**
 * @type {Eta}
 */
const eta = mailerProperty.use_templates && new Eta({ views: fileUtils.relativeToAbsolutePath(import.meta.url, "./email_templates") });

export async function send_message(req, opts, res, user) {
    const mail = opts.userTransport || getMail(user.userDb);

    if (utils.check_transport_validity('mail', mail)) {
        /**
         * @type {nodemailer.SendMailOptions}
         */
        const mailOptions = {
            from: senderAddress,
            text: opts.message,
            to: mail,
            subject: opts.object,
        }

        if(mailerProperty.use_templates && opts.htmlTemplate) {
            mailOptions.html = eta.render("./" + opts.htmlTemplate + "/html.eta", {code: opts.code})
        }

        // send mail with defined transport object
        return transporter.sendMail(mailOptions)
            .then(() => {
                logger.info("Message sent to " + mail + " with the message: " + opts.message);
                res?.send({
                    "code": "Ok",
                    "message": "Message sent",
                    "codeRequired": opts.codeRequired,
                    "waitingFor": opts.waitingFor
                });
            })
            .catch((error) => {
                logger.error(error);
                throw new errors.EsupOtpApiError(200, error.message);
            });
    } else {
        throw new errors.InvalidMailError();
    }
}
