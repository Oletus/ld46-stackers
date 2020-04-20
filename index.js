import bodyParser from 'body-parser';
import express from 'express';
import session from 'express-session';
import fs from 'fs';
import path from 'path';
import imageSize from 'image-size';
import yargs from 'yargs';

import { GameState } from './common/GameState.js';
import { MultiuserSessionList } from './multiuserlobby/MultiuserSessionList.js';
import { escapeHTML } from './multiuserlobby/htmlUtil.js';

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

const accessCodeLength = 5;
const gameList = new MultiuserSessionList(accessCodeLength);

const indexHTML = fs.readFileSync('content/index.html', 'utf8');

const getPlayerChunk = (player) => {
  if (player !== null) {
    let playerInfoChunk = "";
    const multiuserSession = gameList.getCurrentSessionForUser(player);
    if (multiuserSession === null) {
      playerInfoChunk = `
      <div class="formGrid"><form id="joinGameForm" onsubmit="window.postForm('/joinGameLobby', document.getElementById('joinGameForm'), true); return false;">
      Enter access code to join existing game: <input type="text" maxlength="${accessCodeLength}" name="accessCode"><input type="submit" value="Join game lobby" />
      </form></div>
      <div class="formGrid"><form id="startLobbyForm" onsubmit="window.postForm('/startGameLobby', document.getElementById('startLobbyForm'), true); return false;">
      <input type="submit" value="Start a new game lobby" />
      </form></div>`;
    } else {
      let otherPlayers = multiuserSession.userNameListHTML(player);
      if (otherPlayers === "") {
        otherPlayers = 'none';
      } else {
        otherPlayers = `<b>${otherPlayers}</b>`;
      }
      playerInfoChunk = `<p>Other players currently in lobby: ${otherPlayers}.</p>
      <p>Invite others to join using this access code: <b>${multiuserSession.accessCode}</b>.</p>
      <div class="formGrid"><form id="startGameForm" onsubmit="window.postForm('/startGame', document.getElementById('startGameForm'), true); return false;">
      <input type="submit" value="Play game" />
      </form></div>`;
    }
    return `<div class="registeredPlayer">You are: <b>${escapeHTML(player.name)}</b>.${playerInfoChunk}</div>`;
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
  const gameSession = gameList.getCurrentSessionForUser(player);
  const responseJson = {
    pageContentHTML: getPlayerChunk(player),
    playerRegistered: player !== null,
    inGameSession: gameSession != null,
  };
  let gameState = null;
  if (gameSession != null) {
    gameState = gameSession.appState;
    responseJson.gameSessionAccessCode = gameSession.accessCode;
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

const tryParseRequest = (req, res) => {
  if (req.body === undefined || req.body.jsonData === undefined) {
    sendContent(req, res, 'Invalid request.');
    return null;
  }
  try {
    return JSON.parse(req.body.jsonData);
  } catch(err) {
    sendContent(req, res, 'Failed to parse JSON');
    return null;
  }
}

app.post('/register', (req, res) => {
  const reqData = tryParseRequest(req, res);
  if (reqData === null) {
    return;
  }
  console.log('Player register request:', req.body);
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
});

app.post('/startGameLobby', (req, res) => {
  console.log('Start game lobby request:');
  const user = gameList.getUser(req.session);
  if (user === null) {
    sendContent(req, res, 'You are not registered!');
    return;
  }
  gameList.startSession([user], {userCountLimit: 2});
  sendContent(req, res);
});

app.post('/joinGameLobby', (req, res) => {
  const user = gameList.getUser(req.session);
  if (user === null) {
    sendContent(req, res, 'You are not registered!');
    return;
  }
  const reqData = tryParseRequest(req, res);
  if (reqData === null) {
    return;
  }
  console.log('Join game lobby request:', req.body);
  if (!reqData.hasOwnProperty("accessCode") || reqData.accessCode === "") {
    sendContent(req, res, 'accessCode not set in register request');
    return;
  }
  if (!gameList.tryJoinSession(reqData.accessCode, user)) {
    console.log('Trying to join session with code ' + reqData.accessCode + ' failed.');
    sendContent(req, res, 'trying to join session failed');
    return;
  }
  sendContent(req, res);
});

app.post('/startGame', (req, res) => {
  const user = gameList.getUser(req.session);
  if (user === null) {
    sendContent(req, res, 'You are not registered!');
    return;
  }
  const gameSession = gameList.getCurrentSessionForUser(user);
  if (gameSession === null) {
    sendContent(req, res, 'Not in a game lobby!');
    return;
  }
  if (gameSession.users.length < 2) {
    sendContent(req, res, 'Need two players present to start the game!');
    return;
  }
  if (gameSession.appState !== null) {
    sendContent(req, res, 'App already started.');
    return;
  }
  gameSession.startApp((users) => new GameState(users));
  sendContent(req, res);
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

    var playerId = game.getPlayerId(player.name);
    var success = game.discardPiece(playerId, pieceId);
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
