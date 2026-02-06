import * as userUtils from '../../databases/user/userUtils.js';
import * as properties from '../../properties/properties.js';
import { logger } from '../logger.js';
import { distinct } from "../utils.js";
import * as emailMailContent from './emailMainContent.js';
import { send_email } from './mailer.js';

const userChangesNotifierProperties = properties.getEsupProperty("userChangesNotifier") || {};

export const { enabled } = userChangesNotifierProperties;
const { emailAddressProvider } = userChangesNotifierProperties;

/** @type {typeof import("./getEmailAddressFromUser.js").getEmailAddress} */
let getEmailAddress;
if (emailAddressProvider) {
    ({ getEmailAddress } = await import(`./${emailAddressProvider}.js`))
} else {
    getEmailAddress = async function(_user) {
        return null;
    }
}

export async function notifyIfNeeded(user) {
    const changes = properties.listActivatedMethods()
        .map(method => [method, user[method]])
        .filter(([_method, userMethod]) => userMethod.active != userMethod.previousActiveState)
        .map(([method, userMethod]) => [method, userMethod.active]);

    if (changes.length) {
        await onUserMethodChange(user, changes);
        noteCurrentActiveState(user);
    }
}

export function noteCurrentActiveState(user) {
    properties.listActivatedMethods()
        .forEach(method => {
            const userMethod = user[method];
            if (userMethod) {
                userMethod.previousActiveState = userMethod.active;
            }
        });
}

/**
 * @param {?{transportName: !String, oldTransport: ?String, newTransport: ?String}} transportChange 
 * @returns { Promise <String[]> }
 */
async function getRecipients(user, transportChange) {
    const emailAddress = [
        await getEmailAddress(user)
            .catch(err => {
                logger.warn(`error in ${emailAddressProvider} for user ${user.uid} : ${err}`);
            })
    ];
    if (transportChange?.transportName == "mail") {
        emailAddress.push(transportChange.oldTransport, transportChange.newTransport);
    } else {
        emailAddress.push(userUtils.getMail(user.userDb));
    }

    return distinct(emailAddress.flat(Infinity).filter(Boolean));
}

/**
 * @param {?{transportName: !String, oldTransport: ?String, newTransport: ?String}} transportChange 
 */
async function onChange(user, message, transportChange) {
    const recipients = await getRecipients(user, transportChange);

    if (recipients.length) {
        return send_email({
            recipients,
            subject: "Mise à jours de vos paramètres d'authentification renforcée",
            mainContent: message,
            user,
        }).then(() => {
            logger.info("userChangesNotification sent to " + recipients + " with the message: " + message);
        }).catch(err => {
            logger.error(`error in userChangesNotifier for user ${user.uid} : ${err}`);
        });
    }
}

/**
 * @param {[[String, Boolean]]} changes 
 */
export async function onUserMethodChange(user, changes) {
    if (!enabled) {
        return;
    }
    // If method activation/deactivation results from adding or removing the phone number, an email has already been sent in the onUserTransportChange() function.
    if (user.changesNotified) {
        return;
    }
    const message = await emailMailContent.onUserMethodChange(user, changes);

    if (message) {
        return onChange(user, message)
    }
}

export async function onUserTransportChange(user, transportName, oldTransport, newTransport) {
    if (!enabled) {
        return;
    }
    const message = await emailMailContent.onUserTransportChange(user, transportName, oldTransport, newTransport);

    if (!message) {
        return;
    }
    user.changesNotified = true;
    return onChange(user, message, { transportName, oldTransport, newTransport });
}
