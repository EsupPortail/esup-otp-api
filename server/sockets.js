/**
 * Created by abousk01 on 07/09/2016.
 */
var io;
var properties = require(__dirname + '/../properties/properties');
var validator = require('../services/validator');
var utils = require('../services/utils');
var managerSocket;

var users = {_managers:[]};
exports.attach = function(server){
    const casVhost = properties.getEsupProperty("casVhost")
    if (!casVhost) {
        throw "casVhost must be defined in properties/esup.json"
    }
    io = require('socket.io')({path: "/sockets"}).attach(server.server, { cors: { origin: "https://" + casVhost }});
    initialize();
};

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

exports.emitManager= function (emit, data) {
    io.to(managerSocket).emit(emit, data);
};

exports.emitToManagers= function (emit, target) {
    for(manager in users['_managers']){
        io.to(managerSocket).emit(emit, {uid:users['_managers'][manager], target: target});
    }
};

exports.emitCas= function (uid, emit, data) {
    if(users[uid])io.to(users[uid]).emit(emit, data);
};

function userConnection(uid, idSocket){
    users[uid]=idSocket;
}

function userDisconnection(idSocket){
    for(user in users){
        if(users[user]==idSocket)delete users[user];
    }
}