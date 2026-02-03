import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * @type MongoMemoryServer
 */
let mongoMemoryServer;

export async function initialise() {
    mongoMemoryServer = await MongoMemoryServer.create({ instance: { dbName: "test-otp" } });
    return mongoMemoryServer.getUri();
}

export async function stop() {
    await mongoMemoryServer.stop();
    console.log("MongoMemoryServer stopped");
}
