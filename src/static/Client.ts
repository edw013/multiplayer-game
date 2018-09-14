import Player from "../common/Player";
import { Bounds, Input, Movement, SelfPlayerState, PlayerState, ProjectileState, TileState, ShotState } from "../common/Utilities";

const TICKRATE: number = 60;

class Client {
    private roomId: string;
    private player: Player;
    private playerId: string;
    private updateInterval: NodeJS.Timer;
    private socket: SocketIOClient.Socket;
    private lastTS: number;
    private movement: Movement;
    private savedMoves: Input[];
    private selfUpdate: SelfPlayerState;
    private serverPlayerMessages: PlayerState[];
    private serverProjectileMessages: ProjectileState[];
    private serverTileMessages: TileState[];
    private playingField: Bounds;
    private ended: boolean;
    private winner: string;
    private canvas: HTMLCanvasElement;
    private room: HTMLElement;
    private roomControls: HTMLElement;
    private score: HTMLElement;
    private item: HTMLElement;
    private powerup: HTMLElement;
    private weapon: HTMLElement;
    private ammo: HTMLElement;
    private debuff: HTMLElement;
    private deathMessage: HTMLElement;
    
    public constructor(socket: SocketIOClient.Socket, canvas: HTMLCanvasElement, room: HTMLElement, roomControls: HTMLElement, score: HTMLElement, item: HTMLElement, powerup: HTMLElement, weapon: HTMLElement, ammo: HTMLElement, debuff: HTMLElement, deathMessage: HTMLElement) {
        this.socket = socket;

        this.playerId = this.socket.id;

        this.serverPlayerMessages = [];
        this.serverProjectileMessages = [];
        this.serverTileMessages = [];

        this.canvas = canvas;
        this.room = room;
        this.roomControls = roomControls;
        this.score = score;
        this.item = item;
        this.powerup = powerup;
        this.weapon = weapon;
        this.ammo = ammo;
        this.debuff = debuff;
        this.deathMessage = deathMessage;
    }

    public initialize() {
        this.roomControls.style.display = "none";
        this.ended = false;
        this.winner = "";
        let message = this.selfUpdate;
        this.selfUpdate = null;
        this.player = new Player(this.playerId);
        this.player.setX(message.x);
        this.player.setY(message.y);
        this.player.setColor(message.fillColor);
        this.player.setOutlineColor(message.outlineColor);
        this.player.setWidth(message.width);

        this.repaint();
        this.canvas.getContext("2d").save();

        let countdown: number = 3;
        this.paintCountdown(countdown);
        countdown--;
        // countdown??
        let countdownTimer: NodeJS.Timer = setInterval(() => {
            this.paintCountdown(countdown);
            countdown--;
        }, 1000 * 1);

        setTimeout(() => {
            clearInterval(countdownTimer);
            this.canvas.getContext("2d").restore();
        }, 1000 * 3);
    }

    private paintCountdown(countdown: number) {
        this.repaint();
        console.log("painting countdown");
        let ctx: CanvasRenderingContext2D = this.canvas.getContext("2d");
        ctx.font = "30px Arial";
        ctx.fillText(countdown.toString(), this.canvas.width / 2, this.canvas.height / 2);
    }

    public startGame() {
        this.lastTS = Date.now();

        this.movement = new Movement();

        this.savedMoves = [];

        this.setUpdateInterval();
    }

    public endGame(winner: string) {
        this.ended = true;
        this.winner = winner;
    }

    private displayWinner() {
        let ctx: CanvasRenderingContext2D = this.canvas.getContext("2d");
        ctx.font = "20px Arial";
        ctx.fillText("Winner: " + this.winner, this.canvas.width / 4, this.canvas.height / 2);
    }

    private setUpdateInterval() {
        clearInterval(this.updateInterval);

        this.updateInterval = setInterval(() => {
                this.updatePlayerPositions();
                this.updateSelfPosition();
                this.repaint();
                if (this.ended) {
                    clearInterval(this.updateInterval);
                    this.displayWinner();
                }
        }, 1000.0 / TICKRATE);
    }

    public addSelfUpdate(data: SelfPlayerState) {
        this.selfUpdate = data;
    }
    
    public updatePlayingField(bounds: Bounds) {
        this.playingField = bounds;
    }

    public createRoom(roomId: string, numUsers: number) {
        if (roomId === null) {
            return;
        }

        if (numUsers < 2) {
            return;
        }

        this.socket.emit("createRoom", {roomId: roomId, numUsers: numUsers}, created => {
            if (created) {
                this.roomId = roomId;
                this.room.innerHTML = roomId;
            }
        });
    }

    public joinRoom(roomId: string) {
        if (roomId === null) {
            return;
        }

        this.socket.emit("joinRoom", roomId, joined => {
            if (joined) {
                this.roomId = roomId;
                this.room.innerHTML = roomId;
            }
        });
    }
    
    public leaveRoom() {
        if (this.roomId === null) {
            return;
        }

        this.socket.emit("leaveRoom", left => {
            if (left) {
                this.roomControls.style.display = "block";
                this.reset()
            }
        });
    }

    private reset() {
        clearInterval(this.updateInterval);

        this.serverPlayerMessages = [];
        this.serverProjectileMessages = [];
        this.serverTileMessages = [];
        this.selfUpdate = null;
        this.playingField = null;

        this.room.innerHTML = "Not in room";
        this.score.innerHTML = "";
        this.item.innerHTML = "";
        this.powerup.innerHTML = "";
        this.weapon.innerHTML = "";
        this.ammo.innerHTML = "";
        this.debuff.innerHTML = "";
        this.deathMessage.innerHTML = "";
    }

    public signalStartGame() {
        if (this.roomId === null) {
            return;
        }

        this.socket.emit("startGame", this.roomId);
    }

    public addServerPlayerPosition(data: PlayerState[]) {
        this.serverPlayerMessages = data;
    }
    
    public addServerProjectilePosition(data: ProjectileState[]) {
        this.serverProjectileMessages = data;
    }

    public addServerTilePosition(data: TileState[]) {
        this.serverTileMessages = data;
    }

    private updatePlayerPositions() {
        let now: number = Date.now();
        let lastTS: number = this.lastTS;
        let pressTime: number = (now - lastTS) / 1000.0;
        this.lastTS = now;

        let input: Input;
        if (this.movement.up || this.movement.down || this.movement.left || this.movement.right) {
            input = new Input(this.roomId, this.playerId, pressTime, this.movement, now);
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

            this.score.innerHTML = message.score.toString();
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

    public useItem() {
        this.socket.emit("useItem", {room: this.roomId, id: this.playerId});
    }

    public shot(x: number, y: number) {
        if (!this.player.isAlive()) {
            return;
        }

        let shot: ShotState = new ShotState(this.roomId, this.playerId, x, y);
        this.socket.emit("shoot", shot);
    }

    private setWeaponMessage() {
        let weapon = this.player.getWeapon();

        if (weapon === "gun") {
            this.weapon.innerHTML = "Gun";
        } else if (weapon === "bomb") {
            this.weapon.innerHTML = "Grenade Launcher";
        }

        this.ammo.innerHTML = this.player.getAmmo().toString();
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
        let ctx: CanvasRenderingContext2D = this.canvas.getContext("2d");
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

        // playing field
        if (this.playingField) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(this.playingField.x, this.playingField.y, this.playingField.width, this.playingField.width);

            ctx.strokeStyle = "aqua";
            ctx.lineWidth = 10;

            ctx.stroke();
            ctx.restore();
        }
    }
}

export default Client;