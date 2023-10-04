import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import request from 'request';

const proxyUrl = properties.getEsupProperty('proxyUrl') || '';

export function send_message(num, opts, res) {
    if (utils.check_transport_validity('sms', num)) {
        const tel = num;
        const url = urlBroker(tel, opts.message);
        const options = {
            url: url
        };
        if (proxyUrl != '') opts.proxy = proxyUrl;
        request(options, function(error, response, body) {
            if (error) console.log(error);
            if (!error && response.statusCode == 200) {
                console.log("Message will be sent to " + tel + ", with the message: " + opts.message);
                res.send({
                    "code": "Ok",
                    "message": body,
                    "codeRequired" : opts.codeRequired,
                    "waitingFor" : opts.waitingFor
                });
            } else res.send({
                "code": "Error",
                "message": error
            });
        });
    } else res.send({
        "code": "Error",
        "message": properties.getMessage('error','invalid_sms')
    });
}

function urlBroker(num, message) {
    return properties.getEsupProperty('sms').url.replace('$phoneNumber$', encodeURIComponent(num)).replace('$message$', encodeURIComponent(message));
}