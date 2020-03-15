let cs = new WebSocket("ws://localhost:5500");

cs.onmessage = e => {
  let obj = JSON.parse(e.data);
  switch (obj.type) {
    case "gameData":
      let playerStr = "";
      playerList = obj.data.playerList;
      playersArr = playerList;
      playerList.forEach(player => {
        playerStr += `<button class="btn">${player}</button>`;
      });
      document.getElementById("player-names").innerHTML = playerStr;
      hand = obj.data.gameHand[0];
      cardFontHand = obj.data.gameHand[1];
      break;
    case "clientCount":
      clientCount = obj.data.clientCount;
      break;
    case "playerListChange":
      playerList = obj.data.playerList;
      droppedClient();
      break;
    case "gameLength":
      gameLength = obj.data.gameLength;
      if (clientCount > gameLength) {
        // this is too many clients
        renderBoard();
      }
      if (playerList.length == gameLength) {
        document.getElementById("player-names").classList.add("hidden");
        renderBoard();
      }
      break;
    case "activatePlayerBtn":
      document
        .getElementById("rollBtn")
        .removeEventListener("click", window.getDiceRoll);
      document
        .getElementById("rollBtn")
        .removeEventListener("click", window.specialBtnClick, { once: true });
      document
        .getElementById("rollBtn")
        .removeEventListener("click", window.sendOkBtnClick);
      document
        .getElementById("header")
        .classList.remove("disable-header-clicks");
      switch (obj.data.listenerType) {
        case "getDiceRoll":
          document
            .getElementById("rollBtn")
            .addEventListener("click", window.getDiceRoll);
          document.getElementById("rollBtn").classList.add("active-btn");
          break;
        case "specialBtnClick":
          document
            .getElementById("rollBtn")
            .addEventListener("click", window.specialBtnClick);
          document.getElementById("rollBtn").classList.add("active-btn");
          break;
        case "sendOkBtnClick":
          document
            .getElementById("rollBtn")
            .addEventListener("click", window.sendOkBtnClick);
          document.getElementById("rollBtn").classList.add("active-btn");
          break;
      }
      break;
    case "dieRoll":
      redDieValue = obj.data.redDieValue;
      blackDieValue = obj.data.blackDieValue;
      dice1 = obj.data.dice1;
      dice2 = obj.data.dice2;
      renderDiceRoll(dice1, dice2);
      break;
    case "specialRoll":
      redDieValue = obj.data.redDieValue;
      blackDieValue = obj.data.blackDieValue;
      dice1 = obj.data.dice1;
      dice2 = obj.data.dice2;
      userSpecialCards = obj.data.userSpecialCards;
      renderSpecialRoll(dice1, dice2);
      decideActivation();
      break;
    case "okClick":
      okBtnClick();
      break;
    case "dieClick":
      document.querySelector(obj.data.eventTarget).click();
      break;
    case "markerClick":
      markerClick(obj.data.eventTarget);
      break;
  }
};

function getGameLength() {
  let radioBtn = document.getElementsByName("game-length");
  for (i = 0; i < radioBtn.length; i++) {
    if (radioBtn[i].checked) {
      gameLength = radioBtn[i].value;
    }
  }
  (document.getElementById("prompts").innerHTML = prompts[4]), // opponents
    document
      .querySelector(".game-length-input-container")
      .classList.add("hidden"),
    document.querySelector("#player-names").classList.remove("hidden");
  sendGameLength();
}

function sendGameLength() {
  cs.send(
    JSON.stringify({
      type: "gameLength",
      data: { gameLength: gameLength }
    })
  );
}

function droppedClient() {
  let activePlayers = players.filter(player => {
    return player.isDisconnected === false;
  });
  activePlayers.forEach(player => {
    if (playerList.indexOf(player.name) === -1) {
      player.isDisconnected = true;
    }
  });
}

let currentPlayer = 0,
  deck = [],
  hand = [],
  wings = [],
  playerList = [],
  players = [],
  activePlayer = 0,
  clientCount = 0,
  clientId = 0,
  droppedPlayerName = "",
  gameLength = -1,
  jokerCount = 0,
  jokerOnePosition = 0,
  jokerTwoPosition = 0,
  wingCardPositions = [-1, 8, 17, 26, 35, 44, 53],
  specialCards = [14, 13, 12, 11, 1, 2];

safetyCardPositions = [
  ...wingCardPositions,
  jokerOnePosition,
  jokerTwoPosition
];

let prompts = [
  `Enter a Comma Separated List of Players' Names`,
  `Marker to Move?`,
  `Select a Die`,
  `Which Marker Now?`,
  `WAITING FOR OPPONENT(S)`,
  `How Many Players?`,
  `Your Marker has Finished`,
  `Move Not Allowed`
];

// Array for six sided die
let dieStr = [
  String.fromCodePoint(9856),
  String.fromCodePoint(9857),
  String.fromCodePoint(9858),
  String.fromCodePoint(9859),
  String.fromCodePoint(9860),
  String.fromCodePoint(9861)
];

let modal = document.getElementById("modal-window"),
  modalMsg = document.querySelector(".modal-message");

deck = createDeck(56);
deck.pop();
deck.pop();

function createDeck(deckSize) {
  for (let i = 1; deck.length < deckSize; i++) {
    deck.push(100 + i);
    deck.push(200 + i);
    deck.push(300 + i);
    deck.push(400 + i);
  }
  return deck;
}

