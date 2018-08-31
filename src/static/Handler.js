import io from 'socket.io-client';
import Client from "./Client";

let element = function (id) {
    return document.getElementById(id);
};

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

document.body.onkeydown = keyHandler;
document.body.onkeyup = keyHandler;

var canvas = element("client_canvas");
let mouseHandler = function (e) {
    let rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    client.shot(x, y);
}

document.body.onmousedown = mouseHandler;

var socket = io.connect();

var client = null;
socket.on("connect", () => {
    client = new Client(socket, element("client_canvas"), element("item"), element("powerup"), element("weapon"), element("ammo"), element("debuff"), element("death"));
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

/* socket.on("newPlayer", function(data) {
    client.addPlayer(data);
});*/

socket.on("removePlayer", function(id) {
    client.removePlayer(id);
});

socket.on("newTile", function(data) {
    client.addTile(data);
});

socket.on("removeTile", function(id) {
    client.removeTile(id);
});

socket.on("death", function(data) {
    for (let i = 0; i < data.length; i++) {
        client.addServerPlayerDeath(data[i]);
    }
});

socket.on("projectileDeath", function(data) {
    for (let i = 0; i < data.length; i++) {
        client.addServerProjectileDeath(data[i]);
    }
});

socket.on("playerState", function(data) {
    for (let i = 0; i < data.length; i++) {
        client.addServerPlayerPosition(data[i]);
    }
});

socket.on("projectileState", function(data) {
    for (let i = 0; i < data.length; i++) {
        client.addServerProjectilePosition(data[i]);
    }
});