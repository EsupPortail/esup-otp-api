import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import * as userDb_controller from '../controllers/user.js';
import { getInstance } from '../services/logger.js'; const logger = getInstance();
import * as errors from '../services/errors.js';
import { request, ProxyAgent } from 'undici';

export const name = "sms";

/**
 * @type {RequestInit}
 */
const requestOpts = {}
const baseUrlBroker = new URL(properties.getEsupProperty('sms').url);

// Request cannot be constructed from a URL that includes credentials
// so credentials are removed from the URL and placed in the headers
if (baseUrlBroker.username || baseUrlBroker.password) {
    requestOpts.headers = {
        Authorization: 'Basic ' + Buffer.from(decodeURIComponent(baseUrlBroker.username) + ':' + decodeURIComponent(baseUrlBroker.password)).toString('base64')
    }
    baseUrlBroker.username = '';
    baseUrlBroker.password = '';
}

const proxyUrl = properties.getEsupProperty('proxyUrl');

if (proxyUrl) {
    requestOpts.dispatcher = new ProxyAgent(proxyUrl);
}


export async function send_message(req, opts, res) {
    const num = opts.userTransport || await userDb_controller.get_phone_number(req);
    if (utils.check_transport_validity('sms', num)) {
        const url = urlBroker(num, opts.message);
        if (properties.getEsupProperty('sms').method) {
            requestOpts.method = properties.getEsupProperty('sms').method;
        }
        if (properties.getEsupProperty('sms').body) {
                const body = properties.getEsupProperty('sms').body.replace('$phoneNumber$', encodeURIComponent(num)).replace('$message$', encodeURIComponent(opts.message));
                requestOpts.body = body;
        }
        if (properties.getEsupProperty('sms').headers) {
                if (! requestOpts.headers) {
                        requestOpts.headers = {};
                }
                for (const k in properties.getEsupProperty('sms').headers) {
                        requestOpts.headers[k] = properties.getEsupProperty('sms').headers[k];
                }
        }
        
        let sms_response;
        try {
            sms_response = await request(url, requestOpts);
        } catch (error) {
            logger.error(error.message);
            throw new errors.EsupOtpApiError(200, error.message);
        }

        console.log("Message will be sent to " + num + ", with the message: " + opts.message);
        res?.send({
            "code": sms_response.statusCode === 200 ? "Ok" : "KO",
            "message": await sms_response.body.json(),
            "codeRequired": opts.codeRequired,
            "waitingFor": opts.waitingFor
        });

    } else {
        throw new errors.InvalidSmsError();
    }
}

function urlBroker(num, message) {
    return baseUrlBroker.href.replace('$phoneNumber$', encodeURIComponent(num)).replace('$message$', encodeURIComponent(message));;
}