function getHand() {
  hand = generateHand();

  cardFontHand = hand.map(card => {
    let suit = Math.floor(card / 100);
    let cardValue = card % 100;
    if (card === 114 || card === 214) {
      result = 63;
    } else {
      result =
        suit === 1
          ? (cardValue += 64)
          : (result =
              suit === 2
                ? (cardValue += 77)
                : (result =
                    suit === 3
                      ? (cardValue += 96)
                      : (result =
                          suit === 4 ? (cardValue += 109) : cardValue)));
    }
    return result;
  });

  // Draw random cards from deck. No need to shuffle deck.
  function drawCard(startPos = 0, fromEnd = deck.length) {
    fromEnd !== deck.length ? (fromEnd = deck.length - fromEnd) : fromEnd;
    let random = Math.floor(Math.random() * (fromEnd - startPos)) + startPos;
    let card = deck[random];
    deck.splice(random, 1);
    return card;
  }

  function generateHand() {
    // Generate wing cards first (excluding Joker J, Q, K, A, or 2)
    for (let i = 0; i < 6; i++) {
      wings.push(drawCard(8, 14));
    }

    // Generate layout" **Do not allow jack, queen, king, ace, duece, or joker in either
    // first 3 or last 3 marker Positions.
    let lastThree = [];
    lastThree.push(drawCard(8, 14));
    lastThree.push(drawCard(8, 14));
    lastThree.push(drawCard(8, 14));
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 8; col++) {
        if (
          (row + 1) * (col + 1) === 1 ||
          (row + 1) * (col + 1) === 2 ||
          (row + 1) * (col + 1) === 3
        ) {
          hand.push(drawCard(8, 14));
        } else if (hand.length > 49 && hand.length < 53) {
          hand.push(lastThree.pop());
        } else {
          let drawnCard = drawCard();
          hand.push(drawnCard);
          if (drawnCard === 114) {
            jokerOnePosition = hand.length - 1;
          }
          if (drawnCard === 214) {
            jokerTwoPosition = hand.length - 1;
          }
        }
      }
      // Put a wing card at the end of each row (every 9th card)
      hand.push(wings.pop());
    }
    return hand;
  }
}

let sentence = document.getElementById("prompts");
let diceContainer = document.getElementById("dice");
let beginBtn = document.getElementById("begin-btn");
let playersNames = document.getElementById("players-names");

beginBtn.addEventListener("click", () => {
  sentence.innerHTML = prompts[0]; // Enter a Comma Separated List of Players' Names
  sentence.classList.remove("hidden");
  playersNames.classList.remove("hidden");
  beginBtn.classList.add("hidden");
});

function playerQueue() {
  let playersInfo = document.getElementById("players").value;
  playersArr = playersInfo.split(", ");
  getHand();
  playersArr.length > 1 ? renderBoard() : addPlayerToQueue();
}

function decidePlayersPrompt() {
  if (clientCount === 1) {
    playersNames.classList.add("hidden"),
      document.getElementById("prompts").classList.add("hidden"),
      playersNames.classList.remove("hidden"),
      (document.getElementById("prompts").innerHTML = prompts[5]), // how many players
      document.getElementById("prompts").classList.remove("hidden"),
      document.querySelector("#player-names").classList.add("hidden"),
      document
        .querySelector(".game-length-input-container")
        .classList.remove("hidden"),
      playersNames.classList.add("hidden");
  } else {
    playersNames.classList.add("hidden"),
      document.getElementById("prompts").classList.add("hidden"),
      playersNames.classList.remove("hidden"),
      (document.getElementById("prompts").innerHTML = prompts[4]), // how many players
      document.getElementById("prompts").classList.remove("hidden"),
      playersNames.classList.add("hidden");
    sendGameLength();
  }
}

function addPlayerToQueue() {
  cs.send(
    JSON.stringify({
      type: "gameData",
      data: {
        playerName: playersArr[0],
        gameHand: [hand, cardFontHand]
      }
    })
  );
  decidePlayersPrompt();
}

function renderCards() {
  let handStr = "";
  handStr += `<div class="players-left"></div>`;
  cardFontHand.forEach((card, i) => {
    if (card === 63 && jokerCount === 0) {
      handStr += `<div class="marker-row container${i}"><div class="card red">${String.fromCodePoint(
        card
      )}</div></div>`;
      jokerCount++;
    } else if (card === 63 && jokerCount > 0) {
      handStr += `<div class="marker-row container${i}"><div class="card black">${String.fromCodePoint(
        card
      )}</div></div>`;
    } else if (card > 64 && card < 91) {
      handStr += `<div class="marker-row container${i}"><div class="card red">${String.fromCodePoint(
        card
      )}</div></div>`;
    } else if (card > 96) {
      handStr += `<div class="marker-row container${i}"><div class="card black">${String.fromCodePoint(
        card
      )}</div></div>`;
    }
  });
  handStr += `<div class="container54 players-right"></div>`;

  let cards = document.getElementById("hand");
  cards.innerHTML = handStr;

  let playerNames1 = document.querySelector(".players-left");
  let playerNames2 = document.querySelector(".players-right");
  let playerList = "";

  for (let i = 0; i < 6; i++) {
    playerList += `<div id="place-holder" class="container"><div id="dummy" class="card">${String.fromCodePoint(
      127153
    )}</div><ul class="d">`;
    players.forEach((player, i) => {
      playerList += `<li class="player${i}">${player.name}</li>`;
    });
    playerList += `</ul></div>`;
  }

  playerNames1.innerHTML = playerList;
  playerNames2.innerHTML = playerList;

  document.querySelectorAll(".player0").forEach(player => {
    player.classList.add("highlight");
  });

  const elem = document.getElementById("scrollToBottom");
  elem.scroll(0, elem.scrollHeight);
  renderInitialPlayerGrid();
}

