import GameObject from "./GameObject";

class Bomb extends GameObject {
    private destroyed: boolean;

    constructor(id, targetX, targetY) {
        super(id);

        this.width = 150;
        this.height = 150;

        this.color = "red";
        this.outlineColor = "yellow";

        this.objType = "bomb";

        this.destroyed = false;
    }

    destroy() {
        this.destroyed = true;
    }

    isDestroyed(): boolean {
        return this.destroyed;
    }
}

export default Bomb;