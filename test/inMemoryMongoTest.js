import { MongoMemoryServer } from 'mongodb-memory-server';

import * as properties from '../properties/properties.js';
import * as server from '../server/server.js';

/**
 * @type MongoMemoryServer
 */
let mongoMemoryServer;

export async function initialise() {
    mongoMemoryServer = await MongoMemoryServer.create({ instance: { dbName: "test-otp" } });
    properties.getEsupProperty('mongodb').uri = mongoMemoryServer.getUri();

    await server.start(0);

    return server.server;
}

export async function stop() {
    await server.stop();
    await mongoMemoryServer.stop();
    console.log("MongoMemoryServer stopped");
}
