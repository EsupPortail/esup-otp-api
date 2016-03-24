var server = require(process.cwd() + '/server/server');

server.start();

process.on('SIGINT', function() {
    process.exit(0);
});
