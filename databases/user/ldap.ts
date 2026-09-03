import * as properties from '../../properties/properties.js';
import * as fileUtils from '../../services/fileUtils.js';
import { UserNotFoundError } from '../../services/errors.js';
import { errorIfMultiTenantContext } from '../../services/multiTenantUtils.js';
import StandardUserData from '../../services/userDb/userData/StandardUserData.ts';
import UserDbAttributes from '../../services/userDb/UserDbAttributes.ts';

import { Client, Change, Attribute, EqualityFilter, SubstringFilter, OrFilter } from 'ldapts';
/** @import { SearchOptions } from 'ldapts' */

import { logger } from '../../services/logger.js';

const ldapProperties = properties.getEsupProperty("ldap");
const userDbAttributes = new UserDbAttributes(ldapProperties);
const { searchAttributes, modifiableAttributes, modifiableAttributesRecord, allAttributes, attributes } = userDbAttributes;

export { modifiableAttributesRecord };

/**
 * @type Client
 */
let client;

export async function initialize() {
    errorIfMultiTenantContext();

    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' Initializing ldap connection');
    client = new Client({
        url: ldapProperties.uri,
        timeout: ldapProperties.timeout,
        connectTimeout: ldapProperties.connectTimeout,
    });
    await bindLdapIfNeeded();
    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' Ldap connection Initialized');
}

export function close() {
    return client.unbind();
}

async function bindLdapIfNeeded() {
    if (!client.isConnected) {
        await client.bind(ldapProperties.adminDn, ldapProperties.password);
    }
}

async function getClient() {
    await bindLdapIfNeeded();
    return client;
}

/**
 * @returns {Promise<StandardUserData>}
 */
export async function find_user(uid) {
    let user;
    try {
        user = await find_user_internal(uid);
    } catch (error) {
        if (!isNoSuchObjectError(error)) {
            throw error;
        }
    }
    if (user) {
        return new StandardUserData(user, attributes);
    } else {
        throw new UserNotFoundError();
    }
}

/**
 * @returns the user, or undefined
 */
async function find_user_internal(uid) {
    /** @type SearchOptions */
    const opts = {
        filter: new EqualityFilter({ attribute: attributes.uid, value: uid }),
        scope: 'sub',
        attributes: allAttributes
    };

    const { searchEntries } = await getClient().then(client => client.search(ldapProperties.baseDn, opts));
    const searchEntry = searchEntries?.[0];

    if (!searchEntry) {
        return;
    }

    return parseUser(searchEntry, allAttributes);
}

/**
 * @param {String[]} attributeList 
 */
function parseUser(searchEntry, attributeList) {
    return Object.fromEntries(
        Object.entries(searchEntry)
            .filter(([key]) => attributeList.includes(key))
            .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
    );
}

export async function search_users(req, token) {
    /** @type SearchOptions */
    const opts = {
        filter: new OrFilter({ // (|(uid=*token*)(displayName=*token*))
            filters: searchAttributes.map(attr => new SubstringFilter({
                attribute: attr,
                any: [token],
            }))
        }),
        scope: 'sub',
        attributes: searchAttributes,
    };

    const client = await getClient();
    const { searchEntries } = await client.search(ldapProperties.baseDn, opts);
    return searchEntries
        .map(searchEntry => parseUser(searchEntry, searchAttributes))
        .map(result => userDbAttributes.standardizeSearchResults(result));
}

function ldap_change(user) {
    const changes = [];

    for (const attr in user) {
        if (modifiableAttributes.includes(attr)) {
            const modif = new Attribute({ type: attr, values: [user[attr]].filter(Boolean) });
            const change = new Change({
                operation: 'replace',
                modification: modif
            });
            changes.push(change);
        }
    }
    return changes;
}

/**
 * @param { StandardUserData } user 
 */
export function save_user(user) {
    const changes = ldap_change(user.internalUser);
    return getClient().then(client => client.modify(getDN(user.getUid()), changes));
}

function getDN(uid) {
    return `${attributes.uid}=${uid},${ldapProperties.baseDn}`;
}

/**
 * @returns {Promise<StandardUserData>}
 */
export async function create_user(uid) {
    const entry = {
        cn: uid,
        [attributes.uid]: uid,
        sn: uid,
        objectclass: ['inetOrgPerson']
    };
    const client = await getClient();
    await client.add(getDN(uid), entry);
    return find_user(uid);
}

export async function remove_user(uid) {
    const client = await getClient();
    try {
        return await client.del(getDN(uid));
    } catch (error) {
        if (!isNoSuchObjectError(error)) {
            throw error;
        }
    }
}

function isNoSuchObjectError(error) {
    return error?.name == "NoSuchObjectError";
}
