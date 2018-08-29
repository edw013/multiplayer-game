import GameObject from "./GameObject";

class Player extends GameObject {
    private numKills: number;
    private moveSpeed: number;
    private alive: boolean;
    private recentDead: boolean;
    private lastTS: any;
    private item: string;
    private itemType: string;
    private weapon: string;
    private powerup: string;
    private powerupBuffs: any;
    private buffTimer: any;
    private debuffs: any;
    private debuffTimer: any;

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
        this.recentDead = false;
        this.lastTS = Date.now();

        this.item = "none";

        this.powerupBuffs = {};
        this.powerupBuffs.invincible = false;
        this.powerupBuffs.invisible = false;
        this.powerupBuffs.ms = false;

        this.debuffs = {};
        this.debuffs.fire = false;
        this.debuffs.trapped = false;
    }

    isAlive(): boolean {
        return this.alive;
    }

    isRecentDead(): boolean {
        return this.recentDead;
    }

    resetRecentDead() {
        this.recentDead = false;
    }

    die() {
        this.alive = false;
    
        this.recentDead = true;
    }

    getLastTS(): any {
        return this.lastTS;
    }

    setLastTS(ts: any) {
        this.lastTS = ts;
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

    hasItem(): boolean {
        return !(this.item == null);
    }

    addItem(type: string) {
        // bad ones are instant use, others are stored
        if (type == "trap") {
            this.moveSpeed = 0;
            this.debuffs.trapped = true;

            this.debuffTimer = setTimeout((function(self) {
                return function() {
                    self.debuffs.trapped = false;
                    self.moveSpeed = 200;
                };
            })(this), 1000 * 10);
        }
        else if (type == "fire") {
            if (this.powerup) {
                this.removePowerup(this.powerup);
            }

            this.debuffs.fire = true;

            this.debuffTimer = setTimeout((function(self) {
                return function() {
                    self.die();
                };
            })(this), 1000 * 15);
        }
        else {
            this.item = type;
            this.itemType = "powerup";
        }
    }

    getItem(): string {
        return this.item;
    }

    useItem(): string {
        if (!this.item) {
            return;
        }

        if (this.itemType == "powerup") {
            this.applyPowerup();
        }
        else {
            // apply weapon
            return;
        }
    }

    getPowerup(): string {
        return this.powerup;
    }

    getPowerups(): any {
        return this.powerupBuffs;
    }

    setPowerups(powerups: any) {
        this.powerupBuffs = powerups;
    }

    applyPowerup() {
        // one buff at a time
        if (this.powerup) {
            this.removePowerup(this.powerup);
        }

        // change invincibility or ammo or whatever
        this.togglePowerups(this.item, true);
            
        this.powerup = this.item;
        this.item = "none";
        this.itemType = null;

        // start timer
        this.buffTimer = setTimeout((function(self) {
            return function() {
                self.removePowerup(self.powerup);
            };
        })(this), 1000 * 15);
    }

    removePowerup(type: string) {
        // unset invincibility or ammo or whatever
        this.togglePowerups(type, false);

        this.powerup = null;

        clearTimeout(this.buffTimer);
    }

    togglePowerups(type: string, toggle: boolean) {
        switch (type) {
            case "star":
                this.powerupBuffs.invincible = toggle;
                break;
            case "invis":
                this.powerupBuffs.invisible = toggle;
                break;
            case "ms":
                this.powerupBuffs.ms = toggle;

                if (this.powerupBuffs.ms) {
                    this.moveSpeed *= 2;
                }
                else {
                    this.moveSpeed /= 2;
                }

                break;
        }
    }

    isInvisible(): boolean {
        return this.powerupBuffs.invisible;
    }

    isInvincible(): boolean {
        return this.powerupBuffs.invincible;
    }

    isMs(): boolean {
        return this.powerupBuffs.ms;
    }

    isFire(): boolean {
        return this.debuffs.fire;
    }

    isTrapped(): boolean {
        return this.debuffs.trapped;
    }
};

export default Player;