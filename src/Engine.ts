import * as socketIo from "socket.io";
import Player from "./common/Player";
import Tile from "./common/Tile";
import Bullet from "./common/Bullet";
import Bomb from "./common/Bomb";
import QuadTree from "./QuadTree";

const TICKRATE: number = 60;

class Engine {
    width: number;
    height: number;
    players: any;
    tiles: any;
    projectiles: any;
    pendingMoves: any;
    updateInterval: any;
    updatePlayers: any[];
    updateProjectiles: any[];
    socket: socketIo.Server;
    updateRate: number;
    tree: QuadTree;
    tileCounter: number;
    projectileCounter: number;
    itemQueue: string[];
    shotQueue: any[];
    playerDeaths: any[];
    projectileDeaths: any[];

    constructor(socket: socketIo.Server) {
        this.width = 500;
        this.height = 500;
        this.players = {};
        this.tiles = {};
        this.projectiles = {};
        this.pendingMoves = {};
        this.updatePlayers = [];
        this.updateProjectiles = [];
        this.socket = socket;
        this.updateRate = TICKRATE;

        this.tree = new QuadTree({x: 0, y: 0, width: this.width, height: this.height}, 4, 10);

        this.tileCounter = 0;
        this.projectileCounter = 0;

        this.itemQueue = [];
        this.shotQueue = [];
        this.playerDeaths = [];
        this.projectileDeaths = [];

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
                self.processItemUses();
                self.processChanges();
                self.processShots();
                self.calculateCollisions();
                self.sendPlayerState();
                self.sendProjectileState();
            };
        })(this), 1000 / this.updateRate); // 60 times / sec
    }

    // process all pending
    processChanges() {     
        this.tree.clear();  
        for (let pid in this.players) {
            let player: Player = this.players[pid];

            if (!player.isAlive()) {
                continue;
            }

            if(!this.pendingMoves[pid]) {
                this.pendingMoves[pid] = [];
            }
            
            let moves = this.pendingMoves[pid];
            while(moves.length > 0) {
                let move = moves.shift();

                player.applyInput(move);

                player.setLastTS(move.ts);
                
            }

            this.tree.insert(player);
        }

        for (let key in this.tiles) {
            this.tree.insert(this.tiles[key]);
        }

        for (let key in this.projectiles) {
            let bullet = this.projectiles[key];

            bullet.updatePosition(1 / 60);

            if (bullet.getX() < 0 || bullet.getX() > this.width || bullet.getY() < 0 || bullet.getY() > this.height) {
                bullet.destroy();

                continue;
            }

            this.tree.insert(bullet);
        }
    }

    calculateCollisions() {
        for (let pid in this.players) {
            let player: Player = this.players[pid];

            let possibleCollisions = this.tree.get(player);

            for (let i = 0; i < possibleCollisions.length; i++) {
                let obj = possibleCollisions[i];

                let targetX = obj.getX();
                let targetY = obj.getY();
                let targetWidth = obj.getWidth();
                let targetHeight = obj.getHeight();

                // player object is collision between 2 circles
                if (obj.getObjType() == "player") {
                    if (obj.getId() == pid) {
                        continue;
                    }

                    let dist = Math.sqrt(Math.pow(player.getX() - targetX, 2) + Math.pow(player.getY() - targetY, 2));

                    if (dist <= player.getWidth() / 2 + targetWidth / 2) {
                        this.playerCollision(player.getId(), obj.getId());
                    }
                }
                if (obj.getObjType() == "bullet" || obj.getObjType() == "bomb") {
                    let dist = Math.sqrt(Math.pow(player.getX() - targetX, 2) + Math.pow(player.getY() - targetY, 2));

                    if (dist <= player.getWidth() / 2 + targetWidth / 2) {
                        this.projectileCollision(player.getId(), obj.getId());
                    }
                }
                // tile object is collision between a circle and a rectangle
                else if (obj.getObjType() == "tile") {
                    let tile: Tile = <Tile> obj;

                    // x and y are always in the center
                    let tileX = targetX - targetWidth / 2;
                    let tileY = targetY - targetHeight / 2;
                    let deltaX = player.getX() - Math.max(tileX, Math.min(player.getX(), tileX + targetWidth));
                    let deltaY = player.getY() - Math.max(tileY, Math.min(player.getY(), tileY + targetHeight));

                    if (Math.pow(deltaX, 2) + Math.pow(deltaY, 2) < Math.pow(player.getWidth() / 2, 2)) {
                        this.tileCollision(player.getId(), tile.getId());
                    }
                }
            }
        }
    }

    playerCollision(p1: string, p2: string) {
        let player1: Player = this.players[p1];
        let player2: Player = this.players[p2];

        if (player1.isInvincible()) {
            if (!player2.isInvincible()) {
                player2.die("you touched an invincible player");
            }
        }

        if (player1.isFire()) {
            if (!player2.isInvincible()) {
                if (!player2.isFire()) {
                    player2.die("someone lit you on fire!");
                }
            }
        }

        if (player2.isInvincible()) {
            if (!player1.isInvincible()) {
                player1.die("you touched an invincible player");
            }
        }

        if (player2.isFire()) {
            if (!player1.isInvincible()) {
                if (!player1.isFire()) {
                    player1.die("someone lit you on fire");
                }
            }
        }
    }

    projectileCollision(pid: string, bid: string) {
        let player: Player = this.players[pid];
        let projectile = this.projectiles[bid];

        if (!player.isInvincible()) {
            player.die("you were hit by a " + projectile.getObjType());
        }

        projectile.destroy();
    }

    tileCollision(pid: string, tid: string) {
        let player: Player = this.players[pid];
        let tile: Tile = this.tiles[tid]

        // can't pick up powerups when on fire
        if (player.isFire()) {
            return;
        }

        console.log(tile.getType());

        player.addItem(tile.getType());

        this.removeTile(tid);
    }

    sendPlayerDeaths() {
        this.socket.emit("death", this.playerDeaths);
        this.playerDeaths = [];
    }

    sendPlayerState() {
        for (let pid in this.players) {
            let player = this.players[pid];

            if (!player.isAlive()) {
                if (player.isRecentDead()) {
                    this.playerDeaths.push({id: pid, reason: player.getDeathReason()});

                    player.resetRecentDead();
                }
                else {
                    continue;
                }
            }

            this.updatePlayers.push({id: pid, ts: player.getLastTS(), item: player.getItem(), powerups: player.getPowerups(), weapon: player.getWeapon(), ammo: player.getAmmo(), debuffs: player.getDebuffs(), x: player.getX(), y: player.getY()});
        }

        this.sendPlayerDeaths();

        // send new server state
        this.socket.emit("playerState", this.updatePlayers);
        this.updatePlayers = [];
    }

    sendProjectileDeaths() {
        this.socket.emit("projectileDeath", this.projectileDeaths);
        this.projectileDeaths = [];
    }

    sendProjectileState() {
        for (let id in this.projectiles) {
            let projectile = this.projectiles[id];

            if (projectile.isDestroyed()) {
                this.projectileDeaths.push(id);

                delete this.projectiles[id];

                continue;
            }

            this.updateProjectiles.push({id: id, x: projectile.getX(), y: projectile.getY(), type: projectile.getObjType()});
        }

        this.sendProjectileDeaths();

        this.socket.emit("projectileState", this.updateProjectiles);
        this.updateProjectiles = [];
    }

    addItem(id: string, type: string) {
        let player = this.players[id];

        player.addItem(type);
    }

    itemUse(id: string) {
        this.itemQueue.push(id);
    }

    processItemUses() {
        while (this.itemQueue.length > 0) {
            let id = this.itemQueue.shift();
            let player: Player = this.players[id];

            player.useItem();
        }
    }

    registerShot(data: any) {
        this.shotQueue.push(data);
    }

    processShots() {
        while (this.shotQueue.length > 0) {
            let data = this.shotQueue.shift();
            let id = data.id;
            let targetX = data.x;
            let targetY = data.y;

            let player: Player = this.players[id];

            if (player.getAmmo() == 0) {
                continue;
            }

            if (!player.isAlive()) {
                continue;
            }

            let weaponType = player.getWeapon();
            if (!weaponType) {
                continue;
            }

            if (weaponType == "gun") {
                this.createBullet(id, targetX, targetY);
            }
            else if (weaponType == "bomb") {
                this.createBomb(id, targetX, targetY);
            }
        }
    }

    createBullet(pid, targetX, targetY) {
        let player: Player = this.players[pid];

        if (player.getAmmo() < 1) {
            return;
        }

        let initX = player.getX();
        let initY = player.getY();

        let deltaX = targetX - initX;
        let deltaY = targetY - initY;

        let id = this.projectileCounter.toString();
        this.projectileCounter++;
        let bullet = new Bullet(id, initX, initY, deltaX, deltaY);

        this.projectiles[id] = bullet;

        player.setAmmo(player.getAmmo() - 1);
    }

    createBomb(pid, targetX, targetY) {
        let player: Player = this.players[pid];

        if (player.getAmmo() < 1) {
            return;
        }

        let id = this.projectileCounter.toString();
        this.projectileCounter++;
        let bomb = new Bomb(id, targetX, targetY);

        this.projectiles[id] = bomb;

        player.setAmmo(player.getAmmo() - 1);
    }
}

export default Engine;