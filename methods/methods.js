var fs = fs = require('fs');

var methods = {};

fs.readdirSync(__dirname).forEach(function(file) {
    if (file != 'methods.js') {
        var strFile = file.split('.');
        if (strFile[strFile.length - 1] == 'js') {
            methods[file.split('.')[0]] = require(__dirname + '/' + file);
        }
    }
})


for (method in methods) {
    exports[method] = methods[method];
}