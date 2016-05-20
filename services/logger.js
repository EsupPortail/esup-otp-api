var winston = require('winston');
var utils = require('./utils');
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
            filename: __dirname+'/../logs/server.log',
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
            filename: __dirname+'/../logs/debug.log',
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