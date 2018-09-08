import * as express from "express";
import * as http from "http";
import * as socketIo from "socket.io";
import Room from "./Room";
import Engine from "./Engine";

// dependencies
const app: express.Application = express();
const server: http.Server = new http.Server(app);
const io: socketIo.Server = socketIo(server);

const port: String = process.env.PORT || "3000";

app.use(express.static(__dirname + "/static"));

// routing
app.get("/", function(req: any, res: any){
    res.sendFile(__dirname + "/index.html");
});

// start listening
server.listen(port, function(){
    console.log("listening on *:", port);
});

let rooms = {};

rooms["test"] = new Room("test", 2, "aaa", io);

// socket v2
io.on("connection", function(socket) {
    console.log("a user connected");

    socket.join("test");
    rooms["test"].addPlayer(socket.id);

    socket.on("disconnect", function(){
        console.log("a user disconnected");

        // leave room if joined one
        if (socket.room == null) {
            return;
        }

        let room: Room = this.rooms[socket.room];

        let newOwner: string = room.removePlayer(socket.id);

        if (newOwner == null) {
            delete rooms[socket.room];
        }
        else {
            io.to(newOwner).emit("newRoomOwner");
        }

        socket.leave(socket.room);
        socket.room = null;
    });

    socket.on("createRoom", function(data) {
        let roomId: string = data.roomId;
        let numUsers: number = data.numUsers;

        if (rooms[roomId] != null) {
            io.to(socket.id).emit("roomExists");
        }

        rooms[roomId] = new Room(roomId, numUsers, socket.id, io);

        socket.join(roomId);
    });

    socket.on("joinRoom", function(roomId: string) {
        let room: Room = rooms[roomId];

        if (room == null) {
            io.to(socket.id).emit("noRoomFound");
        }

        socket.room = roomId;
        room.addPlayer(socket.id);

        socket.join(roomId);
    });

    socket.on("leaveRoom", function() {
        if (socket.room == null) {
            return;
        }

        let room: Room = rooms[socket.room];

        let newOwner: string = room.removePlayer(socket.id);

        if (newOwner == null) {
            delete rooms[socket.room];
        }
        else {
            io.to(newOwner).emit("newRoomOwner");
        }

        socket.leave(socket.room);
        socket.room = null;
    });

    socket.on("startGame", function(roomId: string) {
        let room: Room = rooms[roomId];

        room.start(socket.id);
    });

    socket.on("move", function(data) {
        let room = rooms[data.room];
        room.addMove(data);
    });

    socket.on("useItem", function(data) {
        let room = rooms[data.room];
        room.addItemUse(data);
    });

    socket.on("shoot", function(data) {
        let room = rooms[data.room];
        room.addShoot(data);
    })

    // all game calls will have to include which game they're part of,
    // we'll handle delegating to appropriate room here
});

/*
// create our engine. this will be a room later which will run an engine
let engine = new Engine(io);

engine.spawnTile();

// socket
io.on("connection", function(socket: any){
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
    socket.on("move", function(input: any) {
        engine.addMove(input);
    });

    socket.on("useItem", function(id: string) {
      engine.itemUse(id);
    });

    socket.on("shoot", function(data: any) {
      engine.registerShot(data);
    })

    socket.on("disconnect", function(){
      engine.removePlayer(socket.id);
      console.log("a user disconnected");
    });  // resize board
    let dimensions: any = engine.getDimensions();
    io.to(socket.id).emit("canvasSize", dimensions);

    // movement inputs from players
    socket.on("move", function(input: any) {
        engine.addMove(input);
    });

    socket.on("useItem", function(id: string) {
      engine.itemUse(id);
    });

    socket.on("shoot", function(data: any) {
      engine.registerShot(data);
    })

    socket.on("disconnect", function(){
      engine.removePlayer(socket.id);
      console.log("a user disconnected");
    });
});*/
