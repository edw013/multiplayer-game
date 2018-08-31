import Player from "../common/Player";
import Tile from "../common/Tile";
import Bullet from "../common/Bullet";
import Bomb from "../common/Bomb";

const TICKRATE: number = 60;

class Client {
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
    private serverPlayerMessages: any[];
    private serverPlayerDeaths: any[];
    private serverProjectileMessages: any[];
    private serverProjectileDeaths: string[];
    private canvas;
    private item;
    private powerup;
    private weapon;
    private ammo;
    private debuff;
    private deathMessage;
    
    constructor(socket, canvas, item, powerup, weapon, ammo, debuff, deathMessage) {
        this.socket = socket;
        
        this.playerId = this.socket.id;
        this.player = new Player(this.playerId);

        this.players = {};
        this.players[this.playerId] = this.player;

        this.removePlayers = [];
    
        this.tiles = {};

        this.projectiles = {};

        this.setUpdateInterval();

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

        this.canvas = canvas;
        this.item = item;
        this.powerup = powerup;
        this.weapon = weapon;
        this.ammo = ammo;
        this.debuff = debuff;
        this.deathMessage = deathMessage;
    }

    setUpdateInterval() {
        clearInterval(this.updateInterval);

        this.updateInterval = setInterval((function(self) {
            return function () {
                self.updatePlayerPositions();
                self.processServerPositions();
                self.repaint();
            };
        })(this), 1000.0 / TICKRATE);
    }

    removePlayer(id: string) {
        this.removePlayers.push(id);
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
            if (!player.alive) {
                this.players[pid].die();
            }
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

    addServerPlayerDeath(data) {
        this.serverPlayerDeaths.push(data);
    }

    addServerPlayerPosition(data) {
        this.serverPlayerMessages.push(data);
    }

    addServerProjectileDeath(data) {
        this.serverProjectileDeaths.push(data);
    }
    
    addServerProjectilePosition(data) {
        this.serverProjectileMessages.push(data);
    }

    updatePlayerPositions() {
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
    }

    updateSelfPosition(message) {
        let serverTS = message.ts;
        this.player.setX(message.x);
        this.player.setY(message.y);

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

    updateOtherPosition(message) {
        if (!this.players[message.id]) {
            this.players[message.id] = new Player(message.id);
            console.log("new player");
        }

        let player: Player = this.players[message.id];

        player.setX(message.x);
        player.setY(message.y);

        player.setWeapon(message.weapon);
        player.setAmmo(message.ammo);
        player.setPowerups(message.powerups);
        player.setDebuffs(message.debuffs);
    }

    useItem() {
        this.socket.emit("useItem", this.playerId);
    }

    shot(x: number, y: number) {
        if (!this.player.isAlive()) {
            return;
        }

        console.log("emitting");
        this.socket.emit("shoot", {id: this.playerId, x: x, y: y});
    }

    setWeaponMessage() {
        let weapon = this.player.getWeapon();

        if (weapon == "gun") {
            this.weapon.innerHTML = "Gun";
        } else if (weapon == "bomb") {
            this.weapon.innerHTML = "Grenade Launcher";
        }

        this.ammo.innerHTML = this.player.getAmmo();
    }

    setPowerupMessage() {
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

    setDebuffMessage() {
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

    repaint() {
        let ctx = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

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
        }
    }
}

export default Client;