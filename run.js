#!/usr/bin/env node
import process from 'node:process';

import * as server from './server/server.js';

server.start();

for (const signal of ['SIGINT', 'SIGTERM', 'SIGQUIT']) {
    process.prependOnceListener(signal, async () => {
        await server.stop();
        process.exit(0);
    });
}