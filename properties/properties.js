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
    return properties.esup.methods[method][property];
}

export function setMethodProperty (method, property, value) {
    properties.esup.methods[method][property] = value;
}

export function addMethodTransport (method, transport) {
    const index = properties.esup.methods[method].transports.indexOf(transport);
    if (index < 0) {
        properties.esup.methods[method].transports.push(transport);
    }
}

export function removeMethodTransport (method, transport) {
    const index = properties.esup.methods[method].transports.indexOf(transport);
    if (index >= 0) {
        properties.esup.methods[method].transports.splice(index, 1);
    }
}

export function getProperties () {
    return properties;
}

export function getProperty (property) {
    return properties[property];
}