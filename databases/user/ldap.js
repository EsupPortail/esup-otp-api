import * as fileUtils from '../../services/fileUtils.js';
import * as errors from '../../services/errors.js';
import { getUserDbProperties, searchAttributes, modifiableAttributes, allAttributes, attributes, attributesFlipped } from './userUtils.js';
import { errorIfMultiTenantContext } from '../../services/multiTenantUtils.js';

import { Client, Change, Attribute, EqualityFilter, SubstringFilter, OrFilter } from 'ldapts';
/** @import { SearchOptions } from 'ldapts' */

import { logger } from '../../services/logger.js';

/**
 * @type Client
 */
let client;

export async function initialize() {
    errorIfMultiTenantContext();

    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' Initializing ldap connection');
    client = new Client({
        url: getUserDbProperties().uri,
        timeout: getUserDbProperties().timeout,
        connectTimeout: getUserDbProperties().connectTimeout,
    });
    await bindLdapIfNeeded();
    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' Ldap connection Initialized');
}

export function close() {
    return client.unbind();
}

async function bindLdapIfNeeded() {
    if (!client.isConnected) {
        await client.bind(getUserDbProperties().adminDn, getUserDbProperties().password);
    }
}

async function getClient() {
    await bindLdapIfNeeded();
    return client;
}

export async function find_user(uid) {
    let user;
    try {
        user = await find_user_internal(uid);
    } catch (error) {
        if (!isNoSuchObjectError(error)) {
            throw error;
        }
    }
    return user || errors.UserNotFoundError.throw();
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

    const { searchEntries } = await getClient().then(client => client.search(getBaseDn(), opts));
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
            .map(([key, value]) => [attributesFlipped[key], Array.isArray(value) ? value[0] : value])
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
    const { searchEntries } = await client.search(getBaseDn(), opts);
    return searchEntries.map(searchEntry => parseUser(searchEntry, searchAttributes));
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

export function save_user(user) {
    const changes = ldap_change(user);
    return getClient().then(client => client.modify(getDN(user.uid), changes));
}

function getDN(uid) {
    return `uid=${uid},${getBaseDn()}`;
}

export async function create_user(uid) {
    const entry = {
        cn: uid,
        uid: uid,
        sn: uid,
        [attributes.mail]: uid + '@univ.org',
        [attributes.sms]: '0612345678',
        [attributes.displayName]: uid,
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

function getBaseDn() {
    return getUserDbProperties().baseDn;
}

function isNoSuchObjectError(error) {
    return error?.name == "NoSuchObjectError";
}
