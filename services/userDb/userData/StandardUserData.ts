import { type UserDbAttributesDefinition } from "../UserDbAttributes.ts";
import UserData from "./UserData.ts";

export default class StandardUserData<InternalUser> extends UserData {
    readonly internalUser: InternalUser;
    private readonly userDbAttributesDefinition: UserDbAttributesDefinition;

    constructor(internalUser: InternalUser, userDbAttributesDefinition: UserDbAttributesDefinition) {
        super();
        this.internalUser = internalUser;
        this.userDbAttributesDefinition = userDbAttributesDefinition;
    }

    getAttribute(attribute: keyof UserDbAttributesDefinition): string | undefined {
        return this.internalUser[this.userDbAttributesDefinition[attribute] as string];
    }

    setAttribute(attribute: Exclude<keyof UserDbAttributesDefinition, "uid">, newValue: string): void {
        this.internalUser[this.userDbAttributesDefinition[attribute] as string] = newValue;
    }
}
