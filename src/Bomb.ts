import GameObject from "./GameObject";

class Bomb extends GameObject {
    private parentId: string;
    private exploded: boolean;
    private destroyed: boolean;

    public constructor(id: string, pid: string, targetX: number, targetY: number) {
        super(id);

        this.width = 40;
        this.height = 40;

        this.color = "black";
        this.outlineColor = "yellow";

        this.objType = "bomb";

        this.xPos = targetX;
        this.yPos = targetY;

        this.parentId = pid;
        this.exploded = false;
        this.destroyed = false;
    }

    public getParentId(): string {
        return this.parentId;
    }

    public destroy() {
        this.destroyed = true;
    }

    public isDestroyed(): boolean {
        return this.destroyed;
    }

    public start() {
        setTimeout(() => {
            this.explode();
        }, 1000 * 3);
    }

    public explode() {
        this.color = "red";
        this.width = 120;
        this.height = 120;
        this.exploded = true;

        setTimeout(() => {
            this.destroy();
        }, 1000 * 0.5);
    }

    public isExploded(): boolean {
        return this.exploded;
    }
}

export default Bomb;