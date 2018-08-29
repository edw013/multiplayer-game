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
    private serverDeaths: string[];
    private canvas;
    private powerup;
    
    constructor(socket, canvas, powerup) {
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
        this.serverDeaths = [];

        this.canvas = canvas;
        this.powerup = powerup;
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
            this.players[pid].setAlive(player.alive);
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

    addServerDeath(id) {
        this.serverDeaths.push(id);
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
        while (this.serverDeaths.length > 0) {
            let pid = this.serverDeaths.shift();
            let player: Player = this.players[pid];

            player.die();
        }

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

        this.player.setPowerups(message.powerups);
        this.powerup.innerHTML = message.item;

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

        player.setPowerups(message.powerups);
    }

    useItem() {
        this.socket.emit("useItem", this.playerId);
    }

    repaint() {
        this.canvas.width = this.canvas.width;

        let ctx = this.canvas.getContext("2d");
        for (let key in this.players) {
            let player: Player = this.players[key];

            if (!player.isAlive()) {
                continue;
            }
            
            let radius = player.getWidth() / 2;
            let x = player.getX();
            let y = player.getY();

            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2*Math.PI, false);

            if (player.isInvisible()) {
                if (this.playerId == player.getId()) {
                    ctx.globalAlpha = 0.5;
                }
                else {
                    ctx.globalAlpha = 0;
                }
            }

            if (player.isInvincible()) {
                ctx.strokeStyle = "yellow";
            }
            else if (player.isFire()) {
                ctx.strokeStyle = "red";
            }
            else if (player.isMs()) {
                ctx.strokeStyle = "blue";
            }
            else if (player.isTrapped()) {
                ctx.strokeStyle = "black";
            }
            else {
                ctx.strokeStyle = player.getOutlineColor();
            }

            ctx.fillStyle = player.getColor();
            ctx.lineWidth = 5;

            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }

        for (let key in this.tiles) {
            let tile: Tile = this.tiles[key];

            let topLeftX = tile.getX() - tile.getWidth() / 2;
            let topLeftY = tile.getY() - tile.getHeight() / 2;
    
            ctx.save();
            ctx.beginPath();
            ctx.rect(topLeftX, topLeftY, tile.getWidth(), tile.getHeight());

            ctx.fillStyle = tile.getColor();
            ctx.strokeStyle = tile.getOutlineColor();
            ctx.lineWidth = 5;
            
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }
}

export default Client;