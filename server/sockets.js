/**
 * Created by abousk01 on 07/09/2016.
 */
/**
 * @type socket_io.Server
 */
let io;
import * as properties from '../properties/properties.js';
import * as validator from '../services/validator.js';
import * as utils from '../services/utils.js';
import { logger } from '../services/logger.js';
let managerSocket;

import * as socket_io from 'socket.io';

const users = {_managers:[]};
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
        const query = socket.handshake.query
        if(query.app=="manager"){
            const secret = query.secret || utils.get_auth_bearer(socket.handshake.headers)
            if(secret != properties.getEsupProperty('api_password')) {
                logger.error("denying manager app with wrong password");
                socket.disconnect('Forbidden');
            }
            managerSocket = socket.id;

            socket.on('managers', function (data) {
                users._managers = data;
            })
        }
        else if(query.app=="cas" && query.uid && query.hash){
            if (await validator.check_hash_internal(query.uid, query.hash)) {
                userConnection(query.uid, socket.id);
            }
        } else socket.disconnect('Forbidden');

        socket.on('disconnect', function () {
            userDisconnection(socket.id);
        })
    });
    io.engine.on("connection_error", (err) => {
        logger.debug("socket connection error: " + err.message);
    });
}

export async function close() {
    return io.close();
}

export function emitManager(emit, data) {
    io.to(managerSocket).emit(emit, data);
}

export function emitToManagers(emit, target) {
    for(const manager in users['_managers']){
        io.to(managerSocket).emit(emit, {uid:users['_managers'][manager], target: target});
    }
}

export function emitCas(uid, emit, data) {
    if(users[uid])io.to(users[uid]).emit(emit, data);
}

function userConnection(uid, idSocket){
    users[uid]=idSocket;
}

function userDisconnection(idSocket){
    for(const user in users){
        if(users[user]==idSocket)delete users[user];
    }
}
