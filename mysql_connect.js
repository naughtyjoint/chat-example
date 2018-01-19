var mysql      = require('mysql');
var conn = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'test'
});


conn.connect(function (err) {
    if(err){
        console.error('error connecting: ' + err.stack);
        return;
    }
    console.log("Connected!");
});



exports.conn = conn;
