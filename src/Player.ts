import GameObject from "./GameObject";
import User from "./User";

class Player extends GameObject {
    private user: User;
    private playerId: string;
    numKills: number;
    private moveSpeed: number;
    lastProcessedInput;
    moves;
    color;
    outlineColor;
    buff;
    radius;

    constructor(id: string) {
        super(id);
        this.objType = "player";
        this.playerId = id;
        this.numKills = 0;
        this.moveSpeed = 200;
        this.color = this.getRandomColor();
        this.outlineColor = this.getRandomColor();
        this.width = 60;
    }

    getRandomColor() {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++) {
          color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    getPlayerId(): string {
        return this.playerId;
    }

    setPlayerId(playerId: string) {
        this.playerId = playerId;
    }

    incrementKills() {
        this.numKills++;
    }

    applyInput(input) {
        if (input.movement.up) {
            this.yPos -= input.pressTime * this.moveSpeed;
        }
        if (input.movement.down) {
            this.yPos += input.pressTime * this.moveSpeed;
        }
        if (input.movement.left) {
            this.xPos -= input.pressTime * this.moveSpeed;
        }
        if (input.movement.right) {
            this.xPos += input.pressTime * this.moveSpeed;
        }
    }

    applyPowerup(type) {
        this.numKills++;
    }

    getWidth() {
        return this.width;
    }
};

export default Player;