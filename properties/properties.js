var fs = fs = require('fs');

var properties = {},
    properties_path = process.cwd() + '/properties';

fs.readdirSync(properties_path).forEach(function(file) {
    var strFile = file.split('.');
    if (strFile[strFile.length - 1] == 'json') {
        properties[file.split('.')[0]] = JSON.parse(fs.readFileSync(properties_path + '/' + file));
    }
})

for (properties_file in properties) {
    exports[properties_file] = properties[properties_file];
}
