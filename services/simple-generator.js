var properties = require(process.cwd() + '/properties/properties');

exports.generate_string_code = function(code_length) {
    return Math.random().toString(36).substr(2, code_length);
}

exports.generate_digit_code = function(code_length) {
    return Math.random().toString().substr(2, code_length);
}