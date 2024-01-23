import fs from 'fs';
import * as utils from '../services/utils.js';

const properties = {};

const __dirname = utils.__dirname(import.meta.url);

fs.readdirSync(__dirname).forEach(function (file) {
    const strFile = file.split('.');
    if (strFile[strFile.length - 1] == 'json') {
        properties[file.split('.')[0]] = JSON.parse(fs.readFileSync(__dirname + '/' + file));
    }
})

export function getMessages () {
    return properties.messages;
}

export function getMessage (type, message) {
    return properties.messages[type][message];
}

export function setMessage (type, message, value) {
    properties.messages[type][message] = value;
}

export function getEsup () {
    return properties.esup;
}

export function setEsup (data) {
    properties.esup = data;
}

export function getEsupProperty (property) {
    return properties.esup[property];
}

export function setEsupProperty (property, value) {
    properties.esup[property] = value;
}

export function getMethod (method) {
    return properties.esup.methods[method];
}

export function getMethodProperty (method, property) {
    return properties.esup.methods[method]?.[property];
}

export function setMethodProperty (method, property, value) {
    properties.esup.methods[method][property] = value;
}

/** @returns {Array<String>} */
function getTransports(method) {
    return getMethodProperty(method, 'transports');
}

function setTransports(method, transports) {
    setMethodProperty(method, 'transports', transports);
}

export function containsMethodTransport(method, transport) {
    return getTransports(method).includes(transport);
}

export function addMethodTransport(method, transport) {
    if (!containsMethodTransport(method, transport)) {
        getTransports(method).push(transport);
    }
}

export function removeMethodTransport(method, transport) {
    if (containsMethodTransport(method, transport)) {
        const newTransports = getTransports(method).filter(t => t != transport);
        setTransports(method, newTransports);
    }
}

export function getProperties () {
    return properties;
}

export function getProperty (property) {
    return properties[property];
}