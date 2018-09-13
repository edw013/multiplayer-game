import * as socketIo from "socket.io";
import GameObject from "./GameObject";
import Player from "./common/Player";
import { Input, SelfPlayerState, PlayerState, ProjectileState, TileState, ShotState } from "./common/Utilities";
import Tile from "./Tile";
import Bullet from "./Bullet";
import Bomb from "./Bomb";
import { QuadTree, Bounds } from "./QuadTree";

const TICKRATE: number = 60;
const INSET: number = 75;

class Dimensions {
    public width: number;
    public height: number;

    public constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }
}

class Engine {
    private roomId: string;
    private dimensions: Dimensions;
    private players: Map<string, Player>;
    private numPlayers: number;
    private numAlive: number;
    private tiles: Map<string, Tile>;
    private bullets: Map<string, Bullet>;
    private bombs: Map<string, Bomb>;
    private pendingMoves: Map<string, Input[]>;
    private updateInterval: NodeJS.Timer;
    private updatePlayers: PlayerState[];
    private updateProjectiles: ProjectileState[];
    private updateTiles: TileState[];
    private socket: socketIo.Server;
    private updateRate: number;
    private tree: QuadTree;
    private tileCounter: number;
    private bulletCounter: number;
    private bombCounter: number;
    private itemQueue: string[];
    private shotQueue: ShotState[];

