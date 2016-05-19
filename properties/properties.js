var fs = fs = require('fs');

var properties = {};

fs.readdirSync(__dirname).forEach(function (file) {
    var strFile = file.split('.');
    if (strFile[strFile.length - 1] == 'json') {
        properties[file.split('.')[0]] = JSON.parse(fs.readFileSync(__dirname + '/' + file));
    }
})

for (properties_file in properties) {
    exports[properties_file] = properties[properties_file];
}

exports.getMessages = function () {
    return properties.messages;
}

exports.getMessage = function (type, message) {
    return properties.messages[type][message];
}

exports.setMessage = function (type, message, value) {
    properties.messages[type][message] = value;
}

exports.getEsup = function () {
    return properties.esup;
}

exports.setEsup = function (data) {
    properties.esup = data;
}

exports.getEsupProperty = function (property) {
    return properties.esup[property];
}

exports.setEsupProperty = function (property, value) {
    properties.esup[property] = value;
}

exports.getMethod = function (method) {
    return properties.esup.methods[method];
}

exports.getMethodProperty = function (method, property) {
    return properties.esup.methods[method][property];
}

exports.setMethodProperty = function (method, property, value) {
    properties.esup.methods[method][property] = value;
}

exports.addMethodTransport = function (method, transport) {
    var index = properties.esup.methods[method].transports.indexOf(transport);
    if (index < 0) {
        properties.esup.methods[method].transports.push(transport);
    }
}

exports.removeMethodTransport = function (method, transport) {
    var index = properties.esup.methods[method].transports.indexOf(transport);
    if (index >= 0) {
        properties.esup.methods[method].transports.splice(index, 1);
    }
}

exports.getProperties = function () {
    return properties;
}

exports.getProperty = function (property) {
    return properties[property];
}