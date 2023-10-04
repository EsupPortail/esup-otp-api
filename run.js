#!/usr/bin/env node

import * as server from './server/server.js';

server.start();

process.on('SIGINT', function() {
    process.exit(0);
});