function addMarkerEvents() {
  document
    .getElementById("green-marker")
    .addEventListener("click", getMarkerClick);
  document
    .getElementById("red-marker")
    .addEventListener("click", getMarkerClick);
  document
    .getElementById("blue-marker")
    .addEventListener("click", getMarkerClick);
}

function getMarkerClick({ target }) {
  cs.send(
    JSON.stringify({
      type: "markerClick",
      data: {
        eventTarget: `#${target.id}`
      }
    })
  );
}

let movesRemaining = 2;
let firstChosenDieValue = 0;
let secondChosenDieValue = 0;
function markerClick(target) {
  console.log("running markerClick");
  let elem = document.querySelector(target);
  let markerChoice = target;
  sortOpponentMarkers(players);
  movesRemaining--;
  if (movesRemaining === 0 && visibleMarkerCount > 1) {
    movePlayer(secondChosenDieValue, markerChoice);
    updateMarkerPositions();
    showRollView();
  } else {
    movePlayer(firstChosenDieValue, markerChoice);
    updateMarkerPositions();
    if (visibleMarkerCount === 1) {
      showRollView();
    }
  }
  elem.classList.add("hidden");
  sentence.innerHTML = prompts[3]; // Marker To Move?
}

function showRollView() {
  console.log("running showRollView");
  showMarkerChoices();
  sentence.classList.add("hidden");
  document.querySelector(".markers").classList.add("hidden");
  document.querySelector(".black-die").classList.add("dim");
  document.querySelector(".red-die").classList.add("dim");
  document.querySelector(".bullet").classList.add("dim");
  document.getElementById("rollBtn").classList.remove("hidden");
}

function switchPlayer() {
  // document.querySelector(".show-header").addEventListener("mouseleave", () => {
  //   document.querySelector(".show-header").setAttribute("style", "opacity: 0");
  // });
  document.getElementById("rollBtn").classList.remove("active-btn");
  userSpecialCards = [];
  console.log("running switchPlayer");
  ++currentPlayer;
  currentPlayer = currentPlayer % players.length;
  movesRemaining = 2;

  rollBtn.classList.remove("ok-btn");
  rollBtn.innerHTML = `${players[currentPlayer].name}<br/>Roll The Dice`;

  if (players[currentPlayer].isFinished && players.length > 1) {
    switchPlayer();
  }
}

function movePlayer(dieMove, markerChoice) {
  switch (markerChoice) {
    case "#red-marker":
      markerToMove = "markerA";
      break;
    case "#green-marker":
      markerToMove = "markerB";
      break;
    case "#blue-marker":
      markerToMove = "markerC";
      break;
  }

  let moveCount = 0;
  let stopValue = 0;
  let currentCardValue = 0;
  let previousMarkerPosition = players[currentPlayer][markerToMove];

  for (let i = players[currentPlayer][markerToMove] + 1; i < hand.length; i++) {
    if (dieMove === 0) {
      break;
    }
    stopValue = redDieValue + blackDieValue + 2;
    moveCount++;

    currentCard = hand[i];
    currentCardValue = (hand[i] % 100) % 14;

    if (currentCardValue < stopValue) {
      if (moveCount >= dieMove) {
        players[currentPlayer][markerToMove]++;
        break;
      }
      players[currentPlayer][markerToMove]++;
    } else {
      players[currentPlayer][markerToMove]++;
      break;
    }
  }
  hasValidMove(dieMove, previousMarkerPosition, currentCard);
}

function updateMarkerPositions() {
  console.log("running updateMarkerPositions");
  players.forEach((player, playerIndex) => {
    let row = "";
    switch (playerIndex) {
      case 0:
        row = ".p1";
        break;
      case 1:
        row = ".p2";
        break;
      case 2:
        row = ".p3";
        break;
      case 3:
        row = ".p4";
        break;
    }
    document.querySelectorAll(`.p${playerIndex + 1}`).forEach(li => {
      li.innerHTML = "";
    });

    spaces = document.querySelectorAll(row);
    if (players[playerIndex].markerA > -1) {
      spaces[
        players[playerIndex].markerA
      ].innerHTML += `<span class="marker-a">${String.fromCodePoint(
        9679
      )}</span>`;
    }
    if (players[playerIndex].markerB > -1) {
      spaces[
        players[playerIndex].markerB
      ].innerHTML += `<span class="marker-b">${String.fromCodePoint(
        9650
      )}</span>`;
    }
    if (players[playerIndex].markerC > -1) {
      spaces[
        players[playerIndex].markerC
      ].innerHTML += `<span class="marker-c">${String.fromCodePoint(
        9632
      )}</span>`;
    }
    if (specialCardFlag === false && movesRemaining < 1) {
      sendActivatePlayerBtn("getDiceRoll");
      switchPlayer();
    }
  });
}

