import * as express from "express";
import * as http from "http";
import * as socketIo from "socket.io";
import Room from "./Room";

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

let rooms = new Map<string, Room>();

let getCurRooms = function() {
    let curRooms: {id: string, cur: number, size: number}[] = [];
    for (let id in rooms) {
        if (rooms.hasOwnProperty(id)) {
            let room: Room = rooms[id];
            if (room.isStarted()) {
                continue;
            }
            let size: number = room.getRoomSize();
            let numPlayers: number = room.getNumPlayers();
            curRooms.push({id: id, cur: numPlayers, size: size});
        }
    }

    return curRooms;
}

let socketLeaveRoom = function(socket) {
    if (socket.room === null) {
        return;
    }

    let room: Room = rooms[socket.room];

    let toDelete: boolean = room.removePlayer(socket.id);

    if (toDelete) {
        console.log("deleting " + socket.room);
        rooms[socket.room].delete();
        delete rooms[socket.room];
    }

    socket.leave(socket.room);
    socket.room = null;

    io.emit("currentRooms", getCurRooms());
}

// socket v2
io.on("connection", function(socket) {
    console.log("a user connected");
    socket.room = null;

    io.to(socket.id).emit("currentRooms", getCurRooms());

    socket.on("disconnect", function(){
        console.log("a user disconnected");

        // leave room if joined one
        socketLeaveRoom(socket);
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

        console.log("created room " + roomId + " with owner " + socket.id);

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

            io.emit("currentRooms", getCurRooms());
        }

        callback(joinSuccess);
    });

    socket.on("leaveRoom", function(callback: Function) {
        socketLeaveRoom(socket);

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

        io.emit("currentRooms", getCurRooms());
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
