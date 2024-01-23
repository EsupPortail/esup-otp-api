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
let managerSocket;

import * as socket_io from 'socket.io';

const users = {_managers:[]};
export function attach(server){
    const casVhost = properties.getEsupProperty("casVhost")
    if (!casVhost) {
        throw "casVhost must be defined in properties/esup.json"
    }
    io = new socket_io.Server({path: "/sockets"}).attach(server.server, { cors: { origin: "https://" + casVhost }});
    initialize();
}

function initialize() {
    io.on("connection", function(socket) {
        if(socket.handshake.query.app=="manager"){
            const secret = socket.handshake.query.secret || utils.get_auth_bearer(socket.handshake.headers)
            if(secret != properties.getEsupProperty('api_password')) { 
                console.error("denying manager app with wrong password");
                socket.disconnect('Forbidden');
            }
            managerSocket = socket.id;
        }
        else if(socket.handshake.query.app=="cas" && socket.handshake.query.uid && socket.handshake.query.hash){
            if(validator.check_hash_socket(socket.handshake.query.uid, socket.handshake.query.hash)){
                userConnection(socket.handshake.query.uid, socket.id);
            }
        } else socket.disconnect('Forbidden');

        socket.on('managers', function (data) {
            users._managers = data;
        })

        socket.on('disconnect', function () {
            userDisconnection(socket.id);
        })
    });
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