function hasValidMove(dieMove, previousMarkerPosition, currentCard) {
  console.log("running hasValidMove");
  let handLength = hand.length - 1;
  // first do all the things that should just return
  // remember moves have already been made, just not displayed yet
  if (players[currentPlayer][markerToMove] < handLength) {
    getSpecialCards(currentCard);
    if (userSpecialCards.length > 0 && movesRemaining < 1) {
      processSpecialCards();
    } else if (userSpecialCards.length === 0 && movesRemaining < 1) {
      // checkForAttack();
    }
    return;
  }
  if (previousMarkerPosition + dieMove === handLength) {
    if (
      players[currentPlayer].markerA === handLength &&
      players[currentPlayer].markerB === handLength &&
      players[currentPlayer].markerC === handLength
    ) {
      players[currentPlayer].isFinished = true;
      modalMsg.innerHTML = ` ${players[currentPlayer].name} Wins!<br>Game Over `;
      modal.classList.remove("hidden");
      setTimeout(() => {
        modal.classList.add("hidden");
      }, 6000);

      let winnerClass = document.querySelectorAll(`.p${currentPlayer + 1}`);
      winnerClass.forEach(el => {
        el.classList.add("winner");
      });

      let nameClass = document.querySelectorAll(".players-right .player0")[0];
      nameClass.innerHTML = ` 😎 ${players[currentPlayer].name} Wins!`;

      return;
    }
    if (userSpecialCards.length > 0 && movesRemaining < 1) {
      processSpecialCards();
    }
    modalMsg.innerHTML = `${prompts[6]}`;
    modal.classList.remove("hidden");
    setTimeout(() => {
      modal.classList.add("hidden");
    }, 2000);

    return;
  } else {
    players[currentPlayer][markerToMove] = previousMarkerPosition;
    currentPlayer += players.length % players.length;

    modalMsg.innerHTML = `${prompts[7]}`;
    modal.classList.remove("hidden");
    setTimeout(() => {
      modal.classList.add("hidden");
    }, 1500);

    if (userSpecialCards.length > 0 && movesRemaining < 1) {
      processSpecialCards();
    }
    return;
  }
}

let userSpecialCards = [];
function getSpecialCards(currentCard) {
  console.log("running getSpecialCards");
  currentCardValue = (currentCard % 100) % 14;
  specialCards.forEach(specialCard => {
    if (currentCardValue === specialCard) {
      userSpecialCards.push(currentCard);
    }
  });
}

