var properties = require(process.cwd() + '/properties/properties');
var fs = fs = require('fs');

var schemas = {},
    schemas_path = process.cwd() + '/controllers/mongoose';

fs.readdirSync(schemas_path).forEach(function(file) {
    if (file.indexOf('.js') != -1) {
        schemas[file.split('.')[0]] = require(schemas_path + '/' + file)
    }
})
module.exports.schemas = schemas;
exports.initialize = function(mongoose_instance, callback) {
    for (schema in schemas) {
        exports.schemas[schema].initiate(mongoose_instance);
    }
    console.log("mongoose controller initialized");
    if (typeof(callback) === "function") callback();
}
