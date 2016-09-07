/**
 * Created by abousk01 on 07/09/2016.
 */
var io;
var properties = require(__dirname + '/../properties/properties');
var validator = require('../services/validator');
var managerSocket;

var users = {};
exports.attach = function(server){
    io = require('socket.io')({path: "/sockets"}).attach(server.server);
    initialize();
};

function initialize() {
    io.on("connection", function(socket) {
        if(socket.handshake.query.app=="manager"){
            if(socket.handshake.query.secret != properties.getEsupProperty('api_password'))socket.disconnect('Forbidden');
            managerSocket = socket.id;
        }
        else if(socket.handshake.query.app=="cas" && socket.handshake.query.uid && socket.handshake.query.hash){
            if(validator.check_hash_socket(socket.handshake.query.uid, socket.handshake.query.hash)){
                userConnection(socket.handshake.query.uid, socket.id);
            }
        }

        socket.on('disconnect', function () {
            userDisconnection(socket.id);
        })
    });
}

exports.emitManager= function (emit, data) {
    io.to(managerSocket).emit(emit, data);
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