let specialCardFlag = false;
let furthestMarker = "";
function processSpecialCards() {
  console.log("running processSpecialCards");
  rollBtn.removeEventListener("click", window.getDiceRoll);
  rollBtn.classList.remove("ok-btn");
  rollBtn.innerHTML = `${players[currentPlayer].name} Has Special Card(s)<br/>Roll For Activation`;

  sendActivatePlayerBtn("specialBtnClick", true);
  // rollBtn.addEventListener("click", window.specialBtnClick, { once: true });

  window.specialBtnClick = function() {
    specialCardRoll();
  };

  window.sendOkBtnClick = function() {
    cs.send(
      JSON.stringify({
        type: "okClick"
      })
    );
  };

  window.okBtnClick = function() {
    updateMarkerPositions();
    rollBtn.removeEventListener("click", window.sendOkBtnClick);
    rollBtn.removeEventListener("click", window.specialBtnClick, {
      once: true
    });
    document.querySelector(".black-die").classList.add("dim");
    document.querySelector(".red-die").classList.add("dim");
    sentence.classList.add("hidden");

    userSpecialCards.forEach((card, i) => {
      if (card === furthestSpecialCard) {
        userSpecialCards.splice(i, 1);
      }
    });

    if (userSpecialCards.length === 0) {
      sendActivatePlayerBtn("getDiceRoll");
      // rollBtn.addEventListener("click", window.getDiceRoll);
      // checkForAttack();
      showRollView();
      switchPlayer();
      specialCardFlag = false;
    } else {
      if (userSpecialCards.length > 0 && movesRemaining < 1) {
        processSpecialCards();
      }
    }
  };

  function specialCardRoll() {
    console.log("running specialCardRoll");
    redDieValue = Math.floor(Math.random() * 6);
    dice1 = dieStr[redDieValue];
    blackDieValue = Math.floor(Math.random() * 6);
    dice2 = dieStr[blackDieValue];

    rollData = [redDieValue, blackDieValue, dice1, dice2];

    cs.send(
      JSON.stringify({
        type: "specialRoll",
        data: {
          redDieValue: rollData[0],
          blackDieValue: rollData[1],
          dice1: rollData[2],
          dice2: rollData[3],
          userSpecialCards: userSpecialCards
        }
      })
    );

    cs.onmessage = e => {
      let obj = JSON.parse(e.data);
      switch (obj.type) {
        case "specialRoll":
          redDieValue = obj.data.redDieValue;
          blackDieValue = obj.data.blackDieValue;
          dice1 = obj.data.dice1;
          dice2 = obj.data.dice2;
          userSpecialCards = obj.data.userSpecialCards;
          renderSpecialRoll(dice1, dice2);
          decideActivation();
          break;

        case "activatePlayerBtn":
          document
            .getElementById("rollBtn")
            .removeEventListener("click", window.getDiceRoll);
          document
            .getElementById("rollBtn")
            .removeEventListener("click", window.specialBtnClick, {
              once: true
            });
          document
            .getElementById("rollBtn")
            .removeEventListener("click", window.sendOkBtnClick);
          document
            .getElementById("header")
            .classList.remove("disable-header-clicks");
          switch (obj.data.listenerType) {
            case "getDiceRoll":
              document
                .getElementById("rollBtn")
                .addEventListener("click", window.getDiceRoll);
              document.getElementById("rollBtn").classList.add("active-btn");
              break;
            case "specialBtnClick":
              document
                .getElementById("rollBtn")
                .addEventListener("click", window.specialBtnClick);
              document.getElementById("rollBtn").classList.add("active-btn");
              break;
            case "sendOkBtnClick":
              document
                .getElementById("rollBtn")
                .addEventListener("click", window.sendOkBtnClick);
              document.getElementById("rollBtn").classList.add("active-btn");
              break;
          }
          break;

        case "dieRoll":
          redDieValue = obj.data.redDieValue;
          blackDieValue = obj.data.blackDieValue;
          dice1 = obj.data.dice1;
          dice2 = obj.data.dice2;
          renderDiceRoll(dice1, dice2);
          break;
        case "okClick":
          okBtnClick();
          break;
        case "dieClick":
          document.querySelector(obj.data.eventTarget).click();
          break;
        case "markerClick":
          markerClick(obj.data.eventTarget);
          break;
      }
    };
  }

  window.renderSpecialRoll = function(dice1, dice2) {
    console.log("inside renderSpecialRoll");
    document.querySelector(".red-die").classList.add("die-shake");
    document.querySelector(".black-die").classList.add("die-shake");
    setTimeout(() => {
      dice =
        '<div class="red-die">' +
        dice1 +
        '</div><div class="bullet dim">•</div><div class="black-die">' +
        dice2 +
        "</div>";
      diceContainer.innerHTML = dice;
      document.querySelector(".red-die").classList.remove("die-shake");
      document.querySelector(".black-die").classList.remove("die-shake");
    }, 800);
  };

  window.decideActivation = function() {
    furthestSpecialCard = getFurthestSpecialCard();
    let furthestCardColor =
      Math.floor(furthestSpecialCard / 100) === 1 ||
      Math.floor(furthestSpecialCard / 100) === 2
        ? "red"
        : "black";

    console.log("running decideActivation");
    let winningDieColor = "neither";
    if (blackDieValue + 1 > redDieValue + 1) {
      winningDieColor = "black";
    } else if (blackDieValue + 1 < redDieValue + 1) {
      winningDieColor = "red";
    }

    if (winningDieColor === furthestCardColor) {
      applyPenalty(furthestMarker, winningDieColor);
      if (
        players[currentPlayer].markerA === hand.length - 1 &&
        players[currentPlayer].markerB === hand.length - 1 &&
        players[currentPlayer].markerC === hand.length - 1
      ) {
        players[currentPlayer].isFinished = true;
        alert(players[currentPlayer].name + " wins!");
      }
    } else {
      sentence.innerHTML = `Card not activated<br>${furthestCardColor.toUpperCase()} die didn't win.`;
      sentence.classList.remove("hidden");
    }
    rollBtn.removeEventListener("click", window.specialBtnClick, {
      once: true
    });
    rollBtn.classList.add("ok-btn");
    rollBtn.innerHTML = `Ok`;

    sendActivatePlayerBtn("sendOkBtnClick", true);
    // rollBtn.addEventListener("click", window.sendOkBtnClick);
  };

  function getFurthestSpecialCard() {
    let furthestMarkerEntry = ["", -1];
    let playerEntries = Object.entries(players[currentPlayer]);
    for (const [marker, position] of playerEntries) {
      if (userSpecialCards.includes(hand[players[currentPlayer][marker]])) {
        if (position > furthestMarkerEntry[1]) {
          furthestMarkerEntry = [marker, position];
        }
        furthestMarker = furthestMarkerEntry[0];
      }
    }

    let posA = -1;
    let posB = -1;
    let posC = -1;
    if (userSpecialCards.includes(hand[players[currentPlayer].markerA])) {
      posA = players[currentPlayer].markerA;
    }
    if (userSpecialCards.includes(hand[players[currentPlayer].markerB])) {
      posB = players[currentPlayer].markerB;
    }
    if (userSpecialCards.includes(hand[players[currentPlayer].markerC])) {
      posC = players[currentPlayer].markerC;
    }
    let furthestCardIndex = Math.max(posA, posB, posC);
    let furthestSpecialCard = hand[furthestCardIndex];
    return furthestSpecialCard;
  }

  if (userSpecialCards.length > 0) {
    specialCardFlag = true;
  }
}

function checkForAttack() {
  console.log("running checkForAttack");
  let collisions = [];
  for (var i = currentPlayer + 1; i !== currentPlayer; i++) {
    i = i % players.length;
    if (i === currentPlayer) {
      break;
    }
    players[currentPlayer][markerToMove] === players[i].markerA
      ? collisions.push(`Red marker `)
      : collisions;
    players[currentPlayer][markerToMove] === players[i].markerB
      ? collisions.push(`Green marker `)
      : collisions;
    players[currentPlayer][markerToMove] === players[i].markerC
      ? collisions.push(`Blue marker `)
      : collisions;
  }
  if (collisions.length > 0) {
    alert(
      `You are attacking ${collisions.length} marker(s)\nbut for now we're not doing anything about it.`
    );
  }
}

function renderBoard() {
  getPlayerNames(playersArr);
  renderInitialHeader();
  renderCards();
}

