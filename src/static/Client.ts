import Player from "../common/Player";

const TICKRATE: number = 60;

class Client {
    private roomId: string;
    private player: Player;
    private playerId: string;
    private updateInterval;
    private socket;
    private lastTS;
    private movement: {};
    private savedMoves: any[];
    private selfUpdate: any;
    private serverPlayerMessages: any[];
    private serverProjectileMessages: any[];
    private serverTileMessages: any[];
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

        this.playerId = this.socket.id;

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
        this.player = new Player(this.playerId);
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
        this.lastTS = Date.now();

        this.movement = {};
        this.movement["up"] = false;
        this.movement["down"] = false;
        this.movement["right"] = false;
        this.movement["left"] = false;

        this.savedMoves = [];

        this.serverPlayerMessages = [];
        this.serverProjectileMessages = [];
        this.serverTileMessages = [];

        this.setUpdateInterval();
    }

    private setUpdateInterval() {
        clearInterval(this.updateInterval);

        this.updateInterval = setInterval((function(self) {
            return function () {
                self.updatePlayerPositions();
                self.updateSelfPosition();
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
                self.reset()
            }
        });
    }

    private reset() {
        clearInterval(this.updateInterval);

        this.room.innerHTML = "Not in room";
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

    public addServerPlayerPosition(data) {
        this.serverPlayerMessages = data;
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
    }
}

export default Client;