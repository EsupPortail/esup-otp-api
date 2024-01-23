import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import request from 'request-promise-native';
import * as userDb_controller from '../controllers/user.js';
import { getInstance } from '../services/logger.js'; const logger = getInstance();

export const name = "sms";

const proxyUrl = properties.getEsupProperty('proxyUrl');

export async function send_message(req, opts, res) {
    const num = await userDb_controller.get_phone_number(req, res);
    if (utils.check_transport_validity('sms', num)) {
        const tel = num;
        const url = urlBroker(tel, opts.message);
        const requestOptions = {
            url: url
        };
        if (proxyUrl) {
            requestOptions.proxy = proxyUrl;
        }
        return request(requestOptions)
            .then((body) => {
                console.log("Message will be sent to " + tel + ", with the message: " + opts.message);
                res.send({
                    "code": "Ok",
                    "message": body,
                    "codeRequired": opts.codeRequired,
                    "waitingFor": opts.waitingFor
                });
            })
            .catch((error) => {
                logger.error(error);
                res.send({
                    "code": "Error",
                    "message": error
                });
            });
    } else res.send({
        "code": "Error",
        "message": properties.getMessage('error', 'invalid_sms')
    });
}

function urlBroker(num, message) {
    return properties.getEsupProperty('sms').url.replace('$phoneNumber$', encodeURIComponent(num)).replace('$message$', encodeURIComponent(message));
}
