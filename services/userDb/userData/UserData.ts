import { type UserDbAttributesDefinition } from "../UserDbAttributes.ts";

export default abstract class UserData {

    abstract getAttribute(attribute: keyof UserDbAttributesDefinition): string | undefined;

    abstract setAttribute(attribute: Exclude<keyof UserDbAttributesDefinition, "uid">, newValue: string): void;

    getTransport(transport: "sms" | "mail"): string | undefined {
        return this.getAttribute(transport);
    }

    setTransport(transport: "sms" | "mail", newValue: string): void {
        this.setAttribute(transport, newValue);
    }

    getSms(): string | undefined {
        return this.getTransport("sms");
    }

    setSms(newValue: string): void {
        this.setTransport("sms", newValue);
    }

    getMail(): string | undefined {
        return this.getTransport("mail");
    }

    setMail(newValue: string): void {
        this.setTransport("mail", newValue);
    }

    getDisplayName(): string | undefined {
        return this.getAttribute("displayName");
    }

    setDisplayName(newValue: string): void {
        this.setAttribute("displayName", newValue);
    }

    getUid(): string {
        return this.getAttribute("uid") as string;
    }
}