    public constructor(roomId: string, players: Set<string>, socket: socketIo.Server) {
        this.roomId = roomId;
        this.dimensions = new Dimensions(500, 500);
        this.players = new Map<string, Player>();
        this.numPlayers = players.size;
        this.numAlive = players.size;
        this.tiles = new Map<string, Tile>();
        this.bullets = new Map<string, Bullet>();
        this.bombs = new Map<string, Bomb>();
        this.pendingMoves = new Map<string, Input[]>();
        this.updatePlayers = [];
        this.updateProjectiles = [];
        this.updateTiles = [];
        this.socket = socket;
        this.updateRate = TICKRATE;

        this.tree = new QuadTree(new Bounds(0, 0, this.dimensions.width, this.dimensions.height), 4, 10);

        this.tileCounter = 0;
        this.bulletCounter = 0;
        this.bombCounter = 0;

        this.itemQueue = [];
        this.shotQueue = [];

        // add players
        players.forEach(pid => {
            this.players[pid] = new Player(pid);
            this.pendingMoves[pid] = [];
            this.tree.insert(this.players[pid]);
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

        setTimeout(() => {
            this.socket.to(this.roomId).emit("startGame");
            this.setUpdateInterval();
        }, 1000 * 3);
    }

    public shutdown() {
        clearInterval(this.updateInterval);
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
        
        let highScore: number = 0;
        let id: string = null;

        for (let pid in this.players) {
            let player: Player = this.players[pid];

            if (player.getScore() > highScore) {
                highScore = player.getScore();
                id = player.getId();
            }
        }

        return id;
    }

    private getDimensions(): Dimensions {
        return this.dimensions;
    }

    private initializePlayers() {
        // calculate perimeter - maybe like 75 units or so in
        let startPosWidth: number = this.dimensions.width - (2 * INSET);
        let startPosHeight: number = this.dimensions.height - (2 * INSET);

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
        let tileInset: number =  2 * INSET;
        let xBound: number = this.dimensions.width - (2 * tileInset);
        let yBound: number = this.dimensions.height - (2 * tileInset);
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

    // add a move to process
    public addMove(input: Input) {
        let id: string = input.id;

        // i don't think this should be possible but heroku complained so
        if(!this.pendingMoves[id]) {
            this.pendingMoves[id] = [];
        }

        this.pendingMoves[id].push(input);
    }

    // set update rate
    private setUpdateInterval() {
        clearInterval(this.updateInterval);

        let numTicks: number = 60 * 60;
        this.updateInterval = setInterval(() => {
            if (numTicks === 0) {
                this.endGame();
            }
            this.processItemUses();
            this.processChanges();
            this.processShots();
            this.calculateCollisions();
            this.sendPlayerState();
            this.sendProjectileState();
            
            numTicks--;
            if (numTicks % 300 === 0) {
                this.spawnTile();
            }

            this.sendTileState();
            this.checkGameState();   
        }, 1000 / this.updateRate); // 60 times / sec
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
            
            let moves: Input[] = this.pendingMoves[pid];
            while(moves.length > 0) {
                let move: Input = moves.shift();

                player.applyInput(move);

                player.setLastTS(move.ts);
                
            }

            this.tree.insert(player);
        }

        for (let key in this.tiles) {
            this.tree.insert(this.tiles[key]);
        }

        for (let key in this.bullets) {
            let bullet: Bullet = this.bullets[key];
            bullet.updatePosition(1 / 60);

            if (bullet.getX() < 0 || bullet.getX() > this.dimensions.width || bullet.getY() < 0 || bullet.getY() > this.dimensions.height) {
                bullet.destroy();

                continue;
            }

            this.tree.insert(bullet);
        }

        for (let key in this.bombs) {
            let bomb: Bomb = this.bombs[key];

            if (bomb.isExploded()) {
                this.tree.insert(bomb);
            }
        }
    }

    private calculateCollisions() {
        for (let pid in this.players) {
            let player: Player = this.players[pid];

            if (!player) {
                continue;
            }

            let possibleCollisions: GameObject[] = this.tree.get(player);

            for (let i: number = 0; i < possibleCollisions.length; i++) {
                let obj: GameObject = possibleCollisions[i];

                let targetX: number = obj.getX();
                let targetY: number = obj.getY();
                let targetWidth: number = obj.getWidth();
                let targetHeight: number = obj.getHeight();

                let type = obj.getObjType();

                // player object is collision between 2 circles
                if (type === "player") {
                    if (obj.getId() === pid) {
                        continue;
                    }

                    let dist = Math.sqrt(Math.pow(player.getX() - targetX, 2) + Math.pow(player.getY() - targetY, 2));

                    if (dist <= player.getWidth() / 2 + targetWidth / 2) {
                        this.playerCollision(player.getId(), obj.getId());
                    }
                }
                if (type === "bullet" || type === "bomb") {
                    let dist = Math.sqrt(Math.pow(player.getX() - targetX, 2) + Math.pow(player.getY() - targetY, 2));

                    if (dist <= player.getWidth() / 2 + targetWidth / 2) {
                        if (type === "bullet") {
                            this.bulletCollision(player.getId(), obj.getId());
                        }
                        else if (type === "bomb") {
                            this.bombCollision(player.getId(), obj.getId());
                        }
                    }
                }
                // tile object is collision between a circle and a rectangle
                else if (type === "tile") {
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
                player1.incrementScore();
                this.numAlive--;
            }
        }

        if (player1.isFire()) {
            if (!player2.isInvincible()) {
                if (!player2.isFire()) {
                    player2.die("someone lit you on fire!");
                    player1.incrementScore();
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

        let bullet = this.bullets[bid];

        if (!player.isInvincible()) {
            player.die("you were hit by a bullet");

            let playerKiller = this.players[bullet.getParentId()];
            playerKiller.incrementScore();

            this.numAlive--;
        }

        bullet.destroy();
    }

    private bombCollision(pid: string, bid: string) {
        let player: Player = this.players[pid];

        if (!player) {
            return;
        }

        let bomb = this.bombs[bid];

        if (!player.isInvincible()) {
            player.die("you were blown up");

            let playerKiller = this.players[bomb.getParentId()];
            playerKiller.incrementScore();

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

            let selfPlayerState: SelfPlayerState = new SelfPlayerState(player.getWidth(), player.getX(), player.getY(), player.getLastTS(), player.isAlive(), player.getScore(), player.getDeathReason(), player.getItem(), player.getPowerups(), player.getDebuffs(), player.getWeapon(), player.getAmmo(), player.getOutlineColor(), player.getColor());
            this.socket.to(pid).emit("selfPlayerState", selfPlayerState);

            let playerState: PlayerState = new PlayerState(pid, player.getWidth(), player.getX(), player.getY(), player.getPowerups(), player.getDebuffs(), player.getOutlineColor(), player.getColor());
            this.updatePlayers.push(playerState);
        }
        // send new server state
        this.socket.to(this.roomId).emit("playerState", this.updatePlayers);
        this.updatePlayers = [];
    }

    private sendProjectileState() {
        // this can be better i think
        for (let id in this.bullets) {
            let projectile: Bullet = this.bullets[id];

            if (projectile.isDestroyed()) {
                delete this.bullets[id];

                continue;
            }

            let projState: ProjectileState = new ProjectileState(projectile.getWidth(), projectile.getX(), projectile.getY(), projectile.getOutlineColor(), projectile.getColor());
            this.updateProjectiles.push(projState);
        }

        for (let id in this.bombs) {
            let projectile: Bomb = this.bombs[id];

            if (projectile.isDestroyed()) {
                delete this.bullets[id];

                continue;
            }

            let projState: ProjectileState = new ProjectileState(projectile.getWidth(), projectile.getX(), projectile.getY(), projectile.getOutlineColor(), projectile.getColor());
            this.updateProjectiles.push(projState);
        }

        this.socket.to(this.roomId).emit("projectileState", this.updateProjectiles);
        this.updateProjectiles = [];
    }

    private sendTileState() {
        for (let id in this.tiles) {
            let tile: Tile = this.tiles[id];

            let tileState: TileState = new TileState(tile.getX(), tile.getY());
            this.updateTiles.push(tileState)
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
            let id: string = this.itemQueue.shift();
            let player: Player = this.players[id];

            if (!player) {
                continue;
            }

            player.useItem();
        }
    }

    public registerShot(data: ShotState) {
        this.shotQueue.push(data);
    }

    private processShots() {
        while (this.shotQueue.length > 0) {
            let data: ShotState = this.shotQueue.shift();
            let id = data.id;
            let targetX = data.x;
            let targetY = data.y;

            let player: Player = this.players[id];

            if (!player) {
                continue;
            }

            if (player.getAmmo() === 0) {
                continue;
            }

            if (!player.isAlive()) {
                continue;
            }

            let weaponType = player.getWeapon();
            if (!weaponType) {
                continue;
            }

            if (weaponType === "gun") {
                this.createBullet(id, targetX, targetY);
            }
            else if (weaponType === "bomb") {
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

        let id: string = this.bulletCounter.toString();
        this.bulletCounter++;
        let bullet = new Bullet(id, pid, initX, initY, deltaX, deltaY);

        this.bullets[id] = bullet;

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

        let id: string = this.bombCounter.toString();
        this.bombCounter++;
        let bomb = new Bomb(id, pid, targetX, targetY);

        this.bombs[id] = bomb;
        bomb.start();

        player.setAmmo(player.getAmmo() - 1);
    }
}

export default Engine;