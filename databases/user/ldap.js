import * as utils from '../../services/utils.js';
import * as properties from '../../properties/properties.js';
import * as errors from '../../services/errors.js';
import { Client, Change, Attribute, EqualityFilter } from 'ldapts';
/** @import { SearchOptions } from 'ldapts' */

import { getInstance } from '../../services/logger.js';
const logger = getInstance();

/**
 * @type Client
 */
let client;

export async function initialize() {
    logger.info(utils.getFileNameFromUrl(import.meta.url) + ' Initializing ldap connection');
    client = new Client({
        url: getLdapProperties().uri
    });
    await bindLdapIfNeeded();
    logger.info(utils.getFileNameFromUrl(import.meta.url) + ' Ldap connection Initialized');
}

async function bindLdapIfNeeded() {
    if (!client.isConnected) {
        await client.bind(getLdapProperties().adminDn, getLdapProperties().password);
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
        if (error.name !== 'NoSuchObjectError') {
            throw error;
        }
    }
    return user || errors.UserNotFoundError.throw();
}

const modifiableAttributes = [getSmsAttribute(), getMailAttribute()];
const allAttributes = modifiableAttributes.concat("uid");

/**
 * @returns the user, or undefined
 */
async function find_user_internal(uid) {
    /** @type SearchOptions */
    const opts = {
        filter: new EqualityFilter({ attribute: 'uid', value: uid }),
        scope: 'sub',
        attributes: allAttributes
    };

    const { searchEntries } = await getClient().then(client => client.search(getBaseDn(), opts));
    const searchEntry = searchEntries?.[0];

    if (!searchEntry) {
        return;
    }

    const user = Object.fromEntries(
        Object.entries(searchEntry)
            .filter(([key]) => allAttributes.includes(key))
            .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
    );

    return user;
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

export function create_user(uid) {
    const entry = {
        cn: uid,
        uid: uid,
        sn: uid,
        [getMailAttribute()]: uid + '@univ.org',
        [getSmsAttribute()]: '0612345678',
        objectclass: ['inetOrgPerson']
    };
    return getClient().then(client => client.add(getDN(uid), entry));
}

export function remove_user(uid) {
    return getClient().then(client => client.del(getDN(uid)));
}

function getLdapProperties() {
    return properties.getEsupProperty('ldap');
}

function getBaseDn() {
    return getLdapProperties().baseDn;
}

function getTransportProperties() {
    return getLdapProperties().transport;
}

function getSmsAttribute() {
    return getTransportProperties().sms;
}

function getMailAttribute() {
    return getTransportProperties().mail;
}
