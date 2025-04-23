import winston, { format } from 'winston';
import * as fileUtils from '../services/fileUtils.js';
import { getIpAddr } from '../services/utils.js';
import * as properties from '../properties/properties.js';

const logs_config = properties.loadFile(fileUtils.relativeToAbsolutePath(import.meta.url, '../logs'), "logs.json");
//import logs_config from '../logs/logs.json' with { "type": "json" };

import * as path from 'node:path';

const mainLogFile = path.join(logs_config.path, logs_config.filename);
const archiveLogFile = path.join(logs_config.path, logs_config.archiveFileName);

console.log("log path:", path.resolve(mainLogFile));
console.log("archive path:", path.resolve(archiveLogFile));

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
            filename: mainLogFile,
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
            filename: archiveLogFile,
            format: format.combine(
                format.timestamp(),
                format.printf(options => {
                    const messageArray = Array.isArray(options.message) ? options.message : [options.message];
                    for (const message of messageArray) {
                        const req = message.req;
                        if (req) {
                            delete message.req;
                            message.uid ||= req.params.uid;
                            message.requestIp ||= getIpAddr(req);
                            const clientIp = req.header('x-client-ip');
                            if (clientIp) {
                                message.clientIp ||= clientIp;
                            }
                            message.userAgent ||= req.header('user-agent');
                            const clientUserAgent = req.header('client-user-agent')
                            if (clientUserAgent) {
                                message.clientUserAgent ||= clientUserAgent;
                            }
                            if (req.query.managerUser) {
                                message.managerUser ||= req.query.managerUser;
                            }
                        }
                    }

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

export function getInstance(){
    return logger;
}