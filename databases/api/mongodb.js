import * as userDb_controller from '../../controllers/user.js';
import * as properties from '../../properties/properties.js';
import * as fileUtils from '../../services/fileUtils.js';
import * as utils from '../../services/utils.js';
import * as mongoose from 'mongoose';
import { schema as userPreferencesSchema } from './userPreferencesSchema.js';
import { schema as apiPreferencesSchema } from './apiPreferencesSchema.js';
import TenantSchema from './tenantSchema.js';

import { getInstance } from '../../services/logger.js';
const logger = getInstance();

export async function initialize(dbUrl) {
    const connection = await mongoose.createConnection(dbUrl || properties.getMongoDbUrl()).asPromise();
    await initiatilize_tenant_model(connection);
    return Promise.all([
        initiatilize_api_preferences(connection),
        initiatilize_user_model(connection),
    ]);
}


/** 
 * Api Preferences
 * @type mongoose.Model
 */
let ApiPreferences;

/**
 * @param { mongoose.Connection } connection
 */
async function initiatilize_api_preferences(connection) {
    const ApiPreferencesSchema = new mongoose.Schema(apiPreferencesSchema);

    connection.model('ApiPreferences', ApiPreferencesSchema, 'ApiPreferences');

    ApiPreferences = connection.model('ApiPreferences');
    const existingApiPrefsData = await ApiPreferences.findOne({}).exec();
    if (existingApiPrefsData) {
        const prefs = properties.getEsupProperty('methods');
        for (const p in prefs) {
            prefs[p].activate = existingApiPrefsData[p].activate;
            prefs[p].transports = existingApiPrefsData[p].transports;
        }
        properties.setEsupProperty('methods', prefs);
        return update_api_preferences();
    }
    else {
        logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' No existing api prefs data : creating.');
        return create_api_preferences();
    }
}

/**
 * Sauvegarde les préférences de l'api
 *
 * @param req requete HTTP
 * @param res response HTTP
 */
export async function update_api_preferences() {
    const data = await ApiPreferences.findOne({});
    if (data) {
        const prefs = properties.getEsupProperty('methods');
        for (const p in prefs) {
            data[p] = prefs[p];
        }
        const api_preferences = data;
        await api_preferences.save();
        logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + " Api Preferences updated");
    }
}

async function create_api_preferences() {
    await ApiPreferences.deleteMany({});
    const api_preferences = new ApiPreferences(properties.getEsupProperty('methods'));
    await api_preferences.save();
    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + " Api Preferences created");
}
/** 
 * User Model 
 * @type mongoose.Model
 */
let UserPreferences;

/**
 * @param { mongoose.Connection } connection
 */
async function initiatilize_user_model(connection) {
    const UserPreferencesSchema = new mongoose.Schema(userPreferencesSchema);
    connection.model('UserPreferences', UserPreferencesSchema, 'UserPreferences');
    UserPreferences = connection.model('UserPreferences');
    //UserPreferences = connection.model('UserPreferences', UserPreferencesSchema, 'UserPreferences');
}

/** 
 * Tenant Model 
 * @type mongoose.Model
 */
let Tenants;

/**
 * @param { mongoose.Connection } connection
 */
function initiatilize_tenant_model(connection) {
    Tenants = connection.model('Tenants', TenantSchema, 'Tenants');

    logger.info(utils.getFileNameFromUrl(import.meta.url) + " Start initializing tenants");
    return new Promise(async function(resolve, reject) {
        for (let tenant of properties.getEsupProperty('tenants')) {
            tenant = cleanTenant(tenant);
            logger.info(utils.getFileNameFromUrl(import.meta.url) + ` Check tenant configuration ${tenant['name']}`)
            const existingTenant = await Tenants.findOne({ 'name': tenant.name }).exec();
            if (existingTenant === undefined || existingTenant === null) {
                logger.info(utils.getFileNameFromUrl(import.meta.url) + ` Start configuration of tenant ${tenant.name}`);
                // Generate api_password secret
                tenant.api_password = generateSecret();

                // Generate users_secret secret
                tenant.users_secret = generateSecret();
    
                init_tenant(tenant).then(created_tenant => {
                    logger.debug(utils.getFileNameFromUrl(import.meta.url) + ` Tenant ${created_tenant.name} created`);
                    logger.trace(utils.getFileNameFromUrl(import.meta.url) + ` Tenant ${created_tenant.name} api_password : ${created_tenant.api_password}`);
                    logger.trace(utils.getFileNameFromUrl(import.meta.url) + ` Tenant ${created_tenant.name} users_secret : ${created_tenant.users_secret}`);
                });
            }
        }
        resolve();
    });
}

function cleanTenant(tenant) {
    if (Array.isArray(tenant)) {
        return tenant.map(cleanTenant);
    } else if (typeof tenant === 'object' && tenant !== null) {
        return Object.keys(tenant).reduce((acc, key) => {
            if (!key.startsWith("#")) {
                acc[key] = cleanTenant(tenant[key]); // Appel récursif
            }
            return acc;
        }, {});
    }
    return tenant;
}

function generateSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+';
    return Array.from({length: 16}, (x, i) => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}

/**
 * Retourne l'utilisateur mongo
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function find_user(req, res) {
    const userPreferences = await UserPreferences.findOne({ 'uid': req.params.uid });
    if (userPreferences) {
        return userPreferences;
    } else {
        const user = await userDb_controller.find_user(req, res);
        return create_user(user.uid);
    }
}

/**
 * Sauve l'utilisateur
 */
