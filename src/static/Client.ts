import Player from "../common/Player";
import Tile from "../common/Tile";
import Bullet from "../common/Bullet";
import Bomb from "../common/Bomb";

const TICKRATE: number = 60;

class Client {
    private roomId: string;
    private players: {};
    private player: Player;
    private playerId: string;
    private removePlayers: any[];
    private tiles: {};
    private projectiles: {};
    private updateInterval;
    private socket;
    private lastTS;
    private movement: {};
    private savedMoves: any[];
    private selfUpdate: any;
    private serverPlayerMessages: any[];
    private serverPlayerDeaths: any[];
    private serverProjectileMessages: any[];
    private serverTileMessages: any[];
    private serverProjectileDeaths: string[];
    private canvas;
    private room;
    private item;
    private powerup;
    private weapon;
    private ammo;
    private debuff;
    private deathMessage;
    
    public constructor(socket, canvas, room, item, powerup, weapon, ammo, debuff, deathMessage) {
        this.socket = socket;
        
        this.roomId = null;

        this.playerId = this.socket.id;
        this.player = new Player(this.playerId);

        this.players = {};
        this.players[this.playerId] = this.player;

        this.removePlayers = [];
    
        this.tiles = {};

        this.projectiles = {};

        //this.setUpdateInterval();

        this.lastTS = Date.now();

        this.movement = {};
        this.movement["up"] = false;
        this.movement["down"] = false;
        this.movement["right"] = false;
        this.movement["left"] = false;

        this.savedMoves = [];

        this.serverPlayerMessages = [];
        this.serverPlayerDeaths = [];
        this.serverProjectileMessages = [];
        this.serverProjectileDeaths = [];
        this.serverTileMessages = [];

        this.canvas = canvas;
        this.room = room;
        this.item = item;
        this.powerup = powerup;
        this.weapon = weapon;
        this.ammo = ammo;
        this.debuff = debuff;
        this.deathMessage = deathMessage;
    }

    public initialize() {
        let message = this.selfUpdate;
        this.selfUpdate = null;
        this.player.setX(message.x);
        this.player.setY(message.y);
        this.player.setColor(message.fillColor);
        this.player.setOutlineColor(message.outlineColor);
        this.player.setWidth(message.width);

        this.repaint();
        // countdown??
        setTimeout((function(self) {
            return function() {
                console.log("starting"); 
            };
        })(this), 1000 * 3);
    }

    public startGame() {
        this.setUpdateInterval();
    }

    private setUpdateInterval() {
        clearInterval(this.updateInterval);

        this.updateInterval = setInterval((function(self) {
            return function () {
                self.updatePlayerPositions();
                self.updateSelfPosition();
                //self.processServerPositions();
                self.repaint();
            };
        })(this), 1000.0 / TICKRATE);
    }

    public addSelfUpdate(data) {
        this.selfUpdate = data;
    }

    public createRoom(roomId: string, numUsers: number) {
        if (roomId === null) {
            return;
        }

        if (numUsers < 2) {
            return;
        }

        let self = this;
        this.socket.emit("createRoom", {roomId: roomId, numUsers: numUsers}, function(created) {
            if (created) {
                self.roomId = roomId;
                self.room.innerHTML = roomId;
            }
        });
    }

    public joinRoom(roomId: string) {
        if (roomId === null) {
            return;
        }

        let self = this;
        this.socket.emit("joinRoom", roomId, function(joined) {
            if (joined) {
                self.roomId = roomId;
                self.room.innerHTML = roomId;
            }
        });
    }
    
    public leaveRoom() {
        if (this.roomId === null) {
            return;
        }

        let self = this;
        this.socket.emit("leaveRoom", function(left) {
            if (left) {
                self.roomId = null;
                self.room.innerHTML = "Not in room";
            }
        });
    }

    public signalStartGame() {
        if (this.roomId === null) {
            return;
        }

        this.socket.emit("startGame", this.roomId);
    }

    /*public removePlayer(id: string) {
        this.removePlayers.push(id);
    }

    public setPlayers(players) {
        for (let key in players) {
            let player = players[key];
            let pid = player.id;

            if (pid == this.playerId) {
                continue;
            }

            this.players[pid] = new Player(pid);
            this.players[pid].setX(player.xPos);
            this.players[pid].setY(player.yPos);
            if (!player.alive) {
                this.players[pid].die();
            }
        }
    }

    public addTile(data) {
        let tile: Tile = new Tile(data.id);
        tile.setX(data.x);
        tile.setY(data.y);

        this.tiles[data.id] = tile;
    }

    public removeTile(id: string) {
        delete this.tiles[id];
    }

    public setTiles(tiles) {
        for (let key in tiles) {
            let tile = tiles[key];
            let id = tile.id;

            this.tiles[id] = new Tile(id);
            this.tiles[id].setX(tile.xPos);
            this.tiles[id].setY(tile.yPos);
        }
    } */

