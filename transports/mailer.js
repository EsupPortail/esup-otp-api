import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import * as nodemailer from "nodemailer";
import { Eta } from "eta";
import * as userDb_controller from '../controllers/user.js';
import { getInstance } from '../services/logger.js'; const logger = getInstance();
import * as errors from '../services/errors.js';

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
    secure: false
};

if (properties.getEsupProperty('proxyUrl') && mailerProperty.use_proxy) 
    options.proxy = properties.getEsupProperty('proxyUrl');
const transporter = nodemailer.createTransport(options);
// setup e-mail data with unicode symbols
const senderAddress = mailerProperty.sender_name + " <" + mailerProperty.sender_mail + ">";

/**
 * @type {Eta}
 */
const eta = mailerProperty.use_templates && new Eta({ views: utils.relativeToAbsolutePath(import.meta.url, "./email_templates") });

export async function send_message(req, opts, res) {
    const mail = opts.userTransport || await userDb_controller.get_mail_address(req);

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
                console.log("Message sent to " + mail + " with the message: " + opts.message);
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
