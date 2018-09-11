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

let getCurRooms = function() {
    let curRooms = [];
    for (let room in rooms) {
        if (rooms.hasOwnProperty(room)) {
            curRooms.push(room);
        }
    }

    return curRooms;
}

// socket v2
io.on("connection", function(socket) {
    console.log("a user connected");
    socket.room = null;

    io.to(socket.id).emit("currentRooms", getCurRooms());

    /* socket.join("test");
    rooms["test"].addPlayer(socket.id);*/

    socket.on("disconnect", function(){
        console.log("a user disconnected");

        // leave room if joined one
        if (socket.room === null) {
            return;
        }

        let room: Room = rooms[socket.room];

        let newOwner: string = room.removePlayer(socket.id);

        if (newOwner === null) {
            delete rooms[socket.room];

            console.log("deleted room " + socket.room);
        }
        else {
            console.log(newOwner);
            io.to(newOwner).emit("newRoomOwner");
        }

        socket.leave(socket.room);
        socket.room = null;
    });

    socket.on("createRoom", function(data, callback: Function) {
        if (socket.room !== null) {
            callback(false);

            return;
        }

        let roomId: string = data.roomId;
        let numUsers: number = data.numUsers;

        if (rooms[roomId] !== undefined) {
            callback(false);

            return;
        }

        if (roomId === null || numUsers === null || numUsers < 2) {
            callback(false);

            return;
        }

        rooms[roomId] = new Room(roomId, numUsers, socket.id, io);

        io.emit("currentRooms", getCurRooms());

        console.log("created room " + roomId);

        socket.join(roomId);
        socket.room = roomId;

        callback(true);
    });

    socket.on("joinRoom", function(roomId: string, callback: Function) {
        if (socket.room !== null) {
            callback(false);

            return;
        }

        let room: Room = rooms[roomId];

        if (room === undefined) {
            callback(false);

            return;
        }

        socket.room = roomId;
        let joinSuccess = room.addPlayer(socket.id);

        if (joinSuccess) {
            socket.join(roomId);
        }

        callback(joinSuccess);
    });

    socket.on("leaveRoom", function(callback: Function) {
        if (socket.room === null) {
            return;
        }

        let room: Room = rooms[socket.room];

        let newOwner: string = room.removePlayer(socket.id);

        if (newOwner === null) {
            delete rooms[socket.room];

            console.log("deleted " + socket.room);

            io.emit("currentRooms", getCurRooms());
        }
        else {
            io.to(newOwner).emit("newRoomOwner");
        }

        socket.leave(socket.room);
        socket.room = null;

        callback(true);
    });

    socket.on("startGame", function(roomId: string) {
        if (roomId === null) {
            return;
        }

        let room: Room = rooms[roomId];

        if (room === undefined) {
            return;
        }

        room.start(socket.id);
    });

    socket.on("move", function(data) {
        if (data.room === null) {
            return;
        }

        let room = rooms[data.room];

        if (room === undefined) {
            return;
        }

        room.addMove(data);
    });

    socket.on("useItem", function(data) {
        if (data.room === null) {
            return;
        }

        let room = rooms[data.room];

        if (room === undefined) {
            return;
        }

        room.addItemUse(data);
    });

    socket.on("shoot", function(data) {
        if (data.room === null) {
            return;
        }
        
        let room = rooms[data.room];

        if (room === undefined) {
            return;
        }

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
