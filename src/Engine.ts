import * as socketIo from "socket.io";
import Player from "./common/Player";
import Tile from "./common/Tile";
import QuadTree from "./QuadTree";

const TICKRATE: number = 60;

class Engine {
    width: number;
    height: number;
    players: any;
    tiles: any;
    pendingMoves: any;
    updateInterval: any;
    updateMessages: any[];
    socket: socketIo.Server;
    updateRate: number;
    tree: QuadTree;
    tileCounter: number;

    constructor(socket: socketIo.Server) {
        this.width = 800;
        this.height = 800;
        this.players = {};
        this.tiles = {};
        this.pendingMoves = {};
        this.updateMessages = [];
        this.socket = socket;
        this.updateRate = TICKRATE;

        this.tree = new QuadTree({x: 0, y: 0, width: this.width, height: this.height}, 4, 10);

        this.tileCounter = 0;

        this.setUpdateInterval();
    }

    getDimensions(): any {
        let dimensions: any = {};
        dimensions.width = this.width;
        dimensions.height = this.height;

        return dimensions;
    }

    // add a new player
    addPlayer(id: string) {
        console.log("Engine: added " + id);
        let player = new Player(id);
        this.players[id] = player;

        // default settings, will update later
        this.players[id].setX(100);
        this.players[id].setY(100);

        this.tree.insert(player);

        this.pendingMoves[id] = [];

        let message = {id: id, x: 100, y: 100};
        this.socket.emit("newPlayer", message);
    }

    // remove an existing player
    removePlayer(id: string) {
        delete this.players[id];

        this.socket.emit("removePlayer", id);
    }

    spawnTile() {
        let x = Math.floor(Math.random() * (this.width - 100)) + 50;
        let y = Math.floor(Math.random() * (this.height - 100)) + 50;

        let id = this.tileCounter.toString();
        this.tileCounter++;

        let tile = new Tile(id);
        tile.setX(x);
        tile.setY(y);

        this.tiles[id] = tile;

        this.tree.insert(tile);

        this.socket.emit("newTile", {x: x, y: y});
    }

    removeTile(id: string) {
        delete this.tiles[id];

        this.socket.emit("removeTile", id);

        this.spawnTile();
    }

    // return all players
    getPlayers() {
        return this.players;
    }

    getTiles() {
        return this.tiles;
    }

    // add a move to process
    addMove(input: any) {
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
                self.calculateCollisions();
            };
        })(this), 1000 / this.updateRate); // 60 times / sec
    }

    // process all pending
    processChanges() {     
        this.tree.clear();  
        let lastTS;
        for (let key in this.players) {
            let player: Player = this.players[key];
            let pid = player.getId();

            if(!this.pendingMoves[pid]) {
                this.pendingMoves[pid] = [];
            }
            
            let moves = this.pendingMoves[pid];
            while(moves.length > 0) {
                let move = moves.shift();

                player.applyInput(move);

                lastTS = move.ts;
                
            }

            this.tree.insert(player);
            this.updateMessages.push({id: pid, ts: lastTS, x: player.getX(), y: player.getY()});
        }

        for (let key in this.tiles) {
            this.tree.insert(this.tiles[key]);
        }

        // send new server state
        this.socket.emit("gameState", this.updateMessages);
        this.updateMessages = [];
    }

    calculateCollisions() {
        for (let key in this.players) {
            let player: Player = this.players[key];

            let possibleCollisions = this.tree.get(player);

            for (let i = 0; i < possibleCollisions.length; i++) {
                let obj = possibleCollisions[i];

                let targetX = obj.getX();
                let targetY = obj.getY();
                let targetWidth = obj.getWidth();
                let targetHeight = obj.getHeight();

                // player object is 2 circles
                if (obj.getObjType() == "player") {
                    if (obj.getId() == key) {
                        continue;
                    }

                    let dist = Math.sqrt(Math.pow(player.getX() - targetX, 2) + Math.pow(player.getY() - targetY, 2));

                    if (dist <= player.getWidth() / 2 + targetWidth / 2) {
                    }
                }
                // tile object is circle and rectangle
                else if (obj.getObjType() == "tile") {
                    let tile: Tile = <Tile> obj;
                    let tileX = targetX - targetWidth / 2;
                    let tileY = targetY - targetHeight / 2;
                    let deltaX = player.getX() - Math.max(tileX, Math.min(player.getX(), tileX + targetWidth));
                    let deltaY = player.getY() - Math.max(tileY, Math.min(player.getY(), tileY + targetHeight));

                    if (Math.pow(deltaX, 2) + Math.pow(deltaY, 2) < Math.pow(player.getWidth() / 2, 2)) {
                        // add powerup and remove it
                        this.addPowerup(player.getId(), tile.getType());

                        this.removeTile(obj.getId());
                    }
                }
            }
        }
    }

    addPowerup(id: string, type: string) {
        let player = this.players[id];

        player.addPowerup(type);

        this.socket.emit("addPowerup", {id: id, type: type});

        // start interval
    }
}

export default Engine;