import * as properties from '../../properties/properties.js';

/**
 * @returns {{transport: {mail: String, sms: String}, displayName: String}}
 */
export function getUserDbProperties() {
    return properties.getEsupProperty(properties.getEsupProperty('userDb'));
}

export function getTransport(user, transport) {
    return user[attributes[transport]];
}

export function setTransport(user, transport, newValue) {
    user[attributes[transport]] = newValue;
}

export function getSms(user) {
    return user[attributes.sms];
}

export function setSms(user, newValue) {
    user[attributes.sms] = newValue;
}

export function getMail(user) {
    return user[attributes.mail];
}

export function setMail(user, newValue) {
    user[attributes.mail] = newValue;
}

export function getDisplayName(user) {
    return user[attributes.displayName];
}

export function setDisplayName(user, newValue) {
    user[attributes.displayName] = newValue;
}

// internal representation to external database attribute mappings
export const attributes = {
    uid: getUserDbProperties().uid || "uid",
    sms: getUserDbProperties().transport.sms,
    mail: getUserDbProperties().transport.mail,
    displayName: getUserDbProperties().displayName,
}

for (const attr in attributes) {
    if (!attributes[attr]) {
        delete attributes[attr];
    }
}

// external database to internal representation attribute mappings
attributesFlipped = flip(attributes);

export const searchAttributes = filterAttributes([attributes.uid, attributes.displayName]);

export const modifiableAttributes = filterAttributes([attributes.mail, attributes.sms, attributes.displayName]);
export const allAttributes = filterAttributes(Object.values(attributes));

function filterAttributes(attributes) {
    return attributes.filter(attr => attr);
}

function flip(object) {
    return Object.fromEntries(
        Object
        .entries(object)
        .map(([key, value]) => [value, key])
    );
}
