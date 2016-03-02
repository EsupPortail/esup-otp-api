var properties = require(process.cwd() + '/properties/properties');

exports.generate_string_code = function() {
    return Math.random().toString(36).substr(2, properties.esup.simple_generator.code_length);
}

exports.generate_digit_code = function() {
    return Math.random().toString().substr(2, properties.esup.simple_generator.code_length);
}