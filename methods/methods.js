var fs = fs = require('fs');

var methods = {},
    methods_path = process.cwd() + '/methods';

fs.readdirSync(methods_path).forEach(function(file) {
    if (file != 'methods.js') {
        var strFile = file.split('.');
        if (strFile[strFile.length - 1] == 'js') {
            methods[file.split('.')[0]] = require(methods_path + '/' + file);
        }
    }
})


for (method in methods) {
    exports[method] = methods[method];
}