export function save_user(user) {
    return user.save();
}

export function create_user(uid) {
    return save_user(new UserPreferences({ uid: uid }));
}

/**
 * Supprime l'utilisateur
 *
 * @param req requete HTTP
 * @param res response HTTP
 */
export function remove_user(uid) {
    return UserPreferences.deleteOne({ uid: uid });
}

export function parse_user(user) {
    const parsed_user = {};
    parsed_user.codeRequired = false;
    parsed_user.waitingFor = false;
    if (properties.getMethod('totp').activate) {
        if (user.totp.active) parsed_user.codeRequired = true;
        parsed_user.totp = {
            active: user.totp.active,
            message: "",
            qrCode: "",
            transports: available_transports(user.totp.transports, "totp")
        };
    }

    if (properties.getMethod('webauthn').activate) {
        parsed_user.webauthn = {
            active: user.webauthn.active,
            transports: available_transports(user.webauthn.transports, "webauthn")
        };
    }
    if (properties.getMethod('random_code').activate) {
        if (user.random_code.active) parsed_user.codeRequired = true;
        parsed_user.random_code = {
            active: user.random_code.active,
            transports: available_transports(user.random_code.transports, 'random_code')
        };
    }
    if (properties.getMethod('random_code_mail').activate) {
        if (user.random_code_mail.active) parsed_user.codeRequired = true;
        parsed_user.random_code_mail = {
            active: user.random_code_mail.active,
            transports: available_transports(user.random_code_mail.transports, 'random_code_mail')
        };
    }
    if (properties.getMethod('bypass').activate) {
        if (user.bypass.active) parsed_user.codeRequired = true;
        parsed_user.bypass = {
            active: user.bypass.active,
            codes: [],
            available_code: user.bypass.codes.length,
            used_code: user.bypass.used_codes,
            transports: available_transports(user.bypass.transports, "bypass")
        };
    }
    //if(properties.getMethod('matrix').activate){
    //  parsed_user.matrix = user.matrix;
    //}
    // parsed_user.matrix.active = user.matrix.active;
    if (properties.getMethod('push').activate) {
        if (user.push.active) parsed_user.waitingFor = true;
        parsed_user.push = {
            device: {
                platform: user.push.device.platform,
                phone_number: user.push.device.phone_number,
                manufacturer: user.push.device.manufacturer,
                model: user.push.device.model,
                canReceiveNotifications: utils.canReceiveNotifications(user),
                activationCode: {},
                qrCode: {},
                api_url: {}
            },
            activationCode: '',
            api_url: '',
            qrCode: '',
            active: user.push.active,
            transports: available_transports(user.push.transports, "push")
        };
    }
    if (properties.getMethod('esupnfc').activate) {
        // autologin
        if (user.esupnfc.active) parsed_user.waitingFor = true;
        parsed_user.esupnfc = {
            active: user.esupnfc.active,
            transports: available_transports(user.esupnfc.transports, 'esupnfc')
        };
    }
    return parsed_user;
}

function available_transports(userTransports, method) {
    const available_transports = [];
    for (const t in userTransports) {
        if (properties.getMethod(method).transports.indexOf(userTransports[t]) >= 0) {
            available_transports.push(userTransports[t]);
        }
    }
    return available_transports;
}


export async function get_uids(req, res) {
    const data = await UserPreferences.find({}, { uid: 1 });
    const result = data.map((uid) => uid.uid);

    res.status(200);
    res.send({
        code: "Ok",
        uids: result
    });
}

export async function find_tenant_by_id(req, res) {
    return await Tenants.findOne({ 'id': req.params.id });
}

/**
 * Retourne le tenant mongo
 * 
 * @param {*} name nom du tenant
 */
export async function find_tenant_by_name(name) {
    return await Tenants.findOne({ 'name': name });
}

/**
 * Sauve le tenant
 */
export function save_tenant(tenant) {
    return tenant.save();
}

async function init_tenant(tenant) {
    return save_tenant(new Tenants({ id: new mongoose.mongo.ObjectId(), name: tenant.name, webauthn: tenant.webauthn, api_password: tenant.api_password, users_secret: tenant.users_secret }));
}

export async function update_tenant(req, res) {
    const tenant = await find_tenant_by_id(req, res);
    if(tenant) {
        tenant.name = req.body.name;
        tenant.webauthn = req.body.webauthn;
        tenant.api_password = req.body.api_password;
        tenant.users_secret = req.body.users_secret;
        return await save_tenant(tenant);
    }
}

/**
 * Crée le tenant
 */
export async function create_tenant(req, res) {
    /*const tenantDb = await find_tenant_by_name(req.body.name);
    if(tenantDb) {
        const response = {
            code: 'KO',
            message: "Tenant already exist"
        };
        res.status(400);
        res.send(response);
        return;
    }*/
    const tenant = req.body;
    save_tenant(new Tenants({ id: new mongoose.mongo.ObjectId(), name: tenant.name, webauthn: tenant.webauthn, api_password: btoa(tenant.api_password), users_secret: btoa(tenant.users_secret) }));
}

/**
 * Retourne les tenants sauvegardés dans mongo
 */
export async function get_tenants(req, res) {
    const data = await Tenants.find({});
    const result = data.map(t => ({id: t.id, name: t.name}));
    return result;
}

export async function delete_tenant(req, res) {
    await Tenants.deleteOne({ 'id': req.params.id });
}