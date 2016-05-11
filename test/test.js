var assert = require('chai').assert;
var os = require('os');
var request = require('request');

var properties = require(__dirname + '/../properties/properties');

describe('Esup otp api', function(){
    it('should throw error if server is not running', function(done) {
        var port = process.env.PORT || 3000;
        var url = 'http://' + os.hostname() + ':' + port;
        request({ url: url }, function(error, response, body) {
            if (error) throw error;
            done();
        });
    });
});