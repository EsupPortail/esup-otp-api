var winston = require('winston');
var properties = require(__dirname + '/../properties/properties');
var logs_config = require(__dirname + '/../logs/logs.json');
var utils = require('./utils');

var filename = __dirname+'/../logs/esup-otp-api-info.log';
if(logs_config.path && logs_config.filename)filename = logs_config.path + logs_config.filename;

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            timestamp: function() {
                return new Date(Date.now());
            },
            level: logs_config.level || "info",
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
            name: 'log-file',
            level: logs_config.level || "info",
            filename: filename,
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