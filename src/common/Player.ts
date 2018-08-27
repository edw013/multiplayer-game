import GameObject from "./GameObject";

class Player extends GameObject {
    private numKills: number;
    private moveSpeed: number;
    private alive: boolean;
    private buffs: any[];

    constructor(id: string) {
        super(id);
        this.objType = "player";
        this.numKills = 0;
        this.moveSpeed = 200;
        this.color = this.getRandomColor();
        this.outlineColor = this.getRandomColor();
        this.width = 60;
        this.alive = true;
    }

    isAlive(): boolean {
        return this.alive;
    }

    incrementKills() {
        this.numKills++;
    }

    setNumKills(kills: number) {
        this.numKills = kills;
    }
    
    getNumKills(): number {
        return this.numKills;
    }

    applyInput(input: any) {
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

    applyPowerup(type: any) {
        this.buffs.push(type);

        switch (type) {
            case "fire":
                break;
                
        }
    }

    getBuffs(): any[] {
        return this.buffs;
    }
};

export default Player;