    public addServerPlayerDeath(data) {
        this.serverPlayerDeaths.push(data);
    }

    public addServerPlayerPosition(data) {
        //this.serverPlayerMessages.push(data);
        this.serverPlayerMessages = data;
    }

    public addServerProjectileDeath(data) {
        this.serverProjectileDeaths.push(data);
    }
    
    public addServerProjectilePosition(data) {
        this.serverProjectileMessages = data;
    }

    public addServerTilePosition(data) {
        this.serverTileMessages = data;
    }

    private updatePlayerPositions() {
        let now = Date.now();
        let lastTS = this.lastTS;
        let pressTime = (now - lastTS) / 1000.0;
        this.lastTS = now;

        let input;
        if (this.movement["up"] || this.movement["down"] || this.movement["left"] || this.movement["right"]) {
            input = {room: this.roomId, id: this.playerId, pressTime: pressTime, movement: this.movement, ts: now};
        }
        else {
            return;
        }

        this.socket.emit("move", input);

        this.player.applyInput(input);

        this.savedMoves.push(input);

        while(this.savedMoves.length > 120) {
            this.savedMoves.shift();
        }
    }

    /* private processServerPositions() {
        while (this.serverPlayerDeaths.length > 0) {
            let data = this.serverPlayerDeaths.shift();
            let pid = data.id;
            let player: Player = this.players[pid];

            player.die(data.reason);

            if (pid == this.playerId) {
                this.deathMessage.innerHTML = data.reason;
            }
        }

        while (this.serverPlayerMessages.length > 0) {
            let message = this.serverPlayerMessages.shift();

            let pid = message.id;

            if(pid == this.playerId) {
                this.updateSelfPosition(message);
            }
            else {
                this.updateOtherPosition(message);
            }
            
        }

        while (this.serverProjectileMessages.length > 0) {
            let data = this.serverProjectileMessages.shift();
            let id = data.id;
            let type = data.type;

            if (!this.projectiles[id]) {
                if (type == "bullet") {
                    this.projectiles[id] = new Bullet(id, data.x, data.y, null, null);
                }
                else if (type == "bomb") {
                    this.projectiles[id] = new Bomb(id, data.x, data.y);
                }
            }

            this.projectiles[id].setX(data.x);
            this.projectiles[id].setY(data.y);

            if (type == "bomb" && data.exploded) {
                <Bomb> this.projectiles[id].explode();
            }
        }
        while (this.serverProjectileDeaths.length > 0) {
            let id = this.serverProjectileDeaths.shift();

            delete this.projectiles[id];
        }

        // clean
        while (this.removePlayers.length > 0) {
            let id = this.removePlayers.shift();

            delete this.players[id];
        }
    } */

    private updateSelfPosition() {
        if (this.selfUpdate) {
            let message = this.selfUpdate;
            this.selfUpdate = null;
            let serverTS = message.ts;
            this.player.setX(message.x);
            this.player.setY(message.y);

            if (message.alive === false) {
                this.player.die(message.deathMessage);
                this.deathMessage.innerHTML = this.player.getDeathReason();
            }

            this.item.innerHTML = message.item;

            this.player.setPowerups(message.powerups);
            this.setPowerupMessage();

            this.player.setWeapon(message.weapon);
            this.player.setAmmo(message.ammo);
            this.setWeaponMessage();
            
            this.player.setDebuffs(message.debuffs);
            this.setDebuffMessage();

            this.savedMoves = this.savedMoves.filter(savedMove => {savedMove.ts > serverTS});

            this.savedMoves.forEach(savedMove => {
                this.player.applyInput(savedMove);
            });
        }  
        this.selfUpdate = null;
    }

    /*private updateOtherPosition(message) {
        if (!this.players[message.id]) {
            this.players[message.id] = new Player(message.id);
        }

        let player: Player = this.players[message.id];

        player.setX(message.x);
        player.setY(message.y);

        player.setWeapon(message.weapon);
        player.setAmmo(message.ammo);
        player.setPowerups(message.powerups);
        player.setDebuffs(message.debuffs);
    } */

