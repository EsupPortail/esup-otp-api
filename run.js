require(process.cwd() + '/server/routes');

process.on('SIGINT', function() {
    process.exit(0);
});
