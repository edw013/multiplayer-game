import GameObject from "./GameObject";

class Bullet extends GameObject {
    private ySpeed: number;
    private xSpeed: number;
    private destroyed: boolean;

    constructor(id: string, initX: number, initY: number, deltaX: number, deltaY: number) {
        super(id);

        this.objType = "bullet";
        this.width = 10;
        this.height = 10;

        this.color = "black";
        this.outlineColor = "black";

        let ms = 400;

        let xDir = (deltaX < 0) ? -1 : 1;
        let yDir = (deltaY < 0) ? -1 : 1;
        let theta = Math.atan(Math.abs(deltaY / deltaX));
        this.xSpeed = xDir * ms * Math.cos(theta);
        this.ySpeed = yDir * ms * Math.sin(theta);

        // starting point has to be outside player because i'm lazy
        let hypotenuse = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
        // 40 is slightly bigger than player radius
        let ratio = 40 / hypotenuse;
        this.xPos = initX + deltaX * ratio;
        this.yPos = initY + deltaY * ratio;

        this.destroyed = false;
    }

    updatePosition(rate: number) {
        this.xPos += this.xSpeed * rate;
        this.yPos += this.ySpeed * rate;
    }

    destroy() {
        this.destroyed = true;
    }

    isDestroyed(): boolean {
        return this.destroyed;
    }
}

export default Bullet;