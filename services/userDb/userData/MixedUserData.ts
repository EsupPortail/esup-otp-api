import { type UserDbAttributesDefinition } from "../UserDbAttributes.ts";
import UserData from "./UserData.ts";

export default class ProxyUserData<ReadOnlyUserData extends UserData, ReadWriteUserData extends UserData> extends UserData {
    readonly readOnlyUserData: ReadOnlyUserData;
    readonly readWriteUserData: ReadWriteUserData;

    constructor(readOnlyUserData: ReadOnlyUserData, readWriteUserData: ReadWriteUserData) {
        super();
        this.readOnlyUserData = readOnlyUserData;
        this.readWriteUserData = readWriteUserData;
    }

    getAttribute(attribute: keyof UserDbAttributesDefinition): string | undefined {
        return this.readWriteUserData.getAttribute(attribute) || this.readOnlyUserData.getAttribute(attribute);
    }

    setAttribute(attribute: Exclude<keyof UserDbAttributesDefinition, "uid">, newValue: string): void {
        this.readWriteUserData.setAttribute(attribute, newValue);
    }
}
