var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

var onlineUser = [];
var onlineId = [];
var list =[];

var mysql      = require('mysql');
var connection = mysql.createConnection({
        "host": "localhost",
        "user": "root",
        "password": "",
        "database": "test"
    });
connection.connect();

function ChatLog(name, msg){
    //connection doent have to reconnet DB everytime
    //connection.connect();

    var data = { name: name, log: msg };
    var q = connection.query('INSERT INTO chat SET ?', data, function (error, results, fields) {
        //[try] to release
        //connection.release();

        if (error) throw error;
    });
    console.log(q.sql);
    //connection.end();

    return q;
};

function ConnectLog(name){
    var data = { name: name, log: ' connected' };
    var q = connection.query('INSERT INTO chat SET ?', data, function (error, results, fields) {
        if (error) throw error;
    });
    console.log(q.sql);
    return q;
}

function DisconnectLog(name){
    var data = { name: name, log: ' Disconnected' };
    var q = connection.query('INSERT INTO chat SET ?', data, function (error, results, fields) {
        if (error) throw error;
    });
    console.log(q.sql);
    return q;
}

function getHistoryChat(){
    var lim = 10 ;
    var r = [];

    var rowcount;

    connection.query('SELECT 1 + 1 AS solution', function (error, results, fields) {
        if (error) throw error;
        console.log('The solution is: ', results[0].solution);
        console.log('solution '+fields[0]);
        rowcount = results[0].solution;
    });

    connection.query('SELECT COUNT(id) as countrow FROM chat', function (error, results, fields) {
        if (error) throw error;

        rowcount = results[0].countrow;
    });

    console.log("count: ", rowcount);

    var q = connection.query('SELECT * FROM chat ORDER BY id LIMIT '+(rowcount-lim)+','+lim, function (error, results, fields) {
        if (error) throw error;

        r = results;
    });
    console.log(q.sql);
    return r;
}

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

//聆聽連結
io.on('connection', function(socket){
    var userinfo = {};
    var username = socket.handshake.query.name;

    console.log(username + ' connected');
    ConnectLog(username);
    io.emit('connected', username+" is in, let's say hello!!");
    //[嘗試]當重複名稱要求重新輸入
    /*if(onlineUser.indexOf(username) == -1)
    {
        console.log(username + ' connected');
        io.emit('connected', username+" is in, let's say hello!!");
    }
    else
    {
        console.log(socket.id + ' is changing name');
        io.sockets.connected[socket.id].emit('changename', username);
        return false;
    }*/

    //建立目前上限名單
   /* onlineId.push(socket.id);
    onlineUser.push(username);
    console.log(onlineUser);
    console.log(onlineId);
    console.log(onlineId.length);*/

    list[socket.id] = socket.handshake.query;
    console.log(list);
    console.log(list.length);

    //送給新user歷史紀錄
    var hisLog = [];
    //getHistoryChat();
    //console.log(hisLog.length);

    //連線測試
    console.log('connected as id ' + connection.threadId);

    //聆聽收到訊息
    socket.on('chat message', function(name, msg){
        console.log(name +' send messenge: '+msg);

        console.log( ChatLog(name, msg).sql + " function callback");

      io.emit('chat message', name, msg);
    });

    socket.on('typing', function(name){
        //console.log(name +' chatting messenge: '+msg);
        io.emit('whoistyping', name);
    });

    //聆聽傳遞私訊
    socket.on('secret message', function(sender, target, msg){
        //console.log(name +' send messenge: '+msg);
        var targetIndex = onlineUser.indexOf(target);
        //console.log(targetIndex);
        if(targetIndex != -1)
            io.sockets.connected[onlineId[targetIndex]].emit('chat message', sender, msg);
        else
        {
            var senderIndex = onlineUser.indexOf(sender);
            msg = "can't find mamber \""+target+"\" online, please try again";
            console.log(msg);
            io.sockets.connected[onlineId[senderIndex]].emit('chat message', '<system>', msg);

        }
    });

    //聆聽斷開鎖練
    socket.on('disconnect', function(){
        var byeIndex = onlineId.indexOf(socket.id);
        DisconnectLog(onlineUser[byeIndex]);
        io.emit('disconnected', onlineUser[byeIndex]+" has leave us...");
        onlineId.splice(byeIndex, 1);
        onlineUser.splice(byeIndex, 1);
        console.log(socket.id + ' disconnected');
        console.log(onlineUser);
        console.log(onlineUser.length);
    });

    //聆聽DB莫名斷線
    connection.on('error', function(err) {
        if (!err.fatal) {
            return;
        }

        if (err.code !== 'PROTOCOL_CONNECTION_LOST') {
            throw err;
        }

        console.log('Re-connecting lost connection: ' + err.stack);

        connection = mysql.createConnection(connection.config);
        handleDisconnect(connection);
        connection.connect();
    });
});

//設定websocket要聽哪一台
http.listen(port, function(){
  console.log('listening on *:' + port);
});
