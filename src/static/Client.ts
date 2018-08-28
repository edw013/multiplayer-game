import Player from "../common/Player";
import Tile from "../common/Tile";

const TICKRATE: number = 60;

class Client {
    private players: {};
    private player: Player;
    private playerId: string;
    private tiles: {};
    private updateInterval;
    private socket;
    private lastTS;
    private movement: {};
    private savedMoves: any[];
    private serverMessages: any[];
    private canvas;
    
    constructor(socket, canvas) {
        this.socket = socket;
        
        this.playerId = this.socket.id;
        this.player = new Player(this.playerId);

        this.players = {};
        this.players[this.playerId] = this.player;
    
        this.tiles = {};

        this.setUpdateInterval();

        this.lastTS = Date.now();

        this.movement = {};
        this.movement["up"] = false;
        this.movement["down"] = false;
        this.movement["right"] = false;
        this.movement["left"] = false;

        this.savedMoves = [];

        this.serverMessages = [];

        this.canvas = canvas;
    }

    setUpdateInterval() {
        clearInterval(this.updateInterval);

        this.updateInterval = setInterval((function(self) {
            return function () {
                self.updatePositions();
                self.processServerPositions();
                self.repaint();
            };
        })(this), 1000.0 / TICKRATE);
    }

    addPlayer(data) {
        if (data.id == this.playerId) {
            return;
        }

        let player: Player = new Player(data.id);
        player.setX(data.x);
        player.setY(data.y);

        this.players[data.id] = player;
    }

    removePlayer(id: string) {
        delete this.players[id];

        this.repaint();
    }

    setPlayers(players) {
        for (let key in players) {
            let player = players[key];
            let pid = player.id;

            if (pid == this.playerId) {
                continue;
            }

            this.players[pid] = new Player(pid);
            this.players[pid].setX(player.xPos);
            this.players[pid].setY(player.yPos);
        }
    }

    addTile(data) {
        let tile: Tile = new Tile(data.id);
        tile.setX(data.x);
        tile.setY(data.y);

        this.tiles[data.id] = tile;
    }

    removeTile(id: string) {
        delete this.tiles[id];

        this.repaint();
    }

    setTiles(tiles) {
        for (let key in tiles) {
            let tile = tiles[key];
            let id = tile.id;

            this.tiles[id] = new Tile(id);
            this.tiles[id].setX(tile.xPos);
            this.tiles[id].setY(tile.yPos);
        }
    }

    updatePositions() {
        let now = Date.now();
        let lastTS = this.lastTS;
        let pressTime = (now - lastTS) / 1000.0;
        this.lastTS = now;

        let input;
        if (this.movement["up"] || this.movement["down"] || this.movement["left"] || this.movement["right"]) {
            input = {id: this.playerId, pressTime: pressTime, movement: this.movement, ts: now};
        }
        else {
            return;
        }

        this.socket.emit("move", input);

        this.player.applyInput(input);

        this.savedMoves.push(input);

        while(this.savedMoves.length > 30) {
            this.savedMoves.shift();
        }
    }

    processServerPositions() {
        while(this.serverMessages.length > 0) {
            let message = this.serverMessages.shift();

            let pid = message.id;

            if(pid == this.playerId) {
                this.updateSelfPosition(message);
            }
            else {
                this.updateOtherPosition(message);
            }
            
        }
    }

    updateSelfPosition(message) {
        let serverTS = message.ts;
        this.player.setX(message.x);
        this.player.setY(message.y);

        this.savedMoves = this.savedMoves.filter(savedMove => {savedMove.ts > serverTS});

        this.savedMoves.forEach(savedMove => {
            this.player.applyInput(savedMove);
        });
    }

    updateOtherPosition(message) {
        if (!this.players[message.id]) {
            this.players[message.id] = new Player(message.id);
        }

        let player: Player = this.players[message.id];
        player.setX(message.x);
        player.setY(message.y);
    }

    addPowerup(message) {
        let player = this.players[message.id];

        player.addPowerup(message.type);
    }

    removePowerup(message) {
        let player = this.players[message.id];

        player.removePowerup(message.type);
    }

    repaint() {
        this.canvas.width = this.canvas.width;

        let ctx = this.canvas.getContext("2d");
        for (let key in this.players) {
            let player: Player = this.players[key];

            if (!player.isAlive()) {
                return;
            }

            if (player.isInvisible()) {
                if (this.playerId == player.getId()) {
                    ctx.globalAlpha = 0.5;
                }
                else {
                    ctx.globalAlpha = 0;
                }
            }

            let radius = player.getWidth() / 2;
            let x = player.getX();
            let y = player.getY();

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2*Math.PI, false);

            ctx.fillStyle = player.getColor();
            ctx.strokeStyle = player.getOutlineColor();
            ctx.lineWidth = 5;

            ctx.fill();
            ctx.stroke();

            ctx.globalAlpha = 1;
        }

        for (let key in this.tiles) {
            let tile: Tile = this.tiles[key];

            let topLeftX = tile.getX() - tile.getWidth() / 2;
            let topLeftY = tile.getY() - tile.getHeight() / 2;
    
            ctx.beginPath();
            ctx.rect(topLeftX, topLeftY, tile.getWidth(), tile.getHeight());

            ctx.fillStyle = tile.getColor();
            ctx.strokeStyle = tile.getOutlineColor();
            ctx.lineWidth = 5;
            
            ctx.fill();
            ctx.stroke(); 
        }
    }
}

export default Client;