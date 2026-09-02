export default class UserDbAttributes {
    readonly userDbProperties: { uid: string, displayName: string | undefined, transport: { sms: string | undefined, mail: string | undefined } };
    readonly attributes: UserDbAttributesDefinition;
    readonly searchAttributes: string[];
    readonly modifiableAttributesRecord: Record<string, string>;
    readonly modifiableAttributes: string[];
    readonly allAttributes: string[];

    constructor(userDbProperties: any) {
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

    standardizeSearchResults(brutResult: Record<string, string>): { uid: string, displayName: string | undefined } {
        return {
            uid: brutResult[this.userDbProperties.uid],
            displayName: brutResult[this.userDbProperties.displayName || ""],
        };
    }

    private static filterAttributes(attributes: (string | undefined)[]): string[] {
        return attributes.filter(attr => attr) as string[];
    }
}

export interface UserDbAttributesDefinition {
    readonly uid: string;
    sms: string | undefined;
    mail: string | undefined;
    displayName: string | undefined;
}

export interface userDbProperties {
    uid: string | undefined,
    displayName: string | undefined,
    transport: {
        sms: string | undefined,
        mail: string | undefined
    }
}
