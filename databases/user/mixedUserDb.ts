import MixedUserData from '../../services/userDb/userData/MixedUserData.ts';
import * as properties from '../../properties/properties.js';
import type UserDb from "./UserDb.ts";
import { initializeUserDb } from "./UserDb.ts";
import { type SearchResult } from '../../services/userDb/UserDbAttributes.ts';
import UserData from '../../services/userDb/userData/UserData.ts';

export default class MixedUserDb<ReadOnlyUserData extends UserData, ReadWriteUserData extends UserData> implements UserDb<MixedUserData<ReadOnlyUserData, ReadWriteUserData>> {
    private readonly mixedUserDbProperties = properties.getEsupProperty("mixedUserDb");

    public modifiableAttributesRecord: Record<string, string>;

    private readOnlyUserDb: UserDb<ReadOnlyUserData>;
    private readWriteUserDb: UserDb<ReadWriteUserData>;

    async initialize(): Promise<any> {
        await Promise.all([
            this.initializeReadOnlyUserDb(),
            this.initializeReadWriteUserDb(),
        ]);
        this.modifiableAttributesRecord = this.readWriteUserDb.modifiableAttributesRecord;
    }

    private async initializeReadOnlyUserDb(): Promise<any> {
        this.readOnlyUserDb = await initializeUserDb(this.mixedUserDbProperties.readOnly);
    }

    private async initializeReadWriteUserDb(): Promise<any> {
        this.readWriteUserDb = await initializeUserDb(this.mixedUserDbProperties.readWrite);
    }

    close(): Promise<any> {
        return Promise.all([
            this.readOnlyUserDb.close(),
            this.readWriteUserDb.close(),
        ]);
    }

    async find_user(uid: string): Promise<MixedUserData<ReadOnlyUserData, ReadWriteUserData>> {
        const [readOnlyUserData, readWriteUserData] = await Promise.all([
            this.readOnlyUserDb.find_user(uid),
            this.readWriteUserDb.find_user(uid),
        ]);
        return new MixedUserData(readOnlyUserData, readWriteUserData);
    }

    search_users(token: string, req: any): Promise<SearchResult[]> {
        return this.readOnlyUserDb.search_users(token, req);
    }

    async create_user(uid: string): Promise<MixedUserData<ReadOnlyUserData, ReadWriteUserData>> {
        const [readOnlyUserData, readWriteUserData] = await Promise.all([
            this.readOnlyUserDb.create_user(uid),
            this.readWriteUserDb.create_user(uid),
        ]);
        return new MixedUserData(readOnlyUserData, readWriteUserData);
    }

    save_user(user: MixedUserData<ReadOnlyUserData, ReadWriteUserData>): Promise<any> {
        return Promise.all([
            this.readOnlyUserDb.save_user(user.readOnlyUserData),
            this.readWriteUserDb.save_user(user.readWriteUserData),
        ]);
    }

    remove_user(uid: string): Promise<any> {
        return Promise.all([
            this.readOnlyUserDb.remove_user(uid),
            this.readWriteUserDb.remove_user(uid),
        ]);
    }
}
