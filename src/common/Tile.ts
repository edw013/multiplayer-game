import GameObject from "./GameObject";

const LUCK: number = 0.7;
// "star", "ms", "invis", "bomb", 
const GOOD: string[] = ["star", "ms", "invis", "gun"];
const BAD: string[] = ["fall", "trap", "fire"];

class Tile extends GameObject {
    private type: string;

    constructor(id: string) {
        super(id);

        this.objType = "tile";
        this.setHeight(50);
        this.setWidth(50);

        this.color = "yellow";
        this.outlineColor = "black";

        if (Math.random() > LUCK) {
            this.type = BAD[Math.floor(Math.random() * BAD.length)];
        }
        else {
            this.type = GOOD[Math.floor(Math.random() * GOOD.length)];
        }
    }

    getType(): string {
        return this.type;
    }
};

export default Tile;