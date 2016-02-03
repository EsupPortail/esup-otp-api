var fs = fs = require('fs');

var properties = {},
    properties_path = process.cwd() + '/properties';

fs.readdirSync(properties_path).forEach(function(file) {
    if (file.indexOf('.json') != -1) {
        properties[file.split('.')[0]] = JSON.parse(fs.readFileSync(properties_path + '/' + file));
    }
})

for (properties_file in properties) {
    exports[properties_file] = properties[properties_file];
}
