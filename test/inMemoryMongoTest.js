import { MongoMemoryServer } from 'mongodb-memory-server';
import assert from "node:assert/strict";

import * as properties from '../properties/properties.js';
import * as apiDb from '../databases/api/mongodb.js';
import * as userDb from '../databases/user/mongodb.js';
import * as userDb_controller from '../controllers/user.js';
import * as api_controller from '../controllers/api.js';
import * as server from '../server/server.js';

/**
 * @type MongoMemoryServer
 */
let mongoMemoryServer;

export async function initialise() {
    assert.equal(properties.getEsupProperty("apiDb"), "mongodb");
    assert.equal(properties.getEsupProperty("userDb"), "mongodb");

    mongoMemoryServer = await MongoMemoryServer.create({ instance: { dbName: "test-otp" } });
    const mongoUri = mongoMemoryServer.getUri();

    await apiDb.initialize(mongoUri);
    await userDb.initialize(mongoUri);
    await api_controller.initialize(apiDb);
    await userDb_controller.initialize(userDb);
    await server.initialize_routes();
    await server.launch_server(0);

    return server.server;
}

export async function stop() {
    await server.stop();
    await mongoMemoryServer.stop();
    console.log("MongoMemoryServer stopped");
}
