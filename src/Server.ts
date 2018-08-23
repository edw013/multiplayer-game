import * as express from "express";
import * as http from "http";
import * as socketIo from "socket.io";
import Engine from "./Engine";

// dependencies
const app: express.Application = express();
const server: http.Server = new http.Server(app);
const io: socketIo.Server = socketIo(server);

const port: String = process.env.PORT || "3000";

app.use(express.static(__dirname + "/static"));

// routing
app.get("/", function(req, res){
  res.sendFile(__dirname + "/index.html");
});

// start listening
server.listen(port, function(){
  console.log("listening on *:", port);
});

// create our engine. this will be a room later which will run an engine
let engine = new Engine(io);

engine.spawnTile();

// socket
io.on("connection", function(socket){
  console.log("a user connected");

  // todo: another layer above engine, room, which needs to be filled first
  engine.addPlayer(socket.id);

  // immediately see other players
  let players = engine.getPlayers();
  io.to(socket.id).emit("curPlayers", players);

  // immediately see other tiles
  let tiles = engine.getTiles();
  io.to(socket.id).emit("curTiles", tiles);

  // resize board
  let dimensions: any = engine.getDimensions();
  io.to(socket.id).emit("canvasSize", dimensions);

  
  // movement inputs from players
  socket.on("move", function(input) {
      engine.addMove(input);
  });

  socket.on("disconnect", function(){
    engine.removePlayer(socket.id);
    console.log("a user disconnected");
  });
});
