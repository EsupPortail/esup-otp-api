import type { Message } from "firebase-admin/messaging";

let sent: Message[] = [];

export function initializeApp() {}
export const credential = {
    cert() {}
}

export function messaging() {
    return {
        async send(message: Message, _dryRun?: boolean): Promise<string> {
            sent.push(message);
            return `message-${sent.length}`;
        }
    }
}

export const mock = {
    getSentNotifications(): Message[] {
        return sent;
    },
    reset(): void {
        sent = [];
    }
}
