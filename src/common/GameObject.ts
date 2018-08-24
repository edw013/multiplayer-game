class GameObject {
    protected id: string;
    protected xPos: number;
    protected yPos: number;
    protected width: number;
    protected height: number;
    protected color: string;
    protected outlineColor: string;
    protected objType: string;

    constructor(id: string) {
        this.id = id;
    }

    getRandomColor(): string {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++) {
          color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
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

    getColor(): string {
        return this.color;
    }

    getOutlineColor(): string {
        return this.outlineColor;
    }

    getObjType(): string {
        return this.objType;
    }
}

export default GameObject;