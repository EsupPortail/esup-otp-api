import * as properties from '../../properties/properties.js';
import * as fileUtils from '../../services/fileUtils.js';
import { UserNotFoundError } from '../../services/errors.js';
import { errorIfMultiTenantContext } from '../../services/multiTenantUtils.js';
import StandardUserData from '../../services/userDb/userData/StandardUserData.ts';
import UserDbAttributes, { type SearchResult } from '../../services/userDb/UserDbAttributes.ts';

import { Client, Change, Attribute, EqualityFilter, SubstringFilter, OrFilter, type SearchOptions, type Entry } from 'ldapts';

import { logger } from '../../services/logger.js';

const ldapProperties = properties.getEsupProperty("ldap");
const userDbAttributes = new UserDbAttributes(ldapProperties);
const { searchAttributes, modifiableAttributes, modifiableAttributesRecord, allAttributes, attributes } = userDbAttributes;

export { modifiableAttributesRecord };

type InternalUser = Record<string, string>;
type LdapEntry = Entry & Record<string, string | string[]>;

let client: Client;

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

export async function find_user(uid: string): Promise<StandardUserData<InternalUser>> {
    let user: InternalUser | undefined;
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


async function find_user_internal(uid: string): Promise<InternalUser | undefined> {
    const opts: SearchOptions = {
        filter: new EqualityFilter({ attribute: attributes.uid, value: uid }),
        scope: 'sub',
        attributes: allAttributes
    };

    const { searchEntries } = await getClient().then(client => client.search(ldapProperties.baseDn, opts));
    const searchEntry = searchEntries?.[0] as LdapEntry | undefined;

    if (!searchEntry) {
        return;
    }

    return parseUser(searchEntry, allAttributes);
}

function parseUser(searchEntry: LdapEntry, attributeList: string[]): InternalUser {
    return Object.fromEntries(
        Object.entries(searchEntry)
            .filter(([key]) => attributeList.includes(key))
            .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
    );
}

export async function search_users(token: string): Promise<SearchResult[]> {
    const opts: SearchOptions = {
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
        .map(searchEntry => parseUser(searchEntry as LdapEntry, searchAttributes))
        .map(result => userDbAttributes.standardizeSearchResult(result));
}

function ldap_change(user: InternalUser): Change[] {
    return Object.entries(user)
        .filter(([attr, _value]) => modifiableAttributes.includes(attr))
        .map(([attr, value]) => new Change({
            operation: 'replace',
            modification: new Attribute({ type: attr, values: [value].filter(Boolean) }),
        }));
}

export function save_user(user: StandardUserData<InternalUser>) {
    const changes = ldap_change(user.internalUser);
    return getClient().then(client => client.modify(getDN(user.getUid()), changes));
}

function getDN(uid: string): string {
    return `${attributes.uid}=${uid},${ldapProperties.baseDn}`;
}

export async function create_user(uid: string): Promise<StandardUserData<InternalUser>> {
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

export async function remove_user(uid: string) {
    const client = await getClient();
    try {
        return await client.del(getDN(uid));
    } catch (error) {
        if (!isNoSuchObjectError(error)) {
            throw error;
        }
    }
}

function isNoSuchObjectError(error: Error) {
    return error?.name == "NoSuchObjectError";
}
