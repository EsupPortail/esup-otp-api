import winston, { format } from 'winston';
import { getIpAddr } from '../services/utils.js';
import * as properties from '../properties/properties.js';
import fs from 'fs';

const logProperties = properties.getEsupProperty('logs');

// main logger
export const logger = winston.createLogger({
    level: logProperties.main?.level || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(options => {
            return `${options.timestamp} ${options.level.toUpperCase()} ${undefined !== options.message ? options.message : ''}` +
                (options.meta && Object.keys(options.meta).length ? `\n\t${JSON.stringify(options.meta)}` : '');
        })
    ),
    handleRejections: true,
    handleExceptions: true,
});

if (logProperties.main?.console) {
    logger.add(new winston.transports.Console());
}

if (logProperties.main?.file) {
    logger.add(new winston.transports.File({ filename: logProperties.main?.file }));
}

// auddit logger
export const auditLogger = winston.createLogger({
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
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
                    if (req.params.method) {
                        message.method ||= req.params.method;
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
});

if (logProperties.audit?.console) {
    auditLogger.add(new winston.transports.Console());
}

if (logProperties.audit?.file) {
    auditLogger.add(new winston.transports.File({ filename: logProperties.audit?.file }));
}

if (fs.existsSync('logs/logs.json')) {
    logger.error("logs are no longer configured in logs/logs.json, see CONFIGURATION.md for details");
}
