import * as socketIo from "socket.io";
import Player from "./common/Player";
import Tile from "./Tile";
import Bullet from "./Bullet";
import Bomb from "./Bomb";
import QuadTree from "./QuadTree";

const TICKRATE: number = 60;
const INSET: number = 75;

class Engine {
    private roomId: string;
    private width: number;
    private height: number;
    private players: {};
    private numPlayers: number;
    private numAlive: number;
    private tiles: {};
    private projectiles: {};
    private pendingMoves: {};
    private updateInterval: any;
    private updatePlayers: any[];
    private updateProjectiles: any[];
    private updateTiles: any[];
    private socket: socketIo.Server;
    private updateRate: number;
    private tree: QuadTree;
    private tileCounter: number;
    private projectileCounter: number;
    private itemQueue: string[];
    private shotQueue: any[];
    private playerDeaths: any[];
    private projectileDeaths: any[];

    public constructor(roomId: string, players: Set<string>, socket: socketIo.Server) {
        this.roomId = roomId;
        this.width = 500;
        this.height = 500;
        this.players = {};
        this.numPlayers = players.size;
        this.numAlive = players.size;
        this.tiles = {};
        this.projectiles = {};
        this.pendingMoves = {};
        this.updatePlayers = [];
        this.updateProjectiles = [];
        this.updateTiles = [];
        this.socket = socket;
        this.updateRate = TICKRATE;

        this.tree = new QuadTree({x: 0, y: 0, width: this.width, height: this.height}, 4, 10);

        this.tileCounter = 0;
        this.projectileCounter = 0;

        this.itemQueue = [];
        this.shotQueue = [];
        this.playerDeaths = [];
        this.projectileDeaths = [];

        let self = this;
        // add players
        players.forEach(function(pid) {
            self.players[pid] = new Player(pid);
            self.pendingMoves[pid] = [];
            self.tree.insert(self.players[pid]);
        });
    }

    public initializeGame() {
        // set dimensions, changes based on number of players in game

        this.socket.to(this.roomId).emit("boardDimensions", this.getDimensions());

        // set up players and tiles
        this.initializePlayers();

        // spawn n - 1 tiles
        for (let i: number = 0; i < this.numPlayers - 1; i++) {
            // this is in its own method because we will use it again later
            this.spawnTile();
        }

        this.sendPlayerState();
        this.sendTileState();
    }

    public startCountdown() {
        // set timer for 10s countdown to game start
        // call this.setUpdateInterval when timer hits 0 to begin game
        this.socket.to(this.roomId).emit("startCountdown");

        setTimeout((function(self) {
            return function() {
                self.socket.to(self.roomId).emit("startGame");
                self.setUpdateInterval();
            };
        })(this), 1000 * 3);
    }

    private endGame() {
        clearInterval(this.updateInterval);

        // called when updateinterval sees that all but one player (or all players) are dead.
        // winner is either last person standing or in case of tie the player of the last two
        // alive with the most kills
        let winner = this.determineWinner();

        this.socket.to(this.roomId).emit("winner", winner);

        // move to wheel part
    }

    private determineWinner(): string {
        if (this.numAlive === 1) {
            for (let pid in this.players) {
                let player: Player = this.players[pid];
                if (player.isAlive()) {
                    return player.getId();
                }
            }
        }
        
        let mostKills: number = 0;
        let id: string = null;

        for (let pid in this.players) {
            let player: Player = this.players[pid];

            if (player.getNumKills() > mostKills) {
                mostKills = player.getNumKills();
                id = player.getId();
            }
        }

        return id;
    }

    private getDimensions(): {width: number, height: number} {
        let dimensions: {width: number, height: number} = {
            width: this.width,
            height: this.height
        };

        return dimensions;
    }

    private initializePlayers() {
        // calculate perimeter - maybe like 75 units or so in
        let startPosWidth: number = this.width - (2 * INSET);
        let startPosHeight: number = this.height - (2 * INSET);

        let perimeter: number = (2 * startPosWidth) + (2 * startPosHeight);
        let increment: number = Math.floor(perimeter / this.numPlayers);

        // distribute players starting from 0
        let curX: number = INSET;
        let curY: number = INSET;
        let minX: number = INSET;
        let maxX: number = startPosWidth + INSET;
        let minY: number = INSET;
        let maxY: number = startPosHeight + INSET;
        for (let pid in this.players) {
            let player: Player = this.players[pid];
            player.setX(curX);
            player.setY(curY);

            // circle around
            // on top from left to right
            if (curX < maxX && curY == minY) {
                curX += increment;

                if (curX > maxX) {
                    curY += curX - maxX;
                    curX = maxX;
                }
            }
            // on right from top to bottom
            // else is fine because it's simply impossible to traverse more than
            // 2 sides at a time.
            else if (curX == maxX && curY < maxY) {
                curY += increment;

                if (curY > maxY) {
                    curX -= curY - maxY;
                    curY = maxY;
                }
            }
            // on bottom from right to left
            else if (curX > minX && curY == maxY) {
                curX -= increment;

                if (curX < minX) {
                    curY -= minX - curX;
                    curX = minX;
                }
            }
            // otherwise must be on left going from botton to top
            // it's impossible to loop around because of our distribution
            else {
                curY -= increment;
            }
        }
    }

