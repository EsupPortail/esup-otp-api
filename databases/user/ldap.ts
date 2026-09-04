import * as properties from '../../properties/properties.js';
import * as fileUtils from '../../services/fileUtils.js';
import { UserNotFoundError } from '../../services/errors.js';
import { errorIfMultiTenantContext } from '../../services/multiTenantUtils.js';
import StandardUserData from '../../services/userDb/userData/StandardUserData.ts';
import UserDbAttributes, { type SearchResult } from '../../services/userDb/UserDbAttributes.ts';
import type UserDb from "./UserDb.ts";

import { Client, Change, Attribute, EqualityFilter, SubstringFilter, OrFilter, type SearchOptions, type Entry } from 'ldapts';

import { logger } from '../../services/logger.js';


type InternalUser = Record<string, string>;
type LdapEntry = Entry & Record<string, string | string[]>;

export default class LdapUserDb implements UserDb<StandardUserData<InternalUser>> {
    private readonly ldapProperties = properties.getEsupProperty("ldap");
    private readonly userDbAttributes = new UserDbAttributes(this.ldapProperties);

    public readonly modifiableAttributesRecord = this.userDbAttributes.modifiableAttributesRecord;

    private client: Client;

    async initialize(): Promise<any> {
        errorIfMultiTenantContext();

        logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' Initializing ldap connection');
        this.client = new Client({
            url: this.ldapProperties.uri,
            timeout: this.ldapProperties.timeout,
            connectTimeout: this.ldapProperties.connectTimeout,
            autoRebind: true,
        });
        await this.client.bind(this.ldapProperties.adminDn, this.ldapProperties.password)
        logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' Ldap connection Initialized');
    }

    close(): Promise<any> {
        return this.client?.unbind();
    }

    async find_user(uid: string): Promise<StandardUserData<InternalUser>> {
        let user: InternalUser | undefined;
        try {
            user = await this.find_user_internal(uid);
        } catch (error) {
            if (!LdapUserDb.isNoSuchObjectError(error)) {
                throw error;
            }
        }
        if (user) {
            return new StandardUserData(user, this.userDbAttributes.attributes);
        } else {
            throw new UserNotFoundError();
        }
    }

    private async find_user_internal(uid: string): Promise<InternalUser | undefined> {
        const opts: SearchOptions = {
            filter: new EqualityFilter({ attribute: this.userDbAttributes.attributes.uid, value: uid }),
            scope: 'sub',
            attributes: this.userDbAttributes.allAttributes
        };

        const { searchEntries } = await this.client.search(this.ldapProperties.baseDn, opts);
        const searchEntry = searchEntries?.[0] as LdapEntry | undefined;

        if (!searchEntry) {
            return;
        }

        return LdapUserDb.parseUser(searchEntry, this.userDbAttributes.allAttributes);
    }

    private static parseUser(searchEntry: LdapEntry, attributeList: string[]): InternalUser {
        return Object.fromEntries(
            Object.entries(searchEntry)
                .filter(([key]) => attributeList.includes(key))
                .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
        );
    }

    async search_users(token: string): Promise<SearchResult[]> {
        const opts: SearchOptions = {
            filter: new OrFilter({ // (|(uid=*token*)(displayName=*token*))
                filters: this.userDbAttributes.searchAttributes.map(attr => new SubstringFilter({
                    attribute: attr,
                    any: [token],
                }))
            }),
            scope: 'sub',
            attributes: this.userDbAttributes.searchAttributes,
        };

        const { searchEntries } = await this.client.search(this.ldapProperties.baseDn, opts);
        return searchEntries
            .map(searchEntry => LdapUserDb.parseUser(searchEntry as LdapEntry, this.userDbAttributes.searchAttributes))
            .map(result => this.userDbAttributes.standardizeSearchResult(result));
    }

    private ldap_change(user: InternalUser): Change[] {
        return Object.entries(user)
            .filter(([attr, _value]) => this.userDbAttributes.modifiableAttributes.includes(attr))
            .map(([attr, value]) => new Change({
                operation: 'replace',
                modification: new Attribute({ type: attr, values: [value].filter(Boolean) }),
            }));
    }

    save_user(user: StandardUserData<InternalUser>): Promise<any> {
        const changes = this.ldap_change(user.internalUser);
        return this.client.modify(this.getDN(user.getUid()), changes);
    }

    private getDN(uid: string): string {
        return `${this.userDbAttributes.attributes.uid}=${uid},${this.ldapProperties.baseDn}`;
    }

    async create_user(uid: string): Promise<StandardUserData<InternalUser>> {
        const entry = {
            cn: uid,
            [this.userDbAttributes.attributes.uid]: uid,
            sn: uid,
            objectclass: ['inetOrgPerson']
        };
        await this.client.add(this.getDN(uid), entry);
        return this.find_user(uid);
    }

    async remove_user(uid: string) {
        try {
            return await this.client.del(this.getDN(uid));
        } catch (error) {
            if (!LdapUserDb.isNoSuchObjectError(error)) {
                throw error;
            }
        }
    }

    private static isNoSuchObjectError(error: Error) {
        return error?.name == "NoSuchObjectError";
    }
}
