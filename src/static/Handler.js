import io from 'socket.io-client';
import Client from "../common/Client";

let element = function (id) {
    return document.getElementById(id);
};

// When the player presses the arrow keys, set the corresponding flag in the client.
var keyHandler = function (e) {
    e = e || window.event;
    if (e.key == 'd') {
        client.movement.right = (e.type == "keydown");
    } else if (e.key == 'a') {
        client.movement.left = (e.type == "keydown");
    } else if (e.key == 'w') {
        client.movement.up = (e.type == "keydown");
    } else if (e.key == 's') {
        client.movement.down = (e.type == "keydown");
    }
};

document.body.onkeydown = keyHandler;
document.body.onkeyup = keyHandler;

var socket = io.connect();

var client = null;
socket.on("connect", () => {
    client = new Client(socket, element("client_canvas"), element("score"));
});

socket.on("curPlayers", function(data) {
    client.setPlayers(data);
});

socket.on("curTiles", function(data) {
    client.setTiles(data);
});

socket.on("canvasSize", function(dimensions) {
    element("client_canvas").width = dimensions.width;
    element("client_canvas").height = dimensions.height;
});

socket.on("newPlayer", function(data) {
    client.addPlayer(data);
});

socket.on("removePlayer", function(id) {
    client.removePlayer(id);
});

socket.on("newTile", function(data) {
    client.addTile(data);
});

socket.on("removeTile", function(id) {
    client.removeTile(id);
});

socket.on("gameState", function(data) {
    for (let i = 0; i < data.length; i++) {
        client.serverMessages.push(data[i]);
    }
});