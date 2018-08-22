import User from "./User"

class Player {
    private user: User;
    private playerId: string;
    private numKills: number;
    private moveSpeed: number;
    private xPos: number;
    private yPos: number;
    private positionBuffer;
    lastProcessedInput;
    moves;
    color;
    outlineColor;

    constructor(id: string) {
        this.playerId = id;
        this.numKills = 0;
        this.moveSpeed = 100;
        this.color = this.getRandomColor();
        this.outlineColor = this.getRandomColor();
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

    getX(): number {
        return this.xPos;
    }

    setX(x: number) {
        this.xPos = x;
    }

    getY(): number {
        return this.yPos;
    }

    setY(y: number) {
        this.yPos = y;
    }

    incrementKills() {
        this.numKills++;
    }

    setPositionBuffer(positionBuffer) {
        this.positionBuffer = positionBuffer;
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
};

export default Player;