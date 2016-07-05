var winston = require('winston');
var properties = require(__dirname + '/../properties/properties');
var utils = require('./utils');

var info_filename = __dirname+'/../esup-otp-api-info.log';
if(properties.getEsupProperty('logs').path && properties.getEsupProperty('logs').info_filename)info_filename = __dirname+properties.getEsupProperty('logs').path+properties.getEsupProperty('logs').info_filename;
var debug_filename = __dirname+'/../esup-otp-api-debug.log';
if(properties.getEsupProperty('logs').path && properties.getEsupProperty('logs').path)debug_filename = __dirname+properties.getEsupProperty('logs').path+properties.getEsupProperty('logs').debug_filename;

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            timestamp: function() {
                return new Date(Date.now());
            },
            formatter: function(options) {
                // Return string will be passed to logger.
                return options.timestamp() +' '+ options.level.toUpperCase() +' '+ (undefined !== options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
            }
        }),
        new (winston.transports.File)({
            timestamp: function() {
                return ''+new Date(Date.now());
            },
            name: 'info-file',
            filename: info_filename,
            json: false,
            formatter: function(options) {
                // Return string will be passed to logger.
                return options.timestamp() +' '+ options.level.toUpperCase() +' '+ (undefined !== options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
            }
        }),
        new (winston.transports.File)({
            timestamp: function() {
                return ''+new Date(Date.now());
            },
            name: 'debug-file',
            level: 'debug',
            filename: debug_filename,
            json: false,
            formatter: function(options) {
                // Return string will be passed to logger.
                return options.timestamp() +' '+ options.level.toUpperCase() +' '+ (undefined !== options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
            }
        })
    ]
});

exports.getInstance= function(){
    return logger;
}