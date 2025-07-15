import restify from 'restify';
import errors from 'restify-errors';
import corsMiddleware from "restify-cors-middleware2";
import { promisify } from 'util';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

import * as properties from '../properties/properties.js';
import * as fileUtils from '../services/fileUtils.js';
import * as sockets from './sockets.js';
import * as userDb_controller from '../controllers/user.js';
import * as api_controller from '../controllers/api.js';
import * as routes from '../server/routes.js';

properties.loadFile(fileUtils.relativeToAbsolutePath(import.meta.url, '..'), "package.json");

import logger from '../services/logger.js';

export const server = restify.createServer({
    name: 'esup-otp',
    version: properties.getProperty("package").version,
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
        logger.debug(req.method + " " + req.url);
        return next();
    }
);

/**@type { String } */
const proxyUrl = properties.getEsupProperty('proxyUrl');
if (proxyUrl) {
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
    process.env.https_proxy ||= proxyUrl;
    process.env.http_proxy ||= proxyUrl;
}

server.on('restifyError', (req, res, err, callback) => {
    if (err instanceof errors.HttpError) { // e.g.: 404 error, or errors difined in ../services/errors.js
        if (err.message !== '/ does not exist') {
            logger.info('HttpError: ' + err);
            logger.debug(err.stack);
        }
    } else {
        logger.error(err.stack);
    }

    return callback();
});

export function initialize_userDBController() {
    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' Initializing the userDB controller');
    return userDb_controller.initialize();
}

export function initialize_apiController() {
    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' Initializing the api controller');
    return api_controller.initialize();
}

export function initialize_routes() {
    return routes.initialize(server);
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
    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' App is ready at : ' + server.address().port);
}

export async function stop() {
    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' Stopping server');
    await Promise.allSettled([
        promisify(server.close).call(server),
        sockets.close(),
    ]);
    await Promise.race([ // close all connections (or wait a second if some connections don't want to close)
        async () => server.closeAllConnections(),
        new Promise(resolve => setTimeout(resolve, 1000)),
    ]);
    await Promise.allSettled([
        userDb_controller.userDb.close(),
        api_controller.apiDb.close(),
    ]);
    logger.info(fileUtils.getFileNameFromUrl(import.meta.url) + ' Server is stopped');
}