    private spawnTile() {
        let tileInset: number =  4 * INSET;
        let xBound: number = this.width - tileInset;
        let yBound: number = this.height - tileInset;
        let x: number = Math.floor(Math.random() * xBound) + tileInset;
        let y: number = Math.floor(Math.random() * yBound) + tileInset;

        let id = this.tileCounter.toString();
        this.tileCounter++;

        let tile = new Tile(id);
        tile.setX(x);
        tile.setY(y);

        this.tiles[id] = tile;

        this.tree.insert(tile);
    }

    private removeTile(id: string) {
        delete this.tiles[id];

        this.socket.to(this.roomId).emit("removeTile", id);
    }

    // return all players
    public getPlayers() {
        return this.players;
    }

    public getTiles() {
        return this.tiles;
    }

    // add a move to process
    public addMove(input: any) {
        let id = input.id;

        // i don't think this should be possible but heroku complained so
        if(!this.pendingMoves[id]) {
            this.pendingMoves[id] = [];
        }

        this.pendingMoves[id].push(input);
    }

    // set update rate
    private setUpdateInterval() {
        clearInterval(this.updateInterval);

        this.updateInterval = setInterval((function(self) {
            return function() {
                self.processItemUses();
                self.processChanges();
                self.processShots();
                self.calculateCollisions();
                self.sendPlayerState();
                self.sendProjectileState();
                self.sendTileState();
                self.checkGameState();
            };
        })(this), 1000 / this.updateRate); // 60 times / sec
    }

    private checkGameState() {
        if (this.numAlive > 1) {
            return;
        }

        //this.endGame();
    }

    // process all pending
    private processChanges() {     
        this.tree.clear();  
        for (let pid in this.players) {
            let player: Player = this.players[pid];

            if (!player) {
                continue;
            }

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
            let projectile = this.projectiles[key];
            let type = projectile.getObjType();

            if (type == "bullet") {
                let bullet = <Bullet> projectile;

                bullet.updatePosition(1 / 60);

                if (bullet.getX() < 0 || bullet.getX() > this.width || bullet.getY() < 0 || bullet.getY() > this.height) {
                    bullet.destroy();

                    continue;
                }

                this.tree.insert(bullet);
            }
            else if (type == "bomb") {
                let bomb = <Bomb> projectile;

                if (bomb.isExploded()) {
                    this.tree.insert(bomb);
                }
            }
        }
    }

