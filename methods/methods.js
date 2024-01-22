import fs from 'fs';
import * as utils from '../services/utils.js';

/**
 * @typedef { import('restify').Request } Request
 * @typedef { import('restify').Response } Response
 * @typedef { import('restify').Next } Next
 * 
 * 
 * @typedef {Object} Method
 * @property {(user: any, req: Request, res: Response, next: Next) => void} send_message
 * @property {(user: any, req: Request, res: Response, callbacks: Function) => void} verify_code
 * @property {(user: any, req: Request, res: Response, next: Next) => void} generate_method_secret
 * @property {(user: any, req: Request, res: Response, next: Next) => void} delete_method_secret
 * @property {(user: any, req: Request, res: Response, next: Next) => void} user_activate
 * @property {(user: any, req: Request, res: Response, next: Next) => void} confirm_user_activate
 * @property {(user: any, req: Request, res: Response, next: Next) => void} user_deactivate
 * @property {(req: Request, res: Response, next: Next) => void} admin_activate
 * @property {(user: any, req: Request, res: Response, next: Next) => void} user_desync
 */

/**
 * @type { Array<Method> }
 */
const methods = {};

fs.readdirSync(utils.__dirname(import.meta.url)).forEach((file) => {
	if (file !== 'methods.js') {
		const strFile = file.split('.');
		if (strFile[strFile.length - 1] === 'js') {
			const moduleName = file.split('.')[0];
			import('./' + moduleName + '.js')
				.then((method) => methods[moduleName] = method);
		}
	}
});

export default methods;