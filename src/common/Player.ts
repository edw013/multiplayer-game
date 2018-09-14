import GameObject from "../GameObject";
import { Input, Buffs, Debuffs } from "./Utilities";

const DEBUG: boolean = false;

class Player extends GameObject {
    private score: number;
    private moveSpeed: number;
    private alive: boolean;
    private recentDead: boolean;
    // for scoring purposes if multiple people die at the same time
    private recentDeadScore: boolean;
    private lastTS: number;
    private item: string;
    private itemType: string;
    private weapon: string;
    private ammo: number;
    private powerup: string;
    private powerupBuffs: Buffs;
    private buffTimer: NodeJS.Timer;
    private debuffs: Debuffs;
    private deathReason: string;

    public constructor(id: string) {
        super(id);
        this.objType = "player";
        this.score = 0;
        this.moveSpeed = 200;
        this.color = this.getRandomColor();
        this.outlineColor = this.getRandomColor();
        this.width = 60;
        this.height = 60;
        this.alive = true;
        this.recentDead = false;
        this.recentDeadScore = false;
        this.lastTS = Date.now();

        this.item = "none";

        this.ammo = 0;

        this.powerupBuffs = new Buffs();

        this.debuffs = new Debuffs();
    }

    public isAlive(): boolean {
        return this.alive;
    }

    public isRecentDead(): boolean {
        return this.recentDead;
    }

    public resetRecentDead() {
        this.recentDead = false;
        this.recentDeadScore = true;
    }

    public isRecentDeadScore(): boolean {
        return this.recentDeadScore;
    }

    public resetRecentDeadScore() {
        this.recentDeadScore = false;
    }

    public die(reason: string) {
        if (DEBUG) {
            console.log(this.id + " died to " + reason);
        }
        this.alive = false;
    
        this.recentDead = true;
        this.deathReason = reason;
    }

    public getDeathReason(): string {
        return this.deathReason;
    }

    public getLastTS(): number {
        return this.lastTS;
    }

    public setLastTS(ts: number) {
        this.lastTS = ts;
    }

    public incrementScore() {
        this.score++;
    }

    public setScore(score: number) {
        this.score = score;
    }
    
    public getScore(): number {
        return this.score;
    }

    public applyInput(input: Input) {
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

    public hasItem(): boolean {
        return !(this.item === null);
    }

    public addItem(type: string) {
        // bad ones are instant use, others are stored
        if (type === "fall") {
            this.die("you fell to your death");
        }
        else if (type === "trap") {
            if (this.powerupBuffs.ms) {
                this.removePowerup();
            }
            this.moveSpeed = 0;
            this.debuffs.trapped = true;

            setTimeout(() => {
                this.debuffs.trapped = false;
                this.moveSpeed = 200;
            }, 1000 * 10);
        }
        else if (type === "fire") {
            if (this.powerup) {
                this.removePowerup();
            }

            this.item = "none";

            this.debuffs.fire = true;

            setTimeout(() => {
                this.die("you burned to death");
            }, 1000 * 5);
        }
        else {
            this.item = type;

            if (type === "invis" || type === "star" || type === "ms") {
                this.itemType = "powerup";
            }
            else {
                this.itemType = "weapon";
            }
        }
    }

    public getItem(): string {
        return this.item;
    }

    public useItem(): string {
        if (this.item === "none") {
            return;
        }

        if (this.itemType === "powerup") {
            this.applyPowerup();
        }
        else {
            this.applyWeapon();
        }
    }

    public getPowerup(): string {
        return this.powerup;
    }

    public getPowerups(): Buffs {
        return this.powerupBuffs;
    }

    public setPowerups(powerups: Buffs) {
        this.powerupBuffs = powerups;
    }

    public getDebuffs(): Debuffs {
        return this.debuffs;
    }

    public setDebuffs(debuffs: Debuffs) {
        this.debuffs = debuffs;
    }

    public applyPowerup() {
        // one buff at a time
        if (this.powerup) {
            this.removePowerup();
        }

        // change invincibility or ammo or whatever
        this.togglePowerups(this.item, true);
            
        this.powerup = this.item;
        this.item = "none";
        this.itemType = null;

        // start timer
        this.buffTimer = setTimeout(() => {
            this.removePowerup();
        }, 1000 * 15);
    }

    public removePowerup() {
        // unset invincibility or ammo or whatever
        this.togglePowerups(this.powerup, false);

        this.powerup = null;

        clearTimeout(this.buffTimer);
    }

    public applyWeapon() {
        if (this.weapon) {
            this.removeWeapon();
        }

        this.weapon = this.item;
        this.item = "none";
        this.itemType = null;

        if (this.weapon === "gun") {
            this.ammo = 2;
        }
        else if (this.weapon === "bomb") {
            this.ammo = 1;
        }
    }

    public removeWeapon() {
        this.weapon = null;
    }

    public getWeapon(): string {
        return this.weapon;
    }

    public setWeapon(weapon: string) {
        this.weapon = weapon;
    }

    public getAmmo(): number {
        return this.ammo;
    }

    public setAmmo(ammo: number) {
        this.ammo = ammo;
    }

    private togglePowerups(type: string, toggle: boolean) {
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
                    this.moveSpeed = 400;
                }
                else {
                    this.moveSpeed = 200;
                }

                break;
        }
    }

    public isInvisible(): boolean {
        return this.powerupBuffs.invisible;
    }

    public isInvincible(): boolean {
        return this.powerupBuffs.invincible;
    }

    public isMs(): boolean {
        return this.powerupBuffs.ms;
    }

    public isFire(): boolean {
        return this.debuffs.fire;
    }

    public isTrapped(): boolean {
        return this.debuffs.trapped;
    }
};

export default Player;