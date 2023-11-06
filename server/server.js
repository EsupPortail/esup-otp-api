import restify from 'restify';
import corsMiddleware from "restify-cors-middleware2";
import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import * as sockets from './sockets.js';
import * as userDb_controller from '../controllers/user.js';
import * as api_controller from '../controllers/api.js';
import * as routes from '../server/routes.js';

import packageJson from '../package.json' assert { type: 'json' };
export const version = packageJson.version;

/**
 * absolute path of project directory
 */
global.base_dir = utils.relativeToAbsolutePath(import.meta.url, '..');

import { getInstance } from '../services/logger.js'; const logger = getInstance();

let server = restify.createServer({
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
    function logRequestUrl(req,res,next){
        logger.debug(req.url);
        return next();
    }
);

function initialize_userDBController() {
    logger.info(utils.getFileNameFromUrl(import.meta.url)+' '+'Initializing the userDB controller');
    if (properties.getEsupProperty('userDb')) {
        userDb_controller.initialize(initialize_apiController);
    } else logger.error('Unknown userDb');
}

function initialize_apiController() {
    logger.info(utils.getFileNameFromUrl(import.meta.url)+' '+'Initializing the api controller');
    if (properties.getEsupProperty('apiDb')) {
        api_controller.initialize(() => initialize_routes(launch_server));
    } else logger.error(utils.getFileNameFromUrl(import.meta.url)+' '+'Unknown apiDb');
}

function initialize_routes(callback) {
    routes.initialize(server, version, function(routed_server) {
        server = routed_server;
        if (typeof(callback) === "function") callback();
    })
}


function launch_server() {
    const port = process.env.PORT || 3000;
    server.listen(port, function(err) {
        if (err)
            logger.error(utils.getFileNameFromUrl(import.meta.url)+' '+err);
        else {
            sockets.attach(server);
            logger.info(utils.getFileNameFromUrl(import.meta.url)+' '+'App is ready at : ' + port);
        }
    });
}

export function start() {
    initialize_userDBController();
}
