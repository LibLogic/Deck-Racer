const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const server = app.listen(port);
app.use(express.static("public"));

<<<<<<< HEAD
const socket = require("ws").Server;

const ss = new socket({ server: server });
=======
const port = process.env.PORT || 5500;

const ss = new server({
  port: port
});
>>>>>>> webSockets_v4

let playerList = [];
let gameLength = [];
let gameHand = [];
let length = [];
ss.on("connection", ws => {
  ss.clients.forEach(client => {
<<<<<<< HEAD
    console.log(ss.clients.size);
    console.log(gameLength[0], "gameLength");
    if (gameLength && ss.clients.size > gameLength[0]) {
      ws.close();
    }
    ws.clientId = ss.clients.size - 1;
=======
    console.log(gameLength[0], "gameLength");
    if (gameLength && ss._server._connections > gameLength[0]) {
      ws.close();
    }
    ws.clientId = ss._server._connections - 1;
>>>>>>> webSockets_v4
    client.send(
      JSON.stringify({
        type: "clientCount",
        data: {
          clientCount: ss.clients.size,
          clientId: ss.clients.size - 1
        }
      })
    );
  });
  console.log("New Connection");
  console.log(ss.clients.size);

  ws.on("message", message => {
    let obj = JSON.parse(message);

    if (obj.type === "gameData") {
      ws.playerName = obj.data.playerName;
      playerList.push(ws.playerName);
      ws.gameHand = obj.data.gameHand;
      gameHand.push(ws.gameHand);
      obj.data.playerList = playerList;
      ss.clients.forEach(client => {
        client.send(JSON.stringify(obj));
      });
    } else if (obj.type === "gameLength") {
      ws.gameLength = obj.data.gameLength;
      gameLength.push(ws.gameLength);
      length = gameLength.filter(len => {
        return len !== -1;
      });
      ss.clients.forEach(client => {
        client.send(
          JSON.stringify({
            type: "gameLength",
            data: { gameLength: length[0] }
          })
        );
      });
    } else if (obj.type === "activatePlayerBtn") {
      ss.clients.forEach(client => {
        if (client.clientId === obj.data.activePlayer) {
          client.send(
            JSON.stringify({
              type: "activatePlayerBtn",
              data: {
                listenerType: obj.data.listenerType,
                activePlayer: obj.data.activePlayer
              }
            })
          );
        }
      });
    } else if (obj.type === "dieRoll") {
      ss.clients.forEach(client => {
        client.send(
          JSON.stringify({
            type: "dieRoll",
            data: {
              redDieValue: obj.data.redDieValue,
              blackDieValue: obj.data.blackDieValue,
              dice1: obj.data.dice1,
              dice2: obj.data.dice2
            }
          })
        );
      });
    } else if (obj.type === "specialRoll") {
      ss.clients.forEach(client => {
        client.send(
          JSON.stringify({
            type: "specialRoll",
            data: {
              redDieValue: obj.data.redDieValue,
              blackDieValue: obj.data.blackDieValue,
              dice1: obj.data.dice1,
              dice2: obj.data.dice2,
              userSpecialCards: obj.data.userSpecialCards
            }
          })
        );
      });
    } else if (obj.type === "okClick") {
      ss.clients.forEach(client => {
        client.send(
          JSON.stringify({
            type: "okClick"
          })
        );
      });
    } else if (obj.type === "dieClick") {
      ss.clients.forEach(client => {
        client.send(
          JSON.stringify({
            type: "dieClick",
            data: {
              eventTarget: obj.data.eventTarget
            }
          })
        );
      });
    } else if (obj.type === "markerClick") {
      ss.clients.forEach(client => {
        client.send(
          JSON.stringify({
            type: "markerClick",
            data: {
              eventTarget: obj.data.eventTarget
            }
          })
        );
      });
    }
  });

  ws.on("close", ws => {
    newPlayerList = [];
    gameLength = [];
    gamehand = [];
    ss.clients.forEach(client => {
      newPlayerList.push(client.playerName);
    });
    playerList = newPlayerList;
    ss.clients.forEach(client => {
      client.send(
        JSON.stringify({
          type: "clientCount",
          data: { clientCount: ss.clients.size }
        })
      );
      client.send(
        JSON.stringify({
          type: "playerListChange",
          data: {
            playerList: playerList
          }
        })
      );
    });
    console.log("Connection CLOSED");
    console.log(ss.clients.size);
  });
});
