import * as properties from '../../properties/properties.js';
import * as errors from '../../services/errors.js';
import { errorIfMultiTenantContext } from '../../services/multiTenantUtils.js';
import StandardUserData from '../../services/userDb/userData/StandardUserData.ts';
import UserDbAttributes, { type UserDbProperties, type SearchResult } from '../../services/userDb/UserDbAttributes.ts';
import type UserDb from "./UserDb.ts";

import * as mysql from 'mysql2/promise';

type InternalUser = Record<string, string>;

export default class MongoUserDb implements UserDb<StandardUserData<InternalUser>> {
    private readonly mysqlProperties: mysql.ConnectionOptions & UserDbProperties & { userTable: string } = properties.getEsupProperty("mysql");
    private readonly userDbAttributes = new UserDbAttributes(this.mysqlProperties);

    public readonly modifiableAttributesRecord = this.userDbAttributes.modifiableAttributesRecord;

    private connection: mysql.Connection;

    async initialize(): Promise<any> {
        errorIfMultiTenantContext();
        this.mysqlProperties.namedPlaceholders = true;
        // because "Ignoring invalid configuration option passed to Connection: [displayName, userTable,transport] . This is currently a warning, but in future versions of MySQL2, an error will be thrown if you pass an invalid configuration option to a Connection"
        // eslint-disable-next-line no-unused-vars
        const { userTable, transport, displayName, ...connectionOptions } = this.mysqlProperties;
        this.connection = await mysql.createConnection(connectionOptions);
    }

    close(): Promise<any> {
        return this.connection?.end();
    }

    private readonly selectQuery = `Select ${this.userDbAttributes.allAttributes.join(", ")} From ${this.mysqlProperties.userTable} u Where u.${this.userDbAttributes.attributes.uid} = :uid`;

    async find_user(uid: string): Promise<StandardUserData<InternalUser>> {
        return new StandardUserData(await this.find_user_internal(uid), this.userDbAttributes.attributes);
    }

    private async find_user_internal(uid: string): Promise<InternalUser> {
        const [rows, _fields] = await this.connection.execute(this.selectQuery, { uid: uid });
        const user = rows[0];
        return user || errors.UserNotFoundError.throw();
    }

    private readonly searchQuery = `Select ${this.userDbAttributes.searchAttributes.join(", ")} From ${this.mysqlProperties.userTable} Where ${this.userDbAttributes.searchAttributes.map(attr => `LOWER(${attr}) LIKE :token`).join(" OR ")}`;

    async search_users(token: string): Promise<SearchResult[]> {
        token = token.toLowerCase();
        const [rows, _fields] = await this.connection.execute(this.searchQuery, { token: `%${token}%` });
        const result = rows as Record<string, string>[];
        return result.map(result => this.userDbAttributes.standardizeSearchResult(result));
    }

    async save_user(user: StandardUserData<InternalUser>): Promise<any> {
        const oldUser = await this.find_user(user.getUid());
        if (oldUser) {
            const updatedAttributes = this.userDbAttributes.modifiableAttributes.filter(attr => oldUser[attr] != user.internalUser[attr]);
            if (updatedAttributes.length) {
                /** @example "sms = :sms , mail = :mail" */
                const set = updatedAttributes.map(attr => `${attr} = :${attr}`).join(", ");
                const updateQuery = `Update ${this.mysqlProperties.userTable} SET ${set} Where ${this.userDbAttributes.attributes.uid} = :${this.userDbAttributes.attributes.uid}`;
                await this.connection.execute(updateQuery, user.internalUser);
            }
        }
    }

    private readonly insertQuery = `INSERT INTO ${this.mysqlProperties.userTable} (${this.userDbAttributes.attributes.uid}) VALUES (:uid)`;

    async create_user(uid: string): Promise<StandardUserData<InternalUser>> {
        await this.connection.execute(this.insertQuery, { uid: uid })
        return this.find_user(uid);
    }

    private readonly deleteQuery = `DELETE FROM ${this.mysqlProperties.userTable} WHERE ${this.userDbAttributes.attributes.uid} = :uid`;

    remove_user(uid: string) {
        return this.connection.execute(this.deleteQuery, { uid: uid });
    }
}

