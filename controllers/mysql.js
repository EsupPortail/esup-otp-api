var properties = require(process.cwd() + '/properties/properties');
var mysql      = require('mysql');

var connection = mysql.createConnection({
  host     : '192.168.56.101',
  user     : 'admin',
  password : 'changeit',
  database : 'test_otp'
});
 
connection.connect();
 
connection.query('SELECT 1 + 1 AS solution', function(err, rows, fields) {
  if (err) throw err;
 
  console.log('The solution is: ', rows[0].solution);
});
 
connection.end();