    private calculateCollisions() {
        for (let pid in this.players) {
            let player: Player = this.players[pid];

            if (!player) {
                continue;
            }

            let possibleCollisions = this.tree.get(player);

            for (let i = 0; i < possibleCollisions.length; i++) {
                let obj = possibleCollisions[i];

                let targetX = obj.getX();
                let targetY = obj.getY();
                let targetWidth = obj.getWidth();
                let targetHeight = obj.getHeight();

                let type = obj.getObjType();

                // player object is collision between 2 circles
                if (type == "player") {
                    if (obj.getId() == pid) {
                        continue;
                    }

                    let dist = Math.sqrt(Math.pow(player.getX() - targetX, 2) + Math.pow(player.getY() - targetY, 2));

                    if (dist <= player.getWidth() / 2 + targetWidth / 2) {
                        this.playerCollision(player.getId(), obj.getId());
                    }
                }
                if (type == "bullet" || type == "bomb") {
                    let dist = Math.sqrt(Math.pow(player.getX() - targetX, 2) + Math.pow(player.getY() - targetY, 2));

                    if (dist <= player.getWidth() / 2 + targetWidth / 2) {
                        if (type == "bullet") {
                            this.bulletCollision(player.getId(), obj.getId());
                        }
                        else if (type == "bomb") {
                            this.bombCollision(player.getId(), obj.getId());
                        }
                    }
                }
                // tile object is collision between a circle and a rectangle
                else if (type == "tile") {
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

    private playerCollision(p1: string, p2: string) {
        let player1: Player = this.players[p1];
        let player2: Player = this.players[p2];

        if (!player1 || !player2) {
            return;
        }

        if (player1.isInvincible()) {
            if (!player2.isInvincible()) {
                player2.die("you touched an invincible player");
                player1.incrementKills();
                this.numAlive--;
            }
        }

        if (player1.isFire()) {
            if (!player2.isInvincible()) {
                if (!player2.isFire()) {
                    player2.die("someone lit you on fire!");
                    player1.incrementKills();
                    this.numAlive--;
                }
            }
        }
    }

    private bulletCollision(pid: string, bid: string) {
        let player: Player = this.players[pid];

        if (!player) {
            return;
        }

        let bullet = <Bullet> this.projectiles[bid];

        if (!player.isInvincible()) {
            player.die("you were hit by a bullet");

            let playerKiller = this.players[bullet.getParentId()];
            playerKiller.incrementKills();

            this.numAlive--;
        }

        bullet.destroy();
    }

    private bombCollision(pid: string, bid: string) {
        let player: Player = this.players[pid];

        if (!player) {
            return;
        }

        let bomb = <Bomb> this.projectiles[bid];

        if (!player.isInvincible()) {
            player.die("you were blown up");

            let playerKiller = this.players[bomb.getParentId()];
            playerKiller.incrementKills();

            this.numAlive--;
        }
    }

    private tileCollision(pid: string, tid: string) {
        let player: Player = this.players[pid];
        let tile: Tile = this.tiles[tid]

        // multiple collisions and the tile is already destroyed?
        if (!player || !tile) {
            return;
        }

        // can't pick up powerups when on fire
        if (player.isFire()) {
            return;
        }

        console.log(tile.getType());

        player.addItem(tile.getType());

        delete this.tiles[tid];
    }

    private sendPlayerDeaths() {
        this.socket.emit("death", this.playerDeaths);
        this.playerDeaths = [];
    }

    private sendPlayerState() {
        for (let pid in this.players) {
            let player: Player = this.players[pid];

            if (!player.isAlive()) {
                if (player.isRecentDead()) {
                    player.resetRecentDead();
                }
                else {
                    continue;
                }
            }

            this.socket.to(pid).emit("selfPlayerState", {ts: player.getLastTS(), alive: player.isAlive(), deathMessage: player.getDeathReason(), item: player.getItem(), powerups: player.getPowerups(), weapon: player.getWeapon(), ammo: player.getAmmo(), debuffs: player.getDebuffs(), x: player.getX(), y: player.getY(), outlineColor: player.getOutlineColor(), fillColor: player.getColor(), width: player.getWidth()});

            this.updatePlayers.push({id: pid, width: player.getWidth(), x: player.getX(), y: player.getY(), powerups: player.getPowerups(), debuffs: player.getDebuffs(), outlineColor: player.getOutlineColor(), fillColor: player.getColor()});
        }
        // send new server state
        this.socket.to(this.roomId).emit("playerState", this.updatePlayers);
        this.updatePlayers = [];
    }

    private sendProjectileDeaths() {
        this.socket.emit("projectileDeath", this.projectileDeaths);
        this.projectileDeaths = [];
    }

    private sendProjectileState() {
        for (let id in this.projectiles) {
            let projectile = this.projectiles[id];

            if (projectile.isDestroyed()) {
                this.projectileDeaths.push(id);

                delete this.projectiles[id];

                continue;
            }

            let bombExploded = false;
            if (projectile.getObjType() == "bomb") {
                bombExploded = (<Bomb> projectile).isExploded();
            }

            this.updateProjectiles.push({x: projectile.getX(), y: projectile.getY(), outlineColor: projectile.getOutlineColor(), fillColor: projectile.getColor(), width: projectile.getWidth()});
        }

        //this.sendProjectileDeaths();

        this.socket.to(this.roomId).emit("projectileState", this.updateProjectiles);
        this.updateProjectiles = [];
    }

    private sendTileState() {
        for (let id in this.tiles) {
            let tile: Tile = this.tiles[id];

            this.updateTiles.push({x: tile.getX(), y: tile.getY()})
        }

        this.socket.to(this.roomId).emit("tileState", this.updateTiles);
        this.updateTiles = [];
    }

    public addItem(id: string, type: string) {
        let player = this.players[id];

        if (!player) {
            return;
        }

        player.addItem(type);
    }

    public itemUse(id: string) {
        this.itemQueue.push(id);
    }

    private processItemUses() {
        while (this.itemQueue.length > 0) {
            let id = this.itemQueue.shift();
            let player: Player = this.players[id];

            if (!player) {
                continue;
            }

            player.useItem();
        }
    }

    public registerShot(data: any) {
        this.shotQueue.push(data);
    }

    private processShots() {
        while (this.shotQueue.length > 0) {
            let data = this.shotQueue.shift();
            let id = data.id;
            let targetX = data.x;
            let targetY = data.y;

            let player: Player = this.players[id];

            if (!player) {
                continue;
            }

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

    private createBullet(pid, targetX, targetY) {
        let player: Player = this.players[pid];

        if (!player) {
            return;
        }

        if (player.getAmmo() < 1) {
            return;
        }

        let initX = player.getX();
        let initY = player.getY();

        let deltaX = targetX - initX;
        let deltaY = targetY - initY;

        let id = this.projectileCounter.toString();
        this.projectileCounter++;
        let bullet = new Bullet(id, pid, initX, initY, deltaX, deltaY);

        this.projectiles[id] = bullet;

        player.setAmmo(player.getAmmo() - 1);
    }

    private createBomb(pid, targetX, targetY) {
        let player: Player = this.players[pid];

        if (!player) {
            return;
        }

        if (player.getAmmo() < 1) {
            return;
        }

        let id = this.projectileCounter.toString();
        this.projectileCounter++;
        let bomb = new Bomb(id, pid, targetX, targetY);

        this.projectiles[id] = bomb;
        bomb.start();

        player.setAmmo(player.getAmmo() - 1);
    }
}

export default Engine;