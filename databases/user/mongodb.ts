import * as properties from '../../properties/properties.js';
import * as errors from '../../services/errors.js';
import { currentTenantMongodbFilter } from '../../services/multiTenantUtils.js';
import StandardUserData from '../../services/userDb/userData/StandardUserData.ts';
import UserDbAttributes, { type SearchResult } from '../../services/userDb/UserDbAttributes.ts';
import generateMongooseUserSchema from './userSchema.ts';
import type UserDb from "./UserDb.ts";

import * as mongoose from 'mongoose';

type InternalUser = mongoose.Document & Record<string, string>;

export default class MongoUserDb implements UserDb<StandardUserData<InternalUser>> {
    private readonly mongodbProperties = properties.getEsupProperty("mongodb");
    private readonly userDbAttributes = new UserDbAttributes(this.mongodbProperties);

    public readonly modifiableAttributesRecord = this.userDbAttributes.modifiableAttributesRecord;

    private connection: mongoose.Connection;
    private User: mongoose.Model<any>;

    async initialize(dbUrl?: string): Promise<any> {
        this.connection = await mongoose.createConnection(dbUrl || properties.getMongoDbUrl()).asPromise();
        this.User = this.connection.model('User', generateMongooseUserSchema(this.userDbAttributes.attributes), 'User');
    }

    close(): Promise<any> {
        return this.connection?.close();
    }

    async find_user(uid: string): Promise<StandardUserData<InternalUser>> {
        const user = await this.User.findOne({ [this.userDbAttributes.attributes.uid]: uid });

        if (user) {
            return new StandardUserData(user, this.userDbAttributes.attributes);
        } else {
            throw new errors.UserNotFoundError();
        }
    }

    async search_users(token: string, req: any): Promise<SearchResult[]> {
        const regex = new RegExp(token, 'i');

        /** @example [{uid: /token/i}, {displayName: /token/i}] */
        const orConditions = this.userDbAttributes.searchAttributes.map(attr => ({
            [attr]: regex,
        }));

        const brutResult = await this.User.find({
            $and: [
                await currentTenantMongodbFilter(req),
                { $or: orConditions }
            ]
        }).select(this.userDbAttributes.searchAttributes);
        return brutResult.map(result => this.userDbAttributes.standardizeSearchResult(result));
    }

    async create_user(uid: string): Promise<StandardUserData<InternalUser>> {
        const user = new StandardUserData(new this.User({ [this.userDbAttributes.attributes.uid]: uid }), this.userDbAttributes.attributes);
        await this.save_user(user);
        return user;
    }

    async save_user(user: StandardUserData<InternalUser>): Promise<any> {
        await user.internalUser.save()
    }

    async remove_user(uid: string): Promise<any> {
        return this.User.deleteOne({ [this.userDbAttributes.attributes.uid]: uid });
    }
}
