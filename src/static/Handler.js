import io from 'socket.io-client';
import Client from "./Client";

let element = function (id) {
    return document.getElementById(id);
};

var socket = io.connect();

var client = null;
socket.on("connect", () => {
    client = new Client(socket, element("client_canvas"), element("inRoom"), element("item"), element("powerup"), element("weapon"), element("ammo"), element("debuff"), element("death"));
});

// When the player presses the arrow keys, set the corresponding flag in the client.
let keyHandler = function (e) {
    e = e || window.event;
    if (e.key == "d") {
        client.movement.right = (e.type == "keydown");
    } else if (e.key == "a") {
        client.movement.left = (e.type == "keydown");
    } else if (e.key == "w") {
        client.movement.up = (e.type == "keydown");
    } else if (e.key == "s") {
        client.movement.down = (e.type == "keydown");
    } else if (e.key == "Enter") {
        client.useItem();
    }
};

let canvas = element("client_canvas");
let mouseHandler = function (e) {
    let rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    client.shot(x, y);
}
//document.body.onmousedown = mouseHandler;

let createRoomButton = element("createRoom");
let createRoom = function() {
    let roomId = element("roomName").value;
    let roomNumUsers = element("roomNumUsers").value;
    
    if (client === undefined) {
        alert("Client not finished loading yet, try again.");
    }

    if (roomId === "") {
        alert("No room name entered.");
    }

    if (roomNumUsers < 2) {
        alert("Must be greater than 2.");
    }

    client.createRoom(roomId, roomNumUsers);
}
createRoomButton.addEventListener("click", createRoom);

socket.on("currentRooms", function(rooms) {
    let curRooms = element("currentRooms");
    for (let opt in curRooms.options) { 
        curRooms.options.remove(0); 
    }
    for (let i = 0; i < rooms.length; i++) {
        let room = rooms[i];
        let opt = document.createElement("option")
        opt.text = room;
        opt.value = room;

        curRooms.appendChild(opt);
    }
});

let joinRoomButton = element("joinRoom");
let joinRoom = function() {
    let select = element("currentRooms");
    let roomId;
    if (select.options[select.selectedIndex]) {
        roomId = select.options[select.selectedIndex].value;
    }
    else {
        roomId = "";
    }

    if (client === undefined) {
        alert("Client not finished loading yet, try again.");
    }

    if (roomId === "") {
        alert("No rooms found. Try creating one.");
    }

    client.joinRoom(roomId);
}
joinRoomButton.addEventListener("click", joinRoom);

let leaveRoomButton = element("leaveRoom");
let leaveRoom = function() {
    client.leaveRoom();
}
leaveRoomButton.addEventListener("click", leaveRoom);

let startGameButton = element("startGame");
let startGame = function() {
    client.signalStartGame();
}
startGameButton.addEventListener("click", startGame);

socket.on("boardDimensions", function(dimensions) {
    element("client_canvas").width = dimensions.width;
    element("client_canvas").height = dimensions.height;
});

socket.on("selfPlayerState", function(data) {
    client.addSelfUpdate(data);
});

socket.on("playerState", function(data) {
    console.log(data);
    client.addServerPlayerPosition(data);
});

socket.on("projectileState", function(data) {
    client.addServerProjectilePosition(data);
});

socket.on("tileState", function(data){
    client.addServerTilePosition(data);
});

socket.on("startCountdown", function() {
    client.initialize();
});

socket.on("startGame", function() {
    document.body.onkeydown = keyHandler;
    document.body.onkeyup = keyHandler;
    canvas.addEventListener("click", mouseHandler, false);

    client.startGame();
});