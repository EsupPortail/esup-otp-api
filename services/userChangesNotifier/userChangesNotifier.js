import * as transports from '../../transports/transports.js';
import * as userUtils from '../../databases/user/userUtils.js';
import * as properties from '../../properties/properties.js';
import { logger } from '../logger.js';
import * as emailMailContent from './emailMainContent.js';

const mailTransport = "mail";

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
    if (transportChange?.transportName == mailTransport) {
        emailAddress.push(transportChange.oldTransport, transportChange.newTransport);
    } else {
        emailAddress.push(userUtils.getMail(user.userDb));
    }

    return emailAddress.flat(Infinity).filter(Boolean)
}

/**
 * @param {?{transportName: !String, oldTransport: ?String, newTransport: ?String}} transportChange 
 */
async function onChange(user, message, transportChange) {
    const mailer = transports.getTransport(mailTransport);
    const recipients = await getRecipients(user, transportChange);

    if (recipients.length) {
        return mailer.send_message(null, {
            object: "Mise à jours de vos paramètres d'authentification renforcée",
            userTransport: recipients,
            message: message,
        }).catch(err => {
            logger.warn(`error in userChangesNotifier for user ${user.uid} : ${err}`);
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