    public useItem() {
        this.socket.emit("useItem", {room: this.roomId, id: this.playerId});
    }

    public shot(x: number, y: number) {
        if (!this.player.isAlive()) {
            return;
        }

        this.socket.emit("shoot", {room: this.roomId, id: this.playerId, x: x, y: y});
    }

    private setWeaponMessage() {
        let weapon = this.player.getWeapon();

        if (weapon == "gun") {
            this.weapon.innerHTML = "Gun";
        } else if (weapon == "bomb") {
            this.weapon.innerHTML = "Grenade Launcher";
        }

        this.ammo.innerHTML = this.player.getAmmo();
    }

    private setPowerupMessage() {
        let powerups = this.player.getPowerups();

        if (powerups.invincible) {
            this.powerup.innerHTML = "Invincible!";
        }
        else if (powerups.invisible) {
            this.powerup.innerHTML = "Invisible!";
        }
        else if (powerups.ms) {
            this.powerup.innerHTML = "Speed!";
        }
        else {
            this.powerup.innerHTML = "none";
        }
    }

    private setDebuffMessage() {
        let debuffs = this.player.getDebuffs();

        if (debuffs.fire) {
            this.debuff.innerHTML = "Fire!";
        }
        else if (debuffs.trapped) {
            this.debuff.innerHTML = "Trapped!";
        }
        else {
            this.debuff.innerHTML = "none";
        }
    }

    private repaint() {
        let ctx = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.player.isAlive()) {
            let radius = this.player.getWidth() / 2;
            let x = this.player.getX();
            let y = this.player.getY();

            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2*Math.PI, false);

            if (this.player.isInvisible()) {
                ctx.globalAlpha = 0.5;
            }
            if (this.player.isInvincible()) {
                ctx.strokeStyle = "yellow";
            }
            else if (this.player.isFire()) {
                ctx.strokeStyle = "red";
            }
            else if (this.player.isMs()) {
                ctx.strokeStyle = "blue";
            }
            else if (this.player.isTrapped()) {
                ctx.strokeStyle = "black";
            }
            else {
                ctx.strokeStyle = this.player.getOutlineColor();
            }

            ctx.fillStyle = this.player.getColor();
            ctx.lineWidth = 5;

            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }
            
        for (let i: number = 0; i < this.serverPlayerMessages.length; i++) {
            let message = this.serverPlayerMessages[i];

            if (message.id === this.playerId) {
                continue;
            }

            let radius: number = message.width / 2;
            let x: number = message.x;
            let y: number = message.y;

            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI, false);

            if (message.powerups.invisible === true) {
                continue;
            }
            if (message.powerups.invincible === true) {
                ctx.strokeStyle = "yellow";
            }
            else if (message.debuffs.fire === true) {
                ctx.strokeStyle = "red";
            }
            else if (message.powerups.ms === true) {
                ctx.strokeStyle = "blue";
            }
            else if (message.debuffs.trapped === true) {
                ctx.strokeStyle = "black";
            }
            else {
                ctx.strokeStyle = message.outlineColor;
            }

            ctx.fillStyle = message.fillColor;
            ctx.lineWidth = 5;

            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }

        for (let i: number = 0; i < this.serverProjectileMessages.length; i++) {
            let message = this.serverProjectileMessages[i];

            let radius: number = message.width / 2;
            let x: number = message.x;
            let y: number = message.y;

            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
            ctx.strokeStyle = message.outlineColor;
            ctx.fillStyle = message.fillColor;
            ctx.lineWidth = 5;

            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        for (let i: number = 0; i < this.serverTileMessages.length; i++) {
            let message = this.serverTileMessages[i];

            let topLeftX = message.x - 25;
            let topLeftY = message.y - 25;
    
            ctx.save();
            ctx.beginPath();
            ctx.rect(topLeftX, topLeftY, 50, 50);

            ctx.fillStyle = "yellow";
            ctx.strokeStyle = "black";
            ctx.lineWidth = 5;
            
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
        /*for (let key in this.players) {
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

        for (let key in this.projectiles) {
            let projectile = this.projectiles[key];

            let x = projectile.getX();
            let y = projectile.getY();
            let radius = projectile.getWidth() / 2;
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2*Math.PI, false);
            ctx.fillStyle = projectile.getColor();
            ctx.strokeStyle = projectile.getOutlineColor();
            ctx.lineWidth = 3;

            ctx.fill();
            ctx.stroke();
            ctx.restore();
        } */


    }
}

export default Client;