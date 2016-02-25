exports.send_code = function(tel, message, res) {
    console.log("Message sent to "+tel+", with the message: "+message);
    res.send("Message sent to "+tel+", with the message: "+message);
}