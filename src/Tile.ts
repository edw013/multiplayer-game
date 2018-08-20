import Player from "./Player";

class Tile {
    // up to 4, given players can approach from 4 sides
    private players: Player[];

    constructor() {
        this.players = [];
    }

    addPlayer(player: Player) {
        this.players.push(player);
    }

    resolveCombat(): Player {
        let p1: Player = this.players[0];
        let p2: Player = this.players[1];
        /*let p1Attack: number = p1.getAttack() / p2.getDefense();
        let p2Attack: number = p2.getAttack() / p1.getDefense();

        let odds: number = p1Attack / (p1Attack + p2Attack);

        let roll: number = Math.random();

        if (roll < odds) {
            p1.incrementKills();
            p2.toggleAlive();

            return p2;
        }
        else {
            p2.incrementKills();
            p1.toggleAlive;

            return p1;
        }*/

        return null;
    }
};

export default Tile;