function renderInitialHeader() {
  document.getElementById("player-names").classList.add("hidden");
  // document.querySelector(".show-header").addEventListener("mouseenter", () => {
  //   document.querySelector(".show-header").setAttribute("style", "opacity: 1");
  // });

  // document.querySelector(".show-header").addEventListener("mouseleave", () => {
  //   document.querySelector(".show-header").setAttribute("style", "opacity: .7");
  // });
  document
    .getElementById("bg-image")
    .setAttribute("style", "background-image: url(images/dice2.jpg)");
  document
    .getElementById("hand")
    .setAttribute("style", "background-color: #fff;");

  playersNames.classList.add("hidden");
  document.getElementById("prompts").classList.add("hidden");

  let dice1 = dieStr[(redDieValue = 3)];
  let dice2 = dieStr[(blackDieValue = 4)];
  dice =
    '<div class="red-die dim">' +
    dice1 +
    '</div><div class="bullet dim">•</div><div class="black-die dim">' +
    dice2 +
    "</div>";
  diceContainer.innerHTML = dice;

  let headerMarkers = `<span id="red-marker">•</span><span id="green-marker">${String.fromCodePoint(
    9650
  )}</span
  ><span id="blue-marker">${String.fromCodePoint(9632)}</span>`;
  document.getElementById("markers").innerHTML = headerMarkers;

  document
    .getElementById("elements-container")
    .insertAdjacentHTML(
      "afterend",
      `<button id="rollBtn" class="btn">${players[currentPlayer].name}<br/>Roll The Dice</button>`
    );

  sendActivatePlayerBtn("getDiceRoll", true);
  // document.getElementById("rollBtn").addEventListener("click", window.getDiceRoll);
}

function sendActivatePlayerBtn(listenerType, stayOnCurrentPlayer = false) {
  document
    .getElementById("rollBtn")
    .removeEventListener("click", window.getDiceRoll);
  document.getElementById("rollBtn").classList.remove("active-btn");
  document.getElementById("header").classList.add("disable-header-clicks");

  activePlayer = currentPlayer;
  if (!stayOnCurrentPlayer) {
    activePlayer = (currentPlayer + 1) % gameLength;
  }
  cs.send(
    JSON.stringify({
      type: "activatePlayerBtn",
      data: {
        listenerType: listenerType,
        activePlayer: activePlayer
      }
    })
  );
}

function renderInitialPlayerGrid() {
  let playerRow = "";
  playerRow += `<ul class="p">`;
  players.forEach((player, i) => {
    playerRow += `<li class="li p${i + 1}"></li>`;
  });
  playerRow += `</ul>`;

  document.querySelectorAll(".marker-row").forEach(li => {
    li.innerHTML += playerRow;
  });

  document.querySelectorAll(`.p1`).forEach(li => {
    li.classList.add("row-highlight");
  });
}

function getPlayerNames(playersArr) {
  class Player {
    constructor(name) {
      this.markerA = -1;
      this.markerB = -1;
      this.markerC = -1;
      this.name = name;
      this.isFinished = false;
      this.isDisconnected = false;
      players.push(this);
    }
  }

  (function() {
    for (let i = 0; i < playersArr.length; i++) {
      new Player(playersArr[i]);
    }
  })();
}

