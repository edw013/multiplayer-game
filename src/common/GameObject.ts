abstract class GameObject {
    protected id: string;
    protected xPos: number;
    protected yPos: number;
    protected width: number;
    protected height: number;
    protected color: string;
    protected outlineColor: string;
    protected objType: string;

    protected constructor(id: string) {
        this.id = id;
    }

    protected getRandomColor(): string {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++) {
          color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    public getId(): string {
        return this.id;
    }

    public getX(): number {
        return this.xPos;
    }

    public setX(x: number) {
        this.xPos = x;
    }

    public getY(): number {
        return this.yPos;
    }

    public setY(y: number) {
        this.yPos = y;
    }

    public getWidth(): number {
        return this.width;
    }

    public setWidth(width: number) {
        this.width = width;
    }

    public getHeight(): number {
        return this.height;
    }

    public setHeight(height: number) {
        this.height = height;
    }

    public setColor(color: string) {
        this.color = color;
    }

    public getColor(): string {
        return this.color;
    }

    public setOutlineColor(color: string) {
        this.outlineColor = color;
    }
    
    public getOutlineColor(): string {
        return this.outlineColor;
    }

    public getObjType(): string {
        return this.objType;
    }
}

export default GameObject;