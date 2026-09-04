import type UserData from '../../services/userDb/userData/UserData.ts';
import type { SearchResult } from '../../services/userDb/UserDbAttributes.ts';

export default interface UserDb<TUserData extends UserData> {
    readonly modifiableAttributesRecord: Record<string, string>;
    initialize(): Promise<any>;
    close(): Promise<any>;
    find_user(uid: string): Promise<TUserData>;
    search_users(token: string, req: any): Promise<SearchResult[]>;
    save_user(user: TUserData): Promise<any>;
    create_user(uid: string): Promise<TUserData>;
    remove_user(uid: string): Promise<any>;
}

export async function initializeUserDb<TUserData extends UserData>(userDbName: string): Promise<UserDb<TUserData>> {
    if (userDbName) {
        const { default: UserDbImpl } = await import('./' + userDbName + '.ts');
        const userDb: UserDb<any> = new UserDbImpl();
        await userDb.initialize();
        return userDb;
    } else {
        throw new Error('Unknown userDb');
    }
}
