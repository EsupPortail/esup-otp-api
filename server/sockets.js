/**
 * Created by abousk01 on 07/09/2016.
 */
/**
 * @type socket_io.Server
 */
let io;
import * as properties from '../properties/properties.js';
import * as validator from '../services/validator.js';
import { logger } from '../services/logger.js';

import * as socket_io from 'socket.io';
import restifyErrors from 'restify-errors';
import * as multiTenantUtils from '../services/multiTenantUtils.js';

export function attach(server){
    const casVhost = properties.getEsupProperty("casVhost")
    if (!casVhost) {
        throw "casVhost must be defined in properties/esup.json"
    }
    const otherHosts = properties.getEsupProperty("otherHosts") || [];
    io = new socket_io.Server({path: "/sockets"}).attach(server.server, { cors: { origin: otherHosts.concat("https://" + casVhost) }});
    initialize();
}

function initialize() {
    io.on("connection", async function(socket) {
        try {
            const query = socket.handshake.query;
            switch (query.app) {
                case 'manager':
                    return connectManager(socket, query);
                case 'cas':
                    return connectCasUser(socket, query);
                default: {
                    throw new restifyErrors.BadRequestError();
                }
            }
        } catch (err) {
            socket.disconnect('Forbidden');
            throw err;
        }
    });

    io.engine.on("connection_error", (err) => {
        logger.debug("socket connection error: " + err.message);
    });
}

async function connectManager(socket, query) {
    const tenant = await multiTenantUtils.getCurrentTenantPropertiesInternal(null, socket.handshake.headers[multiTenantUtils.TENANT_HEADER]);
    await validator.check_protected_access_internal(tenant, query.secret, socket.handshake.headers);

    socket.join(managerRoom(tenant));
}

async function connectCasUser(socket, query) {
    await validator.check_hash({ params: query });

    const room = userRoom(query.uid)
    io.socketsLeave(room); // clear room https://socket.io/fr/docs/v4/server-instance/#socketsleave
    socket.join(room);
}

export async function close() {
    return io.close();
}

export async function emitManager(req, eventName, data) {
    const tenant = await multiTenantUtils.getCurrentTenantProperties(req);
    io.to(managerRoom(tenant)).emit(eventName, data);
}

export function emitUserAuth(uid, otp) {
    io.to(userRoom(uid)).emit('userAuth', { code: "Ok", otp, });
}

function managerRoom(tenant) {
    return "tenant-" + tenant.id;
}

function userRoom(uid) {
    return "user-" + uid;
}
