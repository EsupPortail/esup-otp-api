import * as properties from '../properties/properties.js';


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
 * @type { Object.<Method['name']:Method> }
 */
const methods = {};

export async function initialize() {
    for (const methodName in properties.getEsupProperty("methods")) {
        const method = await import(`./${methodName}.js`);
        methods[method.name] = method;
    }
}

export default methods;