function applyPenalty(furthestMarker, winningDieColor) {
  console.log("running applyPenalty");
  let markerPos = players[currentPlayer][furthestMarker];
  let markerIndex = (markerPos % 9) + 1;
  let forwardSpacesToMove = 18 - markerIndex * 2;
  let backwardSpacesToMove = markerIndex * 2;
  let card = hand[players[currentPlayer][furthestMarker]] % 100;
  switch (card) {
    case 13:
      ladder();
      break;
    case 12:
      pullForwards();
      break;
    case 11:
      pushBackwards();
      break;
    case 1:
      chute();
      break;
    case 2:
      swap();
      break;
    default:
      console.log("unknown penalty type");
  }

  function ladder() {
    sentence.innerHTML = `${winningDieColor.toUpperCase()} die wins.<br>— King is activated —<br>
      — moving up 1 row —`;
    sentence.classList.remove("hidden");
    players[currentPlayer][furthestMarker] += forwardSpacesToMove;

    if (players[currentPlayer][furthestMarker] > hand.length - 1) {
      players[currentPlayer][furthestMarker] = hand.length - 1;
      if (
        !(
          players[currentPlayer].markerA === hand.length - 1 &&
          players[currentPlayer].markerB === hand.length - 1 &&
          players[currentPlayer].markerC === hand.length - 1
        )
      ) {
        sentence.classList.add("hidden");
        sentence.innerHTML = `${winningDieColor.toUpperCase()} die wins.<br>— King is activated —<br>
          — Your marker has finished —`;
        sentence.classList.remove("hidden");
      }
    }
  }

  function pullForwards() {
    sentence.innerHTML = `${winningDieColor.toUpperCase()} die wins.<br>— Queen is activated —<br>
    — pulling your nearest marker forward —`;
    sentence.classList.remove("hidden");
    currentPosition = players[currentPlayer][furthestMarker];
    let markerToMoveList = sortPlayerMarkers().filter(marker => {
      return marker[3] < currentPosition;
    });

    if (markerToMoveList.length > 0 && markerToMoveList[0][3] !== -1) {
      markerToMove = markerToMoveList[0][2];
      if (
        userSpecialCards.indexOf(hand[players[currentPlayer][markerToMove]]) !==
        -1
      ) {
        userSpecialCards = [];
      }
      players[currentPlayer][markerToMove] = currentPosition;
    } else {
      sentence.innerHTML = `${winningDieColor.toUpperCase()} die wins. <br>— Queen is activated —<br>
      But you have no marker to pull forward.`;
      sentence.classList.remove("hidden");
    }
  }

  function pushBackwards() {
    currentPosition = players[currentPlayer][furthestMarker];
    let closestPlayer = [];
    let opponentIndex = 0;

    let markerList = sortOpponentMarkers(players).filter(marker => {
      return marker[2] > currentPosition;
    });
    if (markerList.length > 0) {
      closestPlayer = markerList[markerList.length - 1];
      players.forEach((player, i) => {
        if (player.name === closestPlayer[0]) {
          opponentIndex = i;
        }
      });

      let markerClass =
        closestPlayer[1] === "markerA"
          ? "marker-a"
          : closestPlayer[1] === "markerB"
          ? "marker-b"
          : closestPlayer[1] === "markerC"
          ? "marker-c"
          : markerClass;

      let blinkSelector = `.p${opponentIndex + 1} .${markerClass}`;
      let blinkMarker = document.querySelectorAll(blinkSelector);
      blinkMarker[0].classList.add("blinking");

      if (players[opponentIndex].isFinished === false) {
        players[opponentIndex][closestPlayer[1]] = currentPosition;
        sentence.innerHTML = `${winningDieColor.toUpperCase()} die wins.<br>— Jack is activated —<br>
        Getting random opponent ......3`;

        setTimeout(
          () =>
            (sentence.innerHTML = `${winningDieColor.toUpperCase()} die wins.<br>— Jack is activated —<br>
            Getting random opponent ....2&nbsp;&nbsp;`),
          1200
        );

        setTimeout(
          () =>
            (sentence.innerHTML = `${winningDieColor.toUpperCase()} die wins.<br>— Jack is activated —<br>
            Getting random opponent ..1&nbsp;&nbsp;&nbsp;&nbsp;`),
          2400
        );

        setTimeout(
          () =>
            (sentence.innerHTML = `${winningDieColor.toUpperCase()} die wins.<br>— Jack is activated —<br>— pulling ${
              players[opponentIndex].name
            }s' nearest marker back —`),
          3000
        );
        sentence.classList.remove("hidden");
      }
    } else {
      sentence.innerHTML = `The ${winningDieColor.toUpperCase()} die wins. <br>— Jack is activated —<br>But there's nobody to pull back.`;
      sentence.classList.remove("hidden");
    }
  }

  function chute() {
    sentence.innerHTML = `${winningDieColor.toUpperCase()} die wins.<br>— Ace is activated —<br>
    — moving down 1 row —`;
    sentence.classList.remove("hidden");
    players[currentPlayer][furthestMarker] -= backwardSpacesToMove;
    if (players[currentPlayer][furthestMarker] < 0) {
      players[currentPlayer][furthestMarker] = 0;
      sentence.innerHTML = `${winningDieColor.toUpperCase()} die wins.<br>— Ace is activated —<br>
      — moving back to beginning —`;
      sentence.classList.remove("hidden");
    }
  }

  function swap() {
    currentPosition = players[currentPlayer][furthestMarker];
    let opponentIndex = 0;
    let sortedMarkers = sortOpponentMarkers(players);
    let filteredMarkers = sortedMarkers.filter(player => {
      return player[2] !== currentPosition && player[2] !== -1;
    });

    let randomIndex = Math.floor(Math.random() * filteredMarkers.length);
    let randomPlayer = [];
    randomPlayer = filteredMarkers[randomIndex];
    if (filteredMarkers.length > 0) {
      players.forEach((player, i) => {
        if (player.name === randomPlayer[0]) {
          opponentIndex = i;
        }
      });

      players[currentPlayer][furthestMarker] =
        players[opponentIndex][randomPlayer[1]];
      players[opponentIndex][randomPlayer[1]] = currentPosition;

      markerClass =
        randomPlayer[1] === "markerA"
          ? "marker-a"
          : randomPlayer[1] === "markerB"
          ? "marker-b"
          : randomPlayer[1] === "markerC"
          ? "marker-c"
          : markerClass;

      let blinkSelector = `.p${opponentIndex + 1} .${markerClass}`;
      let blinkMarker = document.querySelectorAll(blinkSelector);
      blinkMarker[0].classList.add("blinking");

      sentence.innerHTML = `${winningDieColor.toUpperCase()} die wins.<br>— Two is activated —<br>
      Getting random swap 3`;

      setTimeout(
        () =>
          (sentence.innerHTML = `${winningDieColor.toUpperCase()} die wins.<br>— Two is activated —<br>
          Getting random swap 2`),
        1200
      );

      setTimeout(
        () =>
          (sentence.innerHTML = `${winningDieColor.toUpperCase()} die wins.<br>— Two is activated —<br>
          Getting random swap 1`),
        2400
      );

      setTimeout(
        () =>
          (sentence.innerHTML = `${winningDieColor.toUpperCase()} die wins.<br>— Two is activated —<br>— swapping places with one of ${
            players[opponentIndex].name
          }s' markers —`),
        3000
      );

      sentence.classList.remove("hidden");
    } else {
      sentence.innerHTML = `${winningDieColor.toUpperCase()} die wins. <br>— Two is activated —<br>But nobody to swap with.`;
      sentence.classList.remove("hidden");
    }
  }
}

window.getDiceRoll = function() {
  console.log("running getDiceRoll");

  movesRemaining = 2;
  let redDieValue = Math.floor(Math.random() * 6);
  let blackDieValue = Math.floor(Math.random() * 6);
  let dice1 = dieStr[redDieValue];
  let dice2 = dieStr[blackDieValue];

  let rollData = [redDieValue, blackDieValue, dice1, dice2];

  cs.send(
    JSON.stringify({
      type: "dieRoll",
      data: {
        redDieValue: rollData[0],
        blackDieValue: rollData[1],
        dice1: rollData[2],
        dice2: rollData[3]
      }
    })
  );
};

