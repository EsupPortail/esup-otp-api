import * as fileUtils from '../services/fileUtils.js';
import fs from 'fs';

const properties = {};

const __dirname = fileUtils.__dirname(import.meta.url);

fs.readdirSync(__dirname).forEach(function(file) {
    loadFile(__dirname, file);
})

export function loadFile(dirname, filename) {
    const strFile = filename.split('.');
    if (strFile[strFile.length - 1] == 'json') {
        const jsonFile = fileUtils.readJsonSync(dirname + '/' + filename);
        cleanComments(jsonFile);
        if (filename == "esup.json") {
            sortMethods(jsonFile);
        }
        properties[strFile[0]] = jsonFile;
        return jsonFile;
    }
}

function cleanComments(obj) {
    if (Array.isArray(obj)) {
        obj.forEach(cleanComments);
    } else if (obj !== null && typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
            if (key.startsWith('#')) {
                delete obj[key];
            } else {
                cleanComments(obj[key]);
            }
        }
    }
}

function sortMethods(esup) {
    esup.methods = Object.fromEntries(
        Object.entries(esup.methods)
            .sort((a, b) => getPriority(b) - getPriority(a))
    );
}

function getPriority(entry) {
    return entry[1].priority ?? 5;
}

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
export function getTransports(method) {
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

export function getMongoDbUrl() {
    const { address, db, uri } = getEsupProperty('mongodb');
    if(address) {
        return 'mongodb://' + [address, db].filter(Boolean).join('/');
    } else {
        return uri;
    }
}
