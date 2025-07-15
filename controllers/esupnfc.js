import logger from '../services/logger.js';
import { apiDb, getUserAndMethodModule } from './api.js';
import methods from '../methods/methods.js';

export async function esupnfc_locations(req, res) {
    req.params.uid = req.params.eppn.split('@').shift();
    const user = await apiDb.find_user(req, res);
    return methods['esupnfc'].locations(user, req, res);
}

export async function esupnfc_check_accept_authentication(req, res) {
    return methods['esupnfc'].check_accept_authentication(req, res);
}

export async function esupnfc_accept_authentication(req, res) {
    const eppn = req.body.eppn;
    const uid = eppn.replace(/@.*/, '');
    logger.debug("[esupnfc_accept_authentication] user uid: " + uid);
    req.params.uid = uid;
    req.params.method = "esupnfc";

    const { user, method } = await getUserAndMethodModule(req, { checkUserMethodActive: true, checkMethodPropertiesExists: true, checkMethodPropertyActivate: true });
    return method.accept_authentication(user, req, res);
}

export async function esupnfc_send_message(req, res) {
    const eppn = req.body.eppn;
    const uid = eppn.replace(/@.*/, '');
    logger.debug("[esupnfc_send_message] user uid: " + uid);
    req.params.uid = uid;
    const user = await apiDb.find_user(req, res);
    return methods['esupnfc'].send_message(user, req, res);
}