function renderDiceRoll(dice1, dice2) {
  // document.querySelector(".show-header").addEventListener("mouseenter", () => {
  //   document
  //     .querySelector(".show-header")
  //     .removeAttribute("style", "opacity: 1");
  // });
  // document.querySelector(".show-header").addEventListener("mouseleave", () => {
  //   document
  //     .querySelector(".show-header")
  //     .removeAttribute("style", "opacity: .7");
  // });

  for (let i = 0; i < players.length; i++) {
    document.querySelectorAll(`.player${i}`).forEach(player => {
      player.classList.remove("highlight");
    });
    document.querySelectorAll(`.p${i + 1}`).forEach(row => {
      row.classList.remove("row-highlight");
    });
  }

  document.querySelectorAll(`.player${currentPlayer}`).forEach(player => {
    player.classList.add("highlight");
  });
  document.querySelectorAll(`.p${currentPlayer + 1}`).forEach(li => {
    li.classList.add("row-highlight");
  });

  document.querySelector(".red-die").classList.add("die-shake");
  document.querySelector(".black-die").classList.add("die-shake");
  setTimeout(() => {
    dice =
      '<div class="red-die">' +
      dice1 +
      '</div><div class="bullet">•</div><div class="black-die">' +
      dice2 +
      "</div>";
    diceContainer.innerHTML = dice;
    document.querySelector(".red-die").classList.remove("die-shake");
    document.querySelector(".black-die").classList.remove("die-shake");
    rollBtn.classList.add("hidden");
    showMarkerChoices();
    addDiceEvents();
  }, 800);
}

let visibleMarkerCount = 3;
function showMarkerChoices() {
  console.log("running showMarkerChoices");

  document
    .getElementById("green-marker")
    .removeEventListener("click", markerClick);
  document
    .getElementById("red-marker")
    .removeEventListener("click", markerClick);
  document
    .getElementById("blue-marker")
    .removeEventListener("click", markerClick);

  visibleMarkerCount = 3;
  players[currentPlayer].markerA < hand.length - 1
    ? document.getElementById("red-marker").classList.remove("hidden")
    : (document.getElementById("red-marker").classList.add("hidden"),
      visibleMarkerCount--);

  players[currentPlayer].markerB < hand.length - 1
    ? document.getElementById("green-marker").classList.remove("hidden")
    : (document.getElementById("green-marker").classList.add("hidden"),
      visibleMarkerCount--);
  players[currentPlayer].markerC < hand.length - 1
    ? document.getElementById("blue-marker").classList.remove("hidden")
    : (document.getElementById("blue-marker").classList.add("hidden"),
      visibleMarkerCount--);

  if (visibleMarkerCount < 2) {
    movesRemaining = 1;
  }
  document.querySelector(".markers").classList.remove("hidden");
}

function addDiceEvents() {
  sentence.innerHTML = prompts[2]; // select a die
  sentence.classList.remove("hidden");

  document.querySelector(".red-die").addEventListener("click", dieClick);
  document.querySelector(".black-die").addEventListener("click", dieClick);
  document.querySelector(".bullet").addEventListener("click", dieClick);
}

function dieClick({ target }) {
  if (target.className === "bullet") {
    secondChosenDieValue = redDieValue + blackDieValue + 2;
    movesRemaining = 1;
    target.classList.add("dim");
    target.classList.add("dim");
    document.querySelector(".red-die").removeEventListener("click", dieClick);
    document.querySelector(".black-die").removeEventListener("click", dieClick);
  }
  if (target.className === "red-die") {
    firstChosenDieValue = redDieValue + 1;
    secondChosenDieValue = blackDieValue + 1;
    target.classList.add("dim");
    document.querySelector(".bullet").classList.add("dim");
    document.querySelector(".bullet").removeEventListener("click", dieClick);
    document.querySelector(".black-die").removeEventListener("click", dieClick);
  }
  if (target.className === "black-die") {
    firstChosenDieValue = blackDieValue + 1;
    secondChosenDieValue = redDieValue + 1;
    target.classList.add("dim");
    document.querySelector(".bullet").classList.add("dim");
    document.querySelector(".bullet").removeEventListener("click", dieClick);
    document.querySelector(".red-die").removeEventListener("click", dieClick);
  }
  sentence.innerHTML = prompts[1];
  sentence.classList.remove("hidden");
  target.removeEventListener("click", dieClick);
  target.classList.add("dim");
  addMarkerEvents();

  cs.send(
    JSON.stringify({
      type: "dieClick",
      data: {
        eventTarget: `.${target.classList[0]}`
      }
    })
  );
}

function sortOpponentMarkers(players) {
  updateMarkerPositions();
  opponents = players.filter((player, i) => {
    return i !== currentPlayer;
  });
  let markers = [];
  opponents.forEach(player => {
    for (let key in player) {
      if (key !== "name" && key !== "isFinished") {
        markers.push([player.name, key, player[key]]);
      }
    }
  });
  let filteredMarkers = markers.filter(marker => {
    return safetyCardPositions.indexOf(marker[2]) === -1;
  });
  let sortedMarkers = filteredMarkers.sort((b, a) => {
    return a[2] - b[2];
  });
  return sortedMarkers;
}

function sortPlayerMarkers() {
  updateMarkerPositions();
  let markers = [];
  for (let key in players[currentPlayer]) {
    if (key !== "name" && key !== "isFinished") {
      markers.push([
        players[currentPlayer].index,
        players[currentPlayer].name,
        key,
        players[currentPlayer][key]
      ]);
    }
  }
  let filteredMarkers = markers.filter(marker => {
    return safetyCardPositions.indexOf(marker[3]) === -1;
  });
  let sortedMarkers = filteredMarkers.sort((b, a) => {
    return a[3] - b[3];
  });
  return sortedMarkers;
}
