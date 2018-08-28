import GameObject from "./GameObject";

class Player extends GameObject {
    private numKills: number;
    private moveSpeed: number;
    private alive: boolean;
    private invincible: boolean;
    private invisible: boolean;
    private fire: boolean;
    private ms: boolean;

    constructor(id: string) {
        super(id);
        this.objType = "player";
        this.numKills = 0;
        this.moveSpeed = 200;
        this.color = this.getRandomColor();
        this.outlineColor = this.getRandomColor();
        this.width = 60;
        this.height = 60;
        this.alive = true;

        this.invincible = false;
        this.invisible = false;
        this.fire = false;
        this.ms = false;
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

    addPowerup(type: string) {
        // change invincibility or ammo or whatever
        this.togglePowerups(type, true);
    }

    removePowerup(type: string) {
        // unset invincibility or ammo or whatever
        this.togglePowerups(type, false);
    }

    togglePowerups(type: string, toggle: boolean) {
        switch (type) {
            case "star":
                this.invincible = toggle;
                break;
            case "invis":
                this.invisible = toggle;
                break;
            case "fire":
                this.fire = toggle;
                break;
            case "ms":
                this.ms = toggle;

                if (this.ms) {
                    this.moveSpeed *= 2;
                }
                else {
                    this.moveSpeed /= 2;
                }

                break;
        }
    }

    isInvisible(): boolean {
        return this.invisible;
    }
};

export default Player;