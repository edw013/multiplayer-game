import User from "./User"

class Player {
    private user: User;
    private numKills: number;
    private moveSpeed: number;

    constructor(user: User) {
        this.user = user;
        this.numKills = 0;
        this.moveSpeed = 1;
    }

    incrementKills() {
        this.numKills++;
    }

    move() {
        // random direction, add to tile, remove from tile
    }
};

export default Player;