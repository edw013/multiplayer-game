// dependencies
const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http);

const port = process.env.port || 3000;

// routing
app.get("/", function(req, res){
  res.sendFile(__dirname + "/index.html");
});

// socket
io.on("connection", function(socket){
  console.log("a user connected");
  
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

io.on('connection', function(socket){
    socket.on('chat message', function(msg){
      io.emit("chat message", msg);
    });
});

http.listen(port, function(){
  console.log("listening on *:", port);
});

const g = require("./game.js");
