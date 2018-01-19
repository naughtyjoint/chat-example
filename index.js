var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var config = require('./mysql_connect');
var name = "";
var onlineUser = [];
var onlineId = [];
var list =[];
var hisLog = [];
var temphismsg = [];
var db = config.conn;

function ChatLog(name, msg){
    //connection doent have to reconnet DB everytime
    //connection.connect();

    var data = { name: name, log: msg };
    var q = db.query('INSERT INTO chat SET ?', data, function (error, results, fields) {
        //[try] to release
        //connection.release();

        if (error) throw error;
    });
    console.log(q.sql);
    //connection.end();

    return q;
}

function getHistoryChat(callback){
    var lim = 10 ;
    db.query('SELECT ?? FROM ?? ORDER BY ?? DESC LIMIT ?',[['name', 'log'],'chat', 'id', lim], function (error, results, fields) {
        if (error) throw error;
        if(callback instanceof Function)  callback(results);
    })
}

function ConnectLog(name){
    var data = { name: name, log: ' is in, let\'s say hello!!' };
    var q = db.query('INSERT INTO chat SET ?', data, function (error, results, fields) {
        if (error) throw error;
    });
    console.log(q.sql);
    return q;
}

function DisconnectLog(name){
    var data = { name: name, log: ' has leave us...' };
    var q = db.query('INSERT INTO chat SET ?', data, function (error, results, fields) {
        if (error) throw error;
    });
    console.log(q.sql);
    return q;
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
    //建立目前上線名單
    onlineId.push(socket.id);
    onlineUser.push(username);
    list[socket.id] = username;

    console.log(list);
    console.log(onlineId);
    console.log(onlineUser);
    console.log(temphismsg);
    //送給新user歷史紀錄
    var msglog = username+" is in, let's say hello!!";


    if(temphismsg.length===0){
        getHistoryChat(function(results){
            hisLog = results;

            io.sockets.connected[socket.id].emit('load history', hisLog);
        });
    }


    io.sockets.connected[socket.id].emit('showhislog', {
        hislog : temphismsg,
        hislognum : temphismsg.length
    });

    socket.broadcast.emit('connected', {
        name : username+" is in, let's say hello!!"
    });

    io.emit('connected_info', {
        amount : "聊天室人數 : "+onlineId.length,
        userlist : onlineUser
    });

    temphismsg.push(msglog);

    //連線測試
    // console.log('connected as id ' + db.threadId);

    //聆聽收到訊息
    socket.on('chat message', function(name, msg){
        console.log(name +' send messenge: '+msg);

        console.log( ChatLog(name, msg).sql + " function callback");

      io.emit('chat message', name, msg);
      temphismsg.push(name+":"+msg);
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
        var nowlength = onlineId.length;
        DisconnectLog(username);
        console.log(temphismsg);
        console.log(onlineId);
        console.log(nowlength);
        if(nowlength===1){
            temphismsg.length = 0;
            console.log("see you foooool");
        }else if(nowlength>1){
            temphismsg.push(username+" has leave us...");
        }
        delete list[socket.id];
        onlineId.splice(byeIndex, 1);
        onlineUser.splice(byeIndex, 1);


        io.emit('disconnected', {
            name : username+" has leave us...",
            amount : "聊天室人數 : "+(onlineId.length),
            userlist : onlineUser
        });
        console.log(socket.id + ' disconnected');
        console.log(onlineId);
        console.log(temphismsg);
    });

    //聆聽DB莫名斷線
    db.on('error', function(err) {
        if (!err.fatal) {
            return;
        }

        if (err.code !== 'PROTOCOL_CONNECTION_LOST') {
            throw err;
        }

        console.log('Re-connecting lost connection: ' + err.stack);

        conn = mysql.createConnection(connection.config);
        handleDisconnect(connection);
        connection.connect();
    });
});

//設定websocket要聽哪一台
http.listen(port, function(){
  console.log('listening on *:' + port);
});
