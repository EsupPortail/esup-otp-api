var fs = fs = require('fs');

var properties = {};

fs.readdirSync(__dirname).forEach(function(file) {
    var strFile = file.split('.');
    if (strFile[strFile.length - 1] == 'json') {
        properties[file.split('.')[0]] = JSON.parse(fs.readFileSync(__dirname + '/' + file));    }
})

for (properties_file in properties) {
    exports[properties_file] = properties[properties_file];
}
