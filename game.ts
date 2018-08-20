const BOARD_SCALE: number = 2;

class Game {
    private id: string;
    private players: Player[];
    private numPlayers: number;
    private alivePlayers: Player[];
    private boardSize: number;
    private board: Tile[][];
    private combatTiles: Tile[]

    constructor(id: string, players: Player[]) {
        this.id = id
        this.players = players;
        this.numPlayers = players.length;
        this.alivePlayers = players;
        this.boardSize = this.numPlayers * BOARD_SCALE;

        // create our board, proportional to num players
        this.board = [];
        for (let i: number = 0; i < this.boardSize; i++) {
            this.board[i] = [];
            for (let j: number = 0; j < this.boardSize; j++) {
                this.board[i][j] = new Tile();
            }
        }

        this.initializePositions();

        this.combatTiles = [];
    }

    initializePositions() {
        let perimeter: number = 4 * this.boardSize - 4;
        let increment: number = Math.floor(perimeter / this.numPlayers);

        let sideLength: number = this.boardSize - 1;

        // fill in around the board
        let x: number = 0;
        let y: number = 0;
        for (let i: number = 0; i < this.numPlayers; i++) {
            this.board[x][y].addPlayer(this.players[i]);

            console.log(x, y);

            let remaining: number = 0;
            if (x < sideLength && y == 0) {
                x += increment;
                if (x > sideLength) {
                    remaining = x - sideLength;
                    x = sideLength;
                }

                // we must have been on top, going down
                y += remaining;
            }
            else if (x == sideLength && y < sideLength) {
                y += increment;
                if (y > sideLength) {
                    remaining = y - sideLength;
                    y = sideLength;
                }

                // we must have been going down, going left
                x -= remaining;
            }
            else {
                // it's not possible to go around more than once
                x -= increment;
            }
        }
    }

    // begin movement, if overlap add to combat tiles
    startTurn() {
        for (let player of this.alivePlayers) {
            player.move();
        }
    }

    // begin combat, after movement check for combatTiles, then shrink board if appropriate
    endTurn() {
        for (let tile of this.combatTiles) {
            let deadPlayers: Player[] = tile.resolveCombat();

            // remove players
        }

        if(this.alivePlayers.length == 1) {
            this.endGame();
        }

        this.resizeBoard();
    }

    resizeBoard() {

    }

    endGame() {

    }
};

class Tile {
    // up to 4, given players can approach from 4 sides
    private players: Player[];

    constructor() {
        this.players = [];
    }

    addPlayer(player: Player) {
        this.players.push(player);
    }

    resolveCombat(): Player[] {
        // refactor for up to 4 players, runs at end of turn
        /*let p1Attack: number = p1.getAttack() / p2.getDefense();
        let p2Attack: number = p2.getAttack() / p1.getDefense();

        let odds: number = p1Attack / (p1Attack + p2Attack);

        let roll: number = Math.random();

        if (roll < odds) {
            p1.incrementKills();
            p2.toggleAlive();
        }
        else {
            p2.incrementKills();
            p1.toggleAlive;
        }

        // turn based - kind of. every turn all indexes are updated, and at the end of the turn
        // resolve all collisions. then shrink the map every 2 turns?
        
        this.alivePlayers.remo

        if(this.alivePlayers == 1) {
            this.endGame();
        }*/

        return null;
    }
};

class Player {
    private id: String;
    private attack: number;
    private defense: number;
    private isAlive: boolean;
    private numKills: number;

    constructor(id: String) {
        this.id = id;
        this.attack = 1;
        this.defense = 1;
        this.isAlive = true;
        this.numKills = 0;
    }

    getAttack(): number {
        return this.attack;
    }

    setAttack(attack: number) {
        this.attack = attack;
    }

    getDefense(): number {
        return this.defense;
    }

    setDefense(defense: number) {
        this.defense = defense;
    }

    toggleAlive() {
        // this really should only be used to set to dead though
        this.isAlive = !this.isAlive;
    }

    incrementKills() {
        this.numKills++;
    }

    move() {

    }
};

module.exports = {Game, Tile, Player};