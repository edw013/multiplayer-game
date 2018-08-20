var BOARD_SCALE = 2;
var Game = /** @class */ (function () {
    function Game(id, players) {
        this.id = id;
        this.players = players;
        this.numPlayers = players.length;
        this.boardSize = this.numPlayers * BOARD_SCALE;
        // create our board, proportional to num players
        this.board = [];
        for (var i = 0; i < this.boardSize; i++) {
            this.board[i] = [];
            for (var j = 0; j < this.boardSize; j++) {
                this.board[i][j] = new Tile();
            }
        }
    }
    Game.prototype.initializePositions = function () {
        var perimeter = 4 * this.boardSize - 4;
        var increment = Math.floor(perimeter / this.numPlayers);
        var sideLength = this.boardSize - 1;
        // fill in around the board
        // TODO: test
        var x = 0;
        var y = 0;
        for (var i = 0; i < this.numPlayers; i++) {
            this.board[x][y].set(this.players[i]);
            console.log(x, y);
            var remaining = 0;
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
    };
    return Game;
}());
;
var Tile = /** @class */ (function () {
    function Tile() {
    }
    Tile.prototype.set = function (player) {
        this.occupied = true;
        this.player = player;
    };
    return Tile;
}());
;
var Player = /** @class */ (function () {
    function Player() {
    }
    return Player;
}());
;
module.exports = { Game: Game, Tile: Tile, Player: Player };
