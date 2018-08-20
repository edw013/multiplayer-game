import * as express from "express";
import * as http from "http";
import * as socketIo from "socket.io";
import Game from "./Game";

// dependencies
const app: express.Application = express();
const server: http.Server = new http.Server(app);
const io: socketIo.Server = socketIo(http);

const port: String = process.env.port || "3000";

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

server.listen(port, function(){
  console.log("listening on *:", port);
});
