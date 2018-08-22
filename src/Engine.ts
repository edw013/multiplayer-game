import * as socketIo from "socket.io";
import Player from "./Player";

const TICKRATE: number = 60;

class Engine {
    players: {};
    pendingMoves: {};
    updateInterval;
    updateMessages: any[];
    socket: socketIo.Server;
    updateRate: number;


    constructor(socket: socketIo.Server) {
        this.players = {};
        this.pendingMoves = {};
        this.updateMessages = [];
        this.socket = socket;
        this.updateRate = TICKRATE;

        this.setUpdateInterval();
    }

    // add a new player
    addPlayer(id: string) {
        console.log("Engine: added " + id);
        let player = new Player(id);
        this.players[id] = player;

        // default settings, will update later
        this.players[id].setX(100);
        this.players[id].setY(100);

        this.pendingMoves[id] = [];

        let message = {playerId: id, x: 100, y: 100};
        this.socket.emit("newPlayer", message);
    }

    // remove an existing player
    removePlayer(id: string) {
        delete this.players[id];

        this.socket.emit("removePlayer", id);
    }

    // return all players
    getPlayers() {
        return this.players;
    }

    // add a move to process
    addMove(input) {
        let id = input.id;

        // i don't think this should be possible but heroku complained so
        if(!this.pendingMoves[id]) {
            this.pendingMoves[id] = [];
        }

        this.pendingMoves[id].push(input);
    }

    // set update rate
    setUpdateInterval() {
        clearInterval(this.updateInterval);

        this.updateInterval = setInterval((function(self) {
            return function() {
                self.processChanges();
            };
        })(this), 1000 / this.updateRate); // 60 times / sec
    }

    // process all pending
    processChanges() {       
        let lastTS;
        for (let key in this.players) {
            let player = this.players[key];
            let pid = player.playerId;
            let moves = this.pendingMoves[pid];
            while(moves.length > 0) {
                let move = moves.shift();

                player.applyInput(move);

                lastTS = move.ts;
                
            }
            this.updateMessages.push({playerId: pid, ts: lastTS, x: player.getX(), y: player.getY()});
        }

        // send new server state
        this.socket.emit("gameState", this.updateMessages);
        this.updateMessages = [];
    }
}

export default Engine;