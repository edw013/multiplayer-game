import * as socketIo from "socket.io";
import Engine from "./Engine";

class Room {
    private id: string;
    private roomSize: number;
    private roomOwner: string;
    private numPlayers: number;
    private players: Set<string>;
    private engine: Engine;
    private socket: socketIo.Server;
    private ready: boolean;
    private started: boolean;

    public constructor(id: string, roomSize: number, roomOwner: string, socket: socketIo.Server) {
        this.id = id;
        this.roomSize = roomSize;
        this.roomOwner = roomOwner;
        this.socket = socket;

        this.players = new Set<string>();
        this.numPlayers = 0;
        this.ready = false;
        this.started = false;

        this.addPlayer(roomOwner);
    }

    public addPlayer(id: string): boolean {
        // at capacity
        if (this.ready) {
            return false;
        }

        this.players.add(id);
        this.numPlayers++;

        if (this.numPlayers == this.roomSize) {
            this.ready = true;
        }

        return true;
    }

    public removePlayer(id: string): string {
        this.players.delete(id);
        this.numPlayers--;

        this.ready = false;

        if (this.numPlayers > 0) {
            this.roomOwner = this.players.values().next().value;
        }
        else {
            this.roomOwner = null;
        }
        
        return this.roomOwner;
    }

    public start(id: string) {
        if (!this.ready || id != this.roomOwner || this.started) {
            return;
        }

        // pass in players
        this.engine = new Engine(this.id, this.players, this.socket);

        // move to game board
        // this.socket.to(this.id).emit("moveToGame");

        console.log("starting game in room " + this.id);

        this.started = true;
        this.engine.initializeGame();
        this.engine.startCountdown();
    }

    public delete() {
        if (this.engine !== undefined) {
            this.engine.shutdown();
        }
    }

    public addMove(move) {
        this.engine.addMove(move);
    }

    public addItemUse(data) {
        this.engine.itemUse(data.id);
    }

    public addShoot(data) {
        this.engine.registerShot(data);
    }

    public getRoomSize(): number {
        return this.roomSize;
    }

    public getNumPlayers(): number {
        return this.numPlayers;
    }

    public isStarted(): boolean {
        return this.started;
    }
}

export default Room;