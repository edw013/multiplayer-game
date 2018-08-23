import GameObject from "./GameObject";

const LUCK: number = 0.7;
const GOOD: string[] = ["star", "gun", "bomb", "ms", "invis"];
const BAD: string[] = ["fall", "trap", "fire"];

class Tile extends GameObject {
    id: string;
    type: string;
    players: any[];

    constructor(id) {
        super(id);

        this.objType = "tile";
        this.setHeight(50);
        this.setWidth(50);

        if (Math.random() > LUCK) {
            this.type = BAD[Math.floor(Math.random() * BAD.length)];
        }
        else {
            this.type = GOOD[Math.floor(Math.random() * GOOD.length)];
        }

        this.players = [];
    }

    getType(): string {
        return this.type;
    }

    addPlayer(time, playerId) {
        this.players.push({ts: time, id: playerId});
    }

    getPlayers(): any[] {
        return this.players;
    }
};

export default Tile;