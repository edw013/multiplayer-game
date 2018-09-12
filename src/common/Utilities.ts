class Input {
    public room: string;
    public id: string;
    public pressTime: number;
    public movement: Movement;
    public ts: number;

    public constructor(room: string, id: string, pressTime: number, movement: Movement, ts: number) {
        this.room = room;
        this.id = id;
        this.pressTime = pressTime;
        this.movement = movement;
        this.ts = ts;
    }
}

class Movement {
    public up: boolean;
    public down: boolean;
    public right: boolean;
    public left: boolean;

    public constructor() {
        this.up = false;
        this.down = false;
        this.right = false;
        this.left = false;
    }
}

class Buffs {
    public invincible: boolean;
    public invisible: boolean;
    public ms: boolean;

    public constructor() {
        this.invincible = false;
        this.invisible = false;
        this.ms = false;
    }
}

class Debuffs {
    public fire: boolean;
    public trapped: boolean;

    public constructor() {
        this.fire = false;
        this.trapped = false;
    }
}

class SelfPlayerState {
    public width: number;
    public x: number;
    public y: number;
    public ts: number;
    public alive: boolean;
    public score: number;
    public deathMessage: string;
    public item: string;
    public powerups: Buffs;
    public debuffs: Debuffs;
    public weapon: string;
    public ammo: number
    public outlineColor: string;
    public fillColor: string;

    public constructor(width: number, x: number, y: number, ts: number, alive: boolean, score: number, deathMessage: string, item: string, powerups: Buffs, debuffs: Debuffs, weapon: string, ammo: number, outlineColor: string, fillColor: string) {
        this.width = width;
        this.x = x;
        this.y = y;
        this.ts = ts;
        this.alive = alive;
        this.score = score;
        this.deathMessage = deathMessage;
        this.item = item;
        this.powerups = powerups;
        this.debuffs = debuffs;
        this.weapon = weapon;
        this.ammo = ammo;
        this.outlineColor = outlineColor;
        this.fillColor = fillColor;
    }
}
// TODO: inheritance for these 3?
class PlayerState {
    public id: string;
    public width: number;
    public x: number;
    public y: number;
    public powerups: Buffs;
    public debuffs: Debuffs;
    public outlineColor: string;
    public fillColor: string;

    public constructor(id: string, width: number, x: number, y: number, powerups: Buffs, debuffs: Debuffs, outlineColor: string, fillColor: string) {
        this.id = id;
        this.width = width;
        this.x = x;
        this.y = y;
        this.powerups = powerups;
        this.debuffs = debuffs;
        this.outlineColor = outlineColor;
        this.fillColor = fillColor;
    }
}

class ProjectileState {
    public width: number;
    public x: number;
    public y: number;
    public outlineColor: string;
    public fillColor: string;

    public constructor(width: number, x: number, y: number, outlineColor: string, fillColor: string) {
        this.width = width;
        this.x = x;
        this.y = y;
        this.outlineColor = outlineColor;
        this.fillColor = fillColor;
    }
}

class TileState {
    public x: number;
    public y: number;

    public constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

class ShotState {
    public room: string;
    public id: string;
    public x: number;
    public y: number;

    public constructor(room: string, id: string, x: number, y: number) {
        this.room = room;
        this.id = id;
        this.x = x;
        this.y = y;
    }
}

export { Input, Movement, Buffs, Debuffs, SelfPlayerState, PlayerState, ProjectileState, TileState, ShotState };