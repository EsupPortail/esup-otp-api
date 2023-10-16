const winston = require('winston');
const { format } = winston;
const properties = require(__dirname + '/../properties/properties');
const logs_config = require(__dirname + '/../logs/logs.json');
const utils = require('./utils');

let filename = __dirname + '/../logs/esup-otp-api-info.log';
let archiveFilename = __dirname+'/../logs/audit.log';
if(logs_config.path && logs_config.filename)filename = logs_config.path + logs_config.filename;

const logLevels = {
    archive: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    trace: 5,
};
const logger = winston.createLogger({
    levels: logLevels,
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(options => {
            return `${options.timestamp} ${options.level.toUpperCase()} ${undefined !== options.message ? options.message : ''}` +
                (options.meta && Object.keys(options.meta).length ? `\n\t${JSON.stringify(options.meta)}` : '');
        })
    ),
    transports: [
        new winston.transports.Console({
            level: logs_config.level || "info",
        }),
        new winston.transports.File({
            level: 'info',
            filename: filename,
            format: format.combine(
                format((info) => {
                    // Filtrer les messages de niveau "ARCHIVE" pour ne pas les écrire dans le fichier "esup-otp-api-info.log"
                    if (info.level === 'archive') {
                        return false;
                    }
                    return info;
                })(),
                format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                format.printf(options => {
                    return `${options.timestamp} ${options.level.toUpperCase()} ${undefined !== options.message ? options.message : ''}` +
                        (options.meta && Object.keys(options.meta).length ? `\n\t${JSON.stringify(options.meta)}` : '');
                })
            ),
        }),
        new winston.transports.File({
            level: 'archive',
            filename: archiveFilename,
            format: format.combine(
                format.timestamp(),
                format.printf(options => {
                    const messageArray = Array.isArray(options.message) ? options.message : [options.message];
                    return JSON.stringify({
                        timestamp: options.timestamp,
                        message: messageArray,
                        meta: options.meta
                    });
                })
            ),
        }),
    ]
});

exports.getInstance= function(){
    return logger;
}