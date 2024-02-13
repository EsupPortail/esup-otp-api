import restify from 'restify';
import errors from 'restify-errors';
import corsMiddleware from "restify-cors-middleware2";
import { promisify } from 'util';

import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import * as sockets from './sockets.js';
import * as userDb_controller from '../controllers/user.js';
import * as api_controller from '../controllers/api.js';
import * as routes from '../server/routes.js';

import packageJson from '../package.json' assert { type: 'json' };
export const version = packageJson.version;

import { getInstance } from '../services/logger.js'; const logger = getInstance();

export const server = restify.createServer({
    name: 'esup-otp',
    version: version,
    // accept all options of https://github.com/delvedor/find-my-way/#api
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true,
    maxParamLength: 250,
});

server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser({ mapParams: true }));
server.use(restify.plugins.bodyParser({ mapParams: true }));

//CORS middleware
const cors = corsMiddleware({
    origins: ["*"],
    allowHeaders: ["X-Requested-With"],
});
server.pre(cors.preflight);
server.use(cors.actual);

server.use(
    function logRequestUrl(req, res, next) {
        logger.debug(req.url);
        return next();
    }
);

server.on('restifyError', (req, res, err, callback) => {
    if (err instanceof errors.HttpError) { // e.g.: 404 error, or errors difined in ../services/errors.js
        if (err.message !== '/ does not exist') {
            logger.info('HttpError: ' + err);
        }
    } else {
        logger.error(err.stack);
    }

    return callback();
});

export function initialize_userDBController() {
    logger.info(utils.getFileNameFromUrl(import.meta.url) + ' Initializing the userDB controller');
    return userDb_controller.initialize();
}

export function initialize_apiController() {
    logger.info(utils.getFileNameFromUrl(import.meta.url) + ' Initializing the api controller');
    return api_controller.initialize();
}

export function initialize_routes() {
    return routes.initialize(server, version);
}

export async function launch_server(port) {
    await promisify(server.listen).call(server, port);
}

export async function attach_socket() {
    sockets.attach(server);
}

export async function start() {
    await initialize_userDBController();
    await initialize_apiController();
    await initialize_routes();
    await launch_server(process.env.PORT || 3000);
    await attach_socket();
    logger.info(utils.getFileNameFromUrl(import.meta.url) + ' App is ready at : ' + server.address().port);
}
