import * as sms from './sms.js';
import * as mailer from './mailer.js';

/**
 * @typedef { import('restify').Request } Request
 * @typedef { import('restify').Response } Response
 * 
 * @typedef { Object } opts
 * @property {? String } object
 * @property {? String } code
 * @property {? Boolean } codeRequired
 * @property {? Boolean } waitingFor
 * @property {! String } message
 * @property {? String } userTransport
 * @property {? String } htmlTemplate
 * 
 * @typedef {Object} Transport
 * @property {(req: Request?, opts: opts, res: Response?) => Promise} send_message
 * @property {String} name
 */

/**
 * @type { Array<Transport> }
 */
const transports = {};

for (const transport of [sms, mailer]) {
    setTransport(transport);
}

/**
 * @returns { Transport }
 */
export function getTransport(name) {
    return transports[name];
}

/**
 * (may override a previously setted transport with the same transport.name)
 * 
 * @param {Transport} transport 
 */
export function setTransport(transport) {
    transports[transport.name] = transport;
}