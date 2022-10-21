#!/usr/bin/env node

var server = require('./server/server');

server.start();

process.on('SIGINT', function() {
    process.exit(0);
});
