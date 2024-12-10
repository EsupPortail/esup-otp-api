import * as bypass from './bypass.js';
import * as passcode_grid from './passcode_grid.js';
import * as esupnfc from './esupnfc.js';
import * as push from './push.js';
import * as random_code_mail from './random_code_mail.js';
import * as random_code from './random_code.js';
import * as totp from './totp.js';
import * as webauthn from './webauthn.js';


/**
 * @typedef { import('restify').Request } Request
 * @typedef { import('restify').Response } Response
 * 
 * @typedef {Object} Method
 * @property {(user: any, req: Request, res: Response) => Promise} send_message
 * @property {(user: any, req: Request, res: Response) => Promise<boolean>} verify_code
 * @property {(user: any, req: Request, res: Response) => Promise} generate_method_secret
 * @property {(user: any, req: Request, res: Response) => Promise} delete_method_secret
 * @property {(user: any, req: Request, res: Response) => Promise} user_activate
 * @property {(user: any, req: Request, res: Response) => Promise} confirm_user_activate
 * @property {(user: any, req: Request, res: Response) => Promise} user_deactivate
 * @property {(user: any, req: Request, res: Response) => Promise} user_desync
 * @property {String} name
 */

/**
 * @type { Array<Method> }
 */
const methods = {};

for (const method of [bypass, passcode_grid, esupnfc, push, random_code_mail, random_code, totp, webauthn]) {
    methods[method.name] = method;
}

export default methods;