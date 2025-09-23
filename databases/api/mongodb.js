import * as userDb_controller from '../../controllers/user.js';
import { isMultiTenantContext, currentTenantMongodbFilter } from '../../services/multiTenantUtils.js';
import * as properties from '../../properties/properties.js';
import * as fileUtils from '../../services/fileUtils.js';
import * as utils from '../../services/utils.js';
import { UserNotFoundError } from '../../services/errors.js';
import * as mongoose from 'mongoose';
import UserPreferencesSchema from './userPreferencesSchema.js';
import ApiPreferencesSchema from './apiPreferencesSchema.js';
import TenantSchema from './tenantSchema.js';

import { logger } from '../../services/logger.js';
import { getTransport } from '../user/userUtils.js';

/** @type { mongoose.Connection } */
let connection;

export async function initialize(dbUrl) {
    connection = await mongoose.createConnection(dbUrl || properties.getMongoDbUrl()).asPromise();
    if (isMultiTenantContext()) {
        await initialize_tenant_model(connection);
    }
    return Promise.all([
        initialize_api_preferences(connection),
        initialize_user_model(connection),
    ]);
}

export function close() {
    return connection.close();
}

/** 
 * Api Preferences
 * @type mongoose.Model
 */
let ApiPreferences;

/**
 * @param { mongoose.Connection } connection
 */
async function initialize_api_preferences(connection) {
    ApiPreferences = connection.model('ApiPreferences', ApiPreferencesSchema, 'ApiPreferences');

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
async function initialize_user_model(connection) {
    UserPreferences = connection.model('UserPreferences', UserPreferencesSchema, 'UserPreferences');
}

/** 
 * Tenant Model 
 * @type mongoose.Model
 */
let Tenants;

/**
 * @param { mongoose.Connection } connection
 */
async function initialize_tenant_model(connection) {
    Tenants = connection.model('Tenants', TenantSchema, 'Tenants');

    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + " Start initializing tenants");
    for (const tenant of properties.getEsupProperty('tenants')) {
        logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ` Check tenant configuration ${tenant['name']}`)
        const existingTenant = await find_tenant_by_name(tenant.name);
        if (existingTenant === undefined || existingTenant === null) {
            logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ` Start configuration of tenant ${tenant.name}`);
            // Generate api_password secret
            tenant.api_password ??= utils.generate_base64url_code(30);

            // Generate users_secret secret
            tenant.users_secret ??= utils.generate_base64url_code(30);

            const created_tenant = await init_tenant(tenant);
            logger.debug(fileUtils.getFileNameFromUrl(import.meta.url) + ` Tenant ${created_tenant.name} created`);
            logger.silly(fileUtils.getFileNameFromUrl(import.meta.url) + ` Tenant ${created_tenant.name} api_password : ${created_tenant.api_password}`);
            logger.silly(fileUtils.getFileNameFromUrl(import.meta.url) + ` Tenant ${created_tenant.name} users_secret : ${created_tenant.users_secret}`);
        }
    }
}

/**
 * Retourne l'utilisateur mongo
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function find_user_by_id(uid) {
    const userPreferences = await UserPreferences.findOne({ 'uid': uid });
    if (userPreferences) {
        // to call update_active_methods() and save potential changes
        await save_user(userPreferences);
        return userPreferences;
    } else {
        return create_user(uid);
    }
}

export async function find_user(req) {
    return find_user_by_id(req.params.uid);
}

/**
 * Sauve l'utilisateur
 */
export async function save_user(user) {
    await update_active_methods(user);
    return user.save();
}

