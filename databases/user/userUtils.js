import * as properties from '../../properties/properties.js';

export function getUserDbProperties() {
    return properties.getEsupProperty(properties.getEsupProperty('userDb'));
}

export function getTransport(user, transport) {
    return user[getUserDbProperties().transport[transport]];
}

export function setTransport(user, transport, newValue) {
    user[getUserDbProperties().transport[transport]] = newValue;
}

export function getSms(user) {
    return getTransport(user, "sms");
}

export function setSms(user, newValue) {
    setTransport(user, "sms", newValue);
}

export function getMail(user) {
    return getTransport(user, "mail");
}

export function setMail(user, newValue) {
    setTransport(user, "mail", newValue);
}