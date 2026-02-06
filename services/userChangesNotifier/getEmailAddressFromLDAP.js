import { Client, EqualityFilter } from 'ldapts';

import { attributes } from '../../databases/user/userUtils.js';
import * as properties from '../../properties/properties.js';
const ldapProperties = properties.getEsupProperty("ldap") || {};
const userChangesNotifierLdapProperties = properties.getEsupProperty("userChangesNotifier")?.getEmailAddressFromLDAP || {};

const uri            = userChangesNotifierLdapProperties.uri            || ldapProperties.uri;
const adminDn        = userChangesNotifierLdapProperties.adminDn        || ldapProperties.adminDn;
const password       = userChangesNotifierLdapProperties.password       || ldapProperties.password;
const baseDn         = userChangesNotifierLdapProperties.baseDn         || ldapProperties.baseDn;
const uidAttribute   = userChangesNotifierLdapProperties.uidAttribute   || attributes.uid;
const mailAttributes = userChangesNotifierLdapProperties.mailAttributes || ["mail", "supannMailPerso"];
const timeout        = userChangesNotifierLdapProperties.timeout        ?? ldapProperties.timeout;
const connectTimeout = userChangesNotifierLdapProperties.connectTimeout ?? ldapProperties.connectTimeout;

const client = new Client({
    url: uri,
    timeout: timeout,
    connectTimeout: connectTimeout,
});

/**
 * @returns { Promise <? String | String[] > }
 */
export async function getEmailAddress(user) {
    if (!client.isConnected) {
        await client.bind(adminDn, password);
    }
    const { searchEntries } = await client.search(baseDn, {
        filter: new EqualityFilter({ attribute: uidAttribute, value: user.uid }),
        scope: 'sub',
        attributes: mailAttributes,
    });
    const searchEntry = searchEntries?.[0];
    if (!searchEntry) {
        return;
    }
    return mailAttributes.flatMap(attr => searchEntry[attr]);
}
