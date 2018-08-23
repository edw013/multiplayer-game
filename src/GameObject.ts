class GameObject {
    id: string;
    xPos: number;
    yPos: number;
    width: number;
    height: number;
    objType: string;

    constructor(id: string) {
        this.id = id;
    }

    getId(): string {
        return this.id;
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

    getWidth(): number {
        return this.width;
    }

    setWidth(width: number) {
        this.width = width;
    }

    getHeight(): number {
        return this.height;
    }

    setHeight(height: number) {
        this.height = height;
    }

    getObjType(): string {
        return this.objType;
    }
}

export default GameObject;