export async function create_user(uid) {
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

const RANDOM_CODE_METHODS = ["random_code", "random_code_mail"];
const METHODS_WITH_INTERNALLY_ACTIVATED = RANDOM_CODE_METHODS.concat(["webauthn", "esupnfc"]);
async function update_active_methods(user) {
    // for the first access to this user since "internally_activated" exists, we configure it with the existing value of "active".
    for (const methodName of METHODS_WITH_INTERNALLY_ACTIVATED) {
        const userMethod = user[methodName];
        userMethod.internally_activated ??= userMethod.active;
        userMethod.active = false;
    }

    // turn off webauthn if no authenticator is present
    user.webauthn.active = Boolean(user.webauthn.internally_activated && user.webauthn.authenticators?.length);

    const userDb = user.userDb || await find_userDb(user.uid);

    // turn off random_code(_mail) if no transport is present for this method
    for (const random_code of RANDOM_CODE_METHODS) {
        const userMethod = user[random_code];
        userMethod.active = userMethod.internally_activated && properties.getTransports(random_code).some(transport => getTransport(userDb, transport));
    }

    user.hasEnabledMethod = Object.keys(properties.getEsupProperty("methods")).some(method => user[method]?.active && properties.getMethod(method)?.activate);

    user.esupnfc.active = user.esupnfc.internally_activated || (properties.getMethod("esupnfc")?.autoActivate && user.hasEnabledMethod);

    if (properties.getMethod("esupnfc")?.saveAutoActivation) {
        user.esupnfc.internally_activated = user.esupnfc.active;
    }

    user.userDb = userDb;
}

async function find_userDb(uid) {
    try {
        return await userDb_controller.userDb.find_user(uid);
    } catch (error) {
        if (error instanceof UserNotFoundError && properties.getEsupProperty('auto_create_user')) {
            return userDb_controller.userDb.create_user(uid);
        } else {
            throw error;
        }
    }
}

export function parse_user(user) {
    const parsed_user = {
        codeRequired: false,
        waitingFor: false,
    };
    if (properties.getMethod('totp')?.activate) {
        if (user.totp.active) parsed_user.codeRequired = true;
        parsed_user.totp = {
            active: user.totp.active,
            message: "",
            qrCode: "",
            transports: available_transports(user.totp.transports, "totp")
        };
    }

    if (properties.getMethod('webauthn')?.activate) {
        parsed_user.webauthn = {
            active: user.webauthn.active,
            transports: available_transports(user.webauthn.transports, "webauthn")
        };
    }
    if (properties.getMethod('random_code')?.activate) {
        if (user.random_code.active) parsed_user.codeRequired = true;
        parsed_user.random_code = {
            active: user.random_code.active,
            transports: available_transports(user.random_code.transports, 'random_code')
        };
    }
    if (properties.getMethod('random_code_mail')?.activate) {
        if (user.random_code_mail.active) parsed_user.codeRequired = true;
        parsed_user.random_code_mail = {
            active: user.random_code_mail.active,
            transports: available_transports(user.random_code_mail.transports, 'random_code_mail')
        };
    }
    if (properties.getMethod('bypass')?.activate) {
        if (user.bypass.active) parsed_user.codeRequired = true;
        parsed_user.bypass = {
            active: user.bypass.active,
            codes: [],
            available_code: user.bypass.codes.length,
            used_code: user.bypass.used_codes,
            generation_date: user.bypass.generation_date,
            transports: available_transports(user.bypass.transports, "bypass")
        };
    }
    if (properties.getMethod('passcode_grid')?.activate) {
        if (user.passcode_grid.active) parsed_user.codeRequired = true;
        parsed_user.passcode_grid = {
            active: user.passcode_grid.active,
            generation_date: user.passcode_grid.generation_date,
            transports: available_transports(user.passcode_grid.transports, "passcode_grid")
        };
    }
    //if(properties.getMethod('matrix')?.activate){
    //  parsed_user.matrix = user.matrix;
    //}
    // parsed_user.matrix.active = user.matrix.active;
    if (properties.getMethod('push')?.activate) {
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
    if (properties.getMethod('esupnfc')?.activate) {
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
    const filter = await currentTenantMongodbFilter(req);

    const data = await UserPreferences.find(filter, { uid: 1 });
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

export async function find_tenant_by_scope(scope) {
    return await Tenants.findOne({ 'scopes': scope });
}

/**
 * Sauve le tenant
 */
export function save_tenant(tenant) {
    return tenant.save();
}

async function init_tenant(tenant) {
    return save_tenant(new Tenants({
        id: new mongoose.mongo.ObjectId(),
        name: tenant.name,
        scopes: tenant.scopes,
        webauthn: tenant.webauthn,
        api_password: tenant.api_password,
        users_secret: tenant.users_secret
    }));
}

export async function update_tenant(req, res) {
    const tenant = await find_tenant_by_id(req, res);
    if (tenant) {
        tenant.name = req.body.name;
        tenant.scopes = req.body.scopes;
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
    save_tenant(new Tenants({
        id: new mongoose.mongo.ObjectId(),
        name: tenant.name,
        scopes: tenant.scopes,
        webauthn: tenant.webauthn,
        api_password: btoa(tenant.api_password),
        users_secret: btoa(tenant.users_secret)
    }));
}

/**
 * Retourne les tenants sauvegardés dans mongo
 */
export async function get_tenants(req, res) {
    const data = await Tenants.find({});
    const result = data.map(t => ({ id: t.id, name: t.name }));
    return result;
}

export async function delete_tenant(req, res) {
    await Tenants.deleteOne({ 'id': req.params.id });
}

/**
 * Retourne le nombre d'utilisateurs totaux ayant au moins une méthode de MFA activée
 * Puis, pour chaque méthode, le nombre d'utilisateurs ayant cette méthode activée.
 * Retourne enfin l'OS (platform) utilisé pour la méthode Authentification (push)
 */
export async function stats() {
    const stats = {
        totalUsers: 0,
        totalMfaUsers: 0,
        methods: {},
        pushPlatforms: {}
    };

    const allMethods = properties.getEsupProperty('methods');

    const activeMethods = Object.entries(allMethods)
        .filter(([_, conf]) => conf.activate === true || conf.activate === 'true')
        .map(([method]) => method);
    
    for (const method of activeMethods) {
        stats.methods[method] = 0;
    }

    const pipeline = [
        {
            $project: Object.fromEntries(
                activeMethods.map(method => [method, 1])
            )
        },
        {
            $facet: {
                methodCounts: [
                    {
                        $group: Object.fromEntries([
                            ['_id', null],
                            ...activeMethods.map(method => [
                                method,
                                {
                                    $sum: {
                                        $cond: [
                                            { $eq: [`$${method}.active`, true] },
                                            1,
                                            0
                                        ]
                                    }
                                },
                            ])
                        ])
                    }
                ],
                mfaUsers: [
                    {
                        $match: {
                            $or: activeMethods.map(method => ({
                                [`${method}.active`]: true
                            }))
                        }
                    },
                    { $count: 'count' }
                ],
                totalUsers: [
                    { $count: 'count' }
                ],
                pushPlatforms: [
                    {
                        $group: {
                            _id: '$push.device.platform',
                            count: { $sum: 1 }
                        }
                    }
                ]
            }
        }
    ];

    const result = await UserPreferences.aggregate(pipeline).exec();
    const data = result[0];

    // Remplir stats.methods
    if (data.methodCounts.length > 0) {
        for (const method of activeMethods) {
            stats.methods[method] = data.methodCounts[0][method] || 0;
        }
    }

    // Remplir stats.pushPlatforms
    if (data.pushPlatforms.length > 0) {
        for (const platform of data.pushPlatforms) {
            if(platform.count>0 && platform._id) {
                stats.pushPlatforms[platform._id] = platform.count;
            }
        }
    }

    stats.totalUsers = data.totalUsers[0]?.count || 0;
    stats.totalMfaUsers = data.mfaUsers[0]?.count || 0;

    return stats;
}
