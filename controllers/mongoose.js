var properties = require(process.cwd() + '/properties/properties');
var fs = fs = require('fs');

var schemas = {},
    schemas_path = process.cwd() + '/controllers/mongoose';

fs.readdirSync(schemas_path).forEach(function(file) {
    if (file.indexOf('.js') != -1) {
        schemas[file.split('.')[0]] = require(schemas_path + '/' + file)
    }
})

module.exports = {
    initialize: function(mongoose_instance, callback) {
        for (schema in schemas) {
            schemas[schema].initiate(mongoose_instance);
        }
        if (typeof(callback) === "function") callback();
    },
}
