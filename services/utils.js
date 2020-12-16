var properties = require(__dirname + '/../properties/properties');
var CryptoJS = require('crypto-js');
var logger = require(__dirname + '/../services/logger').getInstance();

exports.get_hash = function(uid) {
    var d = new Date();
    var d2 = new Date();
    
    var present_salt=d.getUTCDate()+d.getUTCHours().toString();
    //calcul de la date - 1h (3600000 millisecondes)
    d2.setTime(d.getTime()-3600000);
    var past_salt=d2.getUTCDate()+d2.getUTCHours().toString();

    //calcul de la date + 1h
    d2.setTime(d.getTime()+3600000);
    var next_salt=d2.getUTCDate()+d2.getUTCHours().toString();

    logger.debug("past_salt,present_salt,next_salt :"+past_salt+","+present_salt+","+next_salt);


    var present_hash = CryptoJS.SHA256(CryptoJS.MD5(properties.getEsupProperty('users_secret')).toString()+uid+present_salt).toString();
    var next_hash = CryptoJS.SHA256(CryptoJS.MD5(properties.getEsupProperty('users_secret')).toString()+uid+next_salt).toString();
    var past_hash = CryptoJS.SHA256(CryptoJS.MD5(properties.getEsupProperty('users_secret')).toString()+uid+past_salt).toString();

    var hashes = [past_hash, present_hash, next_hash];

    logger.debug("hashes for "+uid+": "+hashes);

    return hashes;
}

exports.cover_string = function(str, start, end) {
    if (str.length <= (start + end)) return str;
    var start_str = str.substr(0, start);
    var end_str = str.substr(str.length - (end + 1), str.length - 1);
    var middle_str = '';
    for (var i = 0; i < str.length - (start + end); i++) {
        middle_str += '*';
    }
    return start_str + middle_str + end_str;
}


exports.generate_string_code = function(code_length) {
    return Math.random().toString(36).substr(2, code_length);
}

exports.generate_digit_code = function(code_length) {
    return Math.random().toString().substr(2, code_length);
}

exports.check_transport_validity= function(transport, value){
    var reg;
    if (transport == 'sms') reg = new RegExp("^0[6-7]([-. ]?[0-9]{2}){4}$");
    else reg = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
    return reg.test(value);
}

exports.getFileName= function(filename){
    return filename.split(global.base_dir)[1];
}
