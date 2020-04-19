import bodyParser from 'body-parser';
import express from 'express';
import session from 'express-session';
import fs from 'fs';
import path from 'path';
import imageSize from 'image-size';
import yargs from 'yargs';

import { GameState } from './common/GameState.js';
import { MultiuserSessionList } from './multiuserlobby/MultiuserSessionList.js';

const prepareCommands = () => yargs
  .alias('p', 'port')
  .describe('p', 'Server port')
  .default('p', 80)
  .argv;
const options = prepareCommands();
const config = {
  port: options.port
};

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());

var sessionSettings = {
  secret: 'sdhfjksahfkjhsdkjewr',
  cookie: {}
}
app.use(session(sessionSettings));

const escapeHTML = (unsafe) => {
  return unsafe.replace(/[&<>"']/g, function(m) {
    switch (m) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#039;';
    }
  });
};

const gameList = new MultiuserSessionList(5);

const indexHTML = fs.readFileSync('content/index.html', 'utf8');

const getPlayerChunk = (player) => {
  if (player !== null) {
    let playerInfoChunk = "";
    // TODO: Shouldn't show a list of all players on the server here.
    if (gameList.getCurrentSessionForUser(player) === null) {
      playerInfoChunk = `
     <div class="formGrid"><form id="startGameForm" onsubmit="window.postForm('/startGame', document.getElementById('startGameForm'), true); return false;">
     <input type="submit" value="Start game" />
     </form></div>`;
    }
    return `<div class="registeredPlayer">You are: ${escapeHTML(player.name)}.${playerInfoChunk}</div>`
  } else {
    return `<div class="unregisteredPlayer"><form id="registerForm" onsubmit="window.postForm('/register', document.getElementById('registerForm'), true); return false;">
     Your name: 
     <input type="text" name="playerName" />
     <input type="submit" value="Register" />
     </form></div>`;
  }
}

app.get('/', (req, res) => {
  res.send(indexHTML);
});

app.use(express.static('content/static'));
app.use('/common', express.static('common'));

const sendContent = (req, res, notification) => {
  const player = gameList.getUser(req.session);
  const responseJson = {
    pageContentHTML: getPlayerChunk(player),
    playerRegistered: player !== null,
  };
  const gameSession = gameList.getCurrentSessionForUser(player);
  let gameState = null;
  if (gameSession != null) {
    gameState = gameSession.appState;
  }
  if (gameState !== null) {
    responseJson.playerId = gameState.getPlayerId(player.name);
    responseJson.gameState = gameState.toJSON();
  }
  if (notification !== undefined) {
    responseJson.notification = notification;
  }
  const resString = JSON.stringify(responseJson);
  res.send(resString);
}

app.get('/content', (req, res) => {
  sendContent(req, res);
});

app.post('/register', (req, res) => {
  console.log('Player register request:', req.body);
  if (req.body !== undefined && req.body.jsonData !== undefined) {
    let reqData;
    try {
      reqData = JSON.parse(req.body.jsonData);
    } catch(err) {
      sendContent(req, res, 'Failed to parse JSON');
      return;
    }
    if (!reqData.hasOwnProperty("playerName") || reqData.playerName === "") {
      sendContent(req, res, 'playerName not set in register request');
      return;
    }
    const playerName = reqData.playerName;
    if (gameList.tryRegisterUser(req.session, playerName)) {
      console.log('Player registered:', playerName);
      sendContent(req, res);
      return;
    } else {
      sendContent(req, res, 'Could not register - maybe you are already registered?');
      return;
    }
  }
  sendContent(req, res, 'Invalid request.');
});

app.post('/startGame', (req, res) => {
  const user = gameList.getUser(req.session);
  if (user === null) {
    sendContent(req, res, 'You are not registered!');
    return;
  }
  if (gameList.allRegisteredUsers.length < 2) {
    sendContent(req, res, 'Need two players present to start the game!');
    return;
  }
  if (gameList.allRegisteredUsers[0] !== user && gameList.allRegisteredUsers[1] !== user) {
    // TODO: Use the lobby system properly instead of just making a game for the first two users.
    sendContent(req, res, 'You need to be one of the first 2 players on the server to start the game!');
    return;
  }
  const gameSession = gameList.startSession([gameList.allRegisteredUsers[0], gameList.allRegisteredUsers[1]]);
  gameSession.startApp((users) => new GameState(users));
});

app.post('/place_piece', (req, res) => {
  const player = gameList.getUser(req.session);
  if (player === null) {
    sendContent(req, res, 'You are not registered!');
    return;
  }
  console.log('Player requested piece placement:', player.name, req.body)
  if (req.body === undefined) {
    sendContent(req, res, 'Request malformed');
    return;
  }
  var multiuserSession = gameList.getCurrentSessionForUser(player);
  if (multiuserSession === undefined || multiuserSession.appState === null) {
    sendContent(req, res, 'You are not part of a game');
    return;
  }

  const game = multiuserSession.appState;

  try {
    const pieceId = req.body.pieceId;
    const slot = {y: req.body.slotY, x: req.body.slotX};

    var playerId = game.getPlayerId(player.name);
    var success = game.placePiece(playerId, pieceId, slot);
    if (success)
      sendContent(req, res);
    else
      sendContent(req, res, "Failed to place piece there");

    console.log('Player piece placement processed:', game.state.id, req.body)
    return;
  } catch(err) {
    sendContent(req, res, 'Request failed');
  }
});

app.post('/discard_piece', (req, res) => {
  const player = getPlayer(req.session);
  if (player === null) {
    sendContent(req, res, 'You are not registered!');
    return;
  }
  console.log('Player requested piece placement:', player.name, req.body)
  if (req.body === undefined) {
    sendContent(req, res, 'Request malformed');
    return;
  }
  var game = gameList.getCurrentGameForPlayer(player);
  if (game === undefined) {
    sendContent(req, res, 'You are not part of a game');
    return;
  }

  try {
    const pieceId = req.body.pieceId;

    var playerId = game.getPlayerId(player.name);
    var success = game.replacePiece(playerId, pieceId);
    if (success)
      sendContent(req, res);
    else
      sendContent(req, res, "Failed to replace piece");

    console.log('Player discarded piece:', game.state.id, req.body)
    return;
  } catch(err) {
    sendContent(req, res, 'Request failed');
  }
});

app.listen(config.port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${config.port}`)
});
