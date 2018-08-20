import User from "./User";
import Player from "./Player";
import Tile from "./Tile";

const BOARD_SCALE: number = 2;

class Game {
    private id: string;
    private players: User[];
    private numPlayers: number;
    private alivePlayers: Player[];
    private boardSize: number;
    private board: Tile[][];
    private combatTiles: Tile[]

    constructor(id: string, numPlayers: number) {
        this.id = id
        this.players = [];
        this.numPlayers = numPlayers;
        this.alivePlayers = [];
        this.boardSize = this.numPlayers * BOARD_SCALE;

        // create our board, proportional to num players
        this.board = [];
        for (let i: number = 0; i < this.boardSize; i++) {
            this.board[i] = [];
            for (let j: number = 0; j < this.boardSize; j++) {
                this.board[i][j] = new Tile();
            }
        }

        this.combatTiles = [];
    }

    addPlayer(user: User) {
        this.players.push(user);

        let player: Player = new Player(user);
        this.alivePlayers.push(player);

        if (this.players.length == this.numPlayers) {
            this.startGame();
        }
    }

    startGame() {
        this.initializePositions();

        // emit starting board
    }

    initializePositions() {
        let perimeter: number = 4 * this.boardSize - 4;
        let increment: number = Math.floor(perimeter / this.numPlayers);

        let sideLength: number = this.boardSize - 1;

        // fill in around the board
        let x: number = 0;
        let y: number = 0;
        for (let i: number = 0; i < this.numPlayers; i++) {
            this.board[x][y].addPlayer(this.alivePlayers[i]);

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

    resizeBoard() {

    }

    endGame() {

    }
};

export default Game;