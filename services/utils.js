exports.cover_string = function(str, start, end) {
    if(str.length <= (start + end))return str; 
    var start_str = str.substr(0, start);
    var end_str = str.substr(str.length - (end+1), str.length - 1);
    var middle_str='';
    for(var i = 0; i< str.length - (start+end); i++){
        middle_str+='*';
    }
    return start_str+middle_str+end_str;
}