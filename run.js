#!/usr/bin/env node
import process from 'node:process';

import * as server from './server/server.js';

server.start();

process.on('SIGINT', function() {
    process.exit(0);
});
