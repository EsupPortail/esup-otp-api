const winston = require('winston');
const properties = require(__dirname + '/../properties/properties');
const logs_config = require(__dirname + '/../logs/logs.json');
const utils = require('./utils');

let filename = __dirname + '/../logs/esup-otp-api-info.log';
if(logs_config.path && logs_config.filename)filename = logs_config.path + logs_config.filename;

const logger = winston.createLogger({
  level: logs_config.level || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, meta }) => {
      let logMessage = `${timestamp} ${level.toUpperCase()} ${message || ''}`;
      if (meta && Object.keys(meta).length > 0) {
        logMessage += `\n\t${JSON.stringify(meta)}`;
      }
      return logMessage;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      level: logs_config.level || 'info',
      filename: filename,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.uncolorize()
      ),
    }),
  ],
});

exports.getInstance= function(){
    return logger;
}