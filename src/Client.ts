import * as io from "socket.io-client";
import Player from "./Player";

const TICKRATE: number = 60;

// OUT OF DATE, WE'RE NOT USING THIS ATM
class Client {
    players: {};
    player: Player;
    playerId: string;
    moves: any[];
    updateInterval;
    socket;
    lastTS;
    movement: {};
    savedMoves: any[];
    serverMessages: any[];
    canvas;
    
    constructor(socket, canvas) {
        this.socket = socket;
        
        this.playerId = this.socket.id;

        this.player = new Player(this.playerId);
        this.players[this.playerId] = this.player;
    
        this.setUpdateInterval();

        this.moves = [];

        this.lastTS = Date.now();

        this.movement = {};
        this.movement["up"] = false;
        this.movement["down"] = false;
        this.movement["right"] = false;
        this.movement["left"] = false;

        this.savedMoves = [];

        this.serverMessages = [];

        this.canvas = canvas;
    }

    setUpdateInterval() {
        clearInterval(this.updateInterval);

        this.updateInterval = setInterval(function() {
            this.updatePositions();
            this.processServerPositions();
            this.repaint();
        }, 1000.0 / TICKRATE);
    }

    updatePositions() {
        let now = Date.now();
        let lastTS = this.lastTS;
        let pressTime = (now - lastTS) / 1000.0;
        this.lastTS = now;

        let input;
        if (this.movement["up"] || this.movement["down"] || this.movement["left"] || this.movement["right"]) {
            input = {pressTime: pressTime, movement: this.movement, ts: now};
        }
        else {
            return;
        }

        this.socket.emit("move", input);

        this.player.applyInput(input);

        this.savedMoves.push(input);

        while(this.savedMoves.length > 30) {
            this.savedMoves.shift();
        }
    }

    processServerMessages() {
        while(this.serverMessages.length > 0) {
            let message = this.serverMessages.shift();

            let pid = message.playerId;

            if(pid == this.playerId) {
                this.updateSelfPosition(message);
            }
            else {
                this.updateOtherPosition(message);
            }
            
        }
    }

    updateSelfPosition(message) {
        let serverTS = message.ts;
        this.player.setX(message.x);
        this.player.setY(message.y);

        this.savedMoves = this.savedMoves.filter(savedMove => {savedMove.ts > serverTS});

        this.savedMoves.forEach(savedMove => {
            this.player.applyInput(savedMove);
        });
    }

    updateOtherPosition(message) {
        let player = this.players[message.playerId];

        player.setX(message.x);
        player.setY(message.y);
    }

    repaint() {
        this.canvas.width = this.canvas.width;

        for (let key in this.players) {
            let player = this.players[key];

            let radius = 30;
            let x = (player.getX() / 10.0) * this.canvas.width;
            let y = (player.getY() / 10.0) * this.canvas.height;

            let ctx = this.canvas.getContext("2d");
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2*Math.PI, false);
            ctx.fillStyle = player.color;
            ctx.fill();
            ctx.lineWidth = 5;
            ctx.strokeStyle = player.color;
            ctx.stroke();
        }
    }

}