export default class UserDbAttributes {
    readonly userDbProperties: UserDbProperties;
    readonly attributes: UserDbAttributesDefinition;
    readonly searchAttributes: string[];
    readonly modifiableAttributesRecord: Record<string, string>;
    readonly modifiableAttributes: string[];
    readonly allAttributes: string[];

    constructor(userDbProperties: UserDbProperties) {
        this.userDbProperties = userDbProperties;
        this.attributes = {
            uid: this.userDbProperties.uid || "uid",
            sms: this.userDbProperties.transport.sms,
            mail: this.userDbProperties.transport.mail,
            displayName: this.userDbProperties.displayName,
        }
        this.searchAttributes = UserDbAttributes.filterAttributes([this.attributes.uid, this.attributes.displayName]);
        this.modifiableAttributesRecord = Object.fromEntries(
            ["mail", "sms", "displayName"]
                .map(key => [key, this.attributes[key]])
                .filter(([_k, v]) => v)
        );
        this.modifiableAttributes = Object.values(this.modifiableAttributesRecord);
        this.allAttributes = UserDbAttributes.filterAttributes(Object.values(this.attributes));
    }

    standardizeSearchResult(brutResult: Record<string, string>): SearchResult {
        return {
            uid: brutResult[this.attributes.uid],
            displayName: brutResult[this.attributes.displayName || ""],
        };
    }

    private static filterAttributes(attributes: (string | undefined)[]): string[] {
        return attributes.filter(attr => attr) as string[];
    }
}

export type SearchResult = {
    uid: string;
    displayName: string | undefined;
}

export type UserDbAttributesDefinition = {
    readonly uid: string;
    sms: string | undefined;
    mail: string | undefined;
    displayName: string | undefined;
}

export type UserDbProperties = {
    uid: string | undefined,
    displayName: string | undefined,
    transport: {
        sms: string | undefined,
        mail: string | undefined
    }
}
