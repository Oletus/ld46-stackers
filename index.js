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

var logAll = false; // include log messages with player names

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());

var sessionSettings = {
  secret: 'sdhfjksahfkjhsdkjewr',
  cookie: {}
}
app.use(session(sessionSettings));

const accessCodeLength = 5;
const maxPlayerNameLength = 20;
const gameList = new MultiuserSessionList(accessCodeLength, maxPlayerNameLength);

const indexHTML = fs.readFileSync('content/index.html', 'utf8');

const getPlayerChunk = (player) => {
  const logoImg = `<img src="domino_logo.png" alt="Stacker Slackers" class="logoImage">`;
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
      </form></div>
      ${logoImg}`;
    } else {
      let otherPlayers = multiuserSession.userNameListHTML(player);
      if (otherPlayers === "") {
        otherPlayers = 'none';
      } else {
        otherPlayers = `<b>${otherPlayers}</b>`;
      }

      let gameControlForm = `<p>Invite another player to join using this access code: <b>${multiuserSession.accessCode}</b>. You need 2 players to be able to play.</p>
      <div class="formGrid"><form id="startGameForm" onsubmit="window.postForm('/startGame', document.getElementById('startGameForm'), true); return false;">
      <input type="checkbox" name="wordsEnabled" id="wordsEnabled"><label for="wordsEnabled">Play word game mode</label> <input type="submit" value="Play game" />
      </form></div>`;
      let gameOrLobby = 'lobby';
      if (multiuserSession.appState !== null) {
        gameControlForm = `<p>Your goal is to build a pyramid with the crown pieces on top. Colors must match on pieces that touch. Take turns and collaborate!</p>
        <div class="formGrid"><form id="restartGameForm" onsubmit="window.postForm('/restartGame', document.getElementById('restartGameForm'), true); return false;">
        <input type="submit" value="Restart game" />
        </form></div>`;
        gameOrLobby = 'game';
      }

      playerInfoChunk = `<p>Other players currently in ${gameOrLobby}: ${otherPlayers}.</p>
      ${gameControlForm}
      <div class="formGrid"><form id="leaveLobbyForm" onsubmit="window.postForm('/leaveLobby', document.getElementById('leaveLobbyForm'), true); return false;">
      <input type="submit" value="Leave ${gameOrLobby}" />
      </form></div>
      ${multiuserSession.appState === null ? logoImg : ""}`;
    }
    return `<div class="registeredPlayer">You are: <b>${escapeHTML(player.name)}</b>.${playerInfoChunk}</div>`;
  } else {
    return `<p>Welcome to Stacker Slackers, an online multiplayer game made for Ludum Dare 46.</p>
     <p>Credits: <b>Zachary Laster</b> (<a href="https://www.twitter.com/XCompWiz/">@XCompWiz</a>) - programming, <b>Sedeer el-Showk</b> (<a href="https://www.twitter.com/inspiringsci">@inspiringsci</a>) - programming, <b>Olli Etuaho</b> (<a href="https://www.twitter.com/Oletus/">@Oletus</a>) - music, programming, <b>Antti Hamara</b> - visual art.</p>
     <div class="unregisteredPlayer"><form id="registerForm" onsubmit="window.postForm('/register', document.getElementById('registerForm'), true); return false;">
     Enter your name: 
     <input type="text" name="playerName" maxLength="${maxPlayerNameLength}" />
     <input type="submit" value="Register" />
     </form></div>
     ${logoImg}`;
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
  if (logAll) console.log('Player register request:', req.body);
  if (!reqData.hasOwnProperty("playerName") || reqData.playerName === "") {
    sendContent(req, res, 'playerName not set in register request');
    return;
  }
  const playerName = reqData.playerName;
  if (gameList.tryRegisterUser(req.session, playerName)) {
    if (logAll) console.log('Player registered:', playerName);
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
  gameList.startSession([user], {userCountLimit: 2, killAppOnUserLeft: true});
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
  const reqData = tryParseRequest(req, res);
  if (reqData === null) {
    return;
  }
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
  const wordsEnabled = reqData.hasOwnProperty("wordsEnabled") && reqData.wordsEnabled;
  gameSession.startApp((users) => new GameState(users, wordsEnabled));
  sendContent(req, res);
});

app.post('/restartGame', (req, res) => {
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
  if (gameSession.appState === null) {
    sendContent(req, res, 'Can only restart once the game has been started.');
    return;
  }
  gameSession.restartApp();
  sendContent(req, res);
});

app.post('/leaveLobby', (req, res) => {
  const user = gameList.getUser(req.session);
  if (user === null) {
    sendContent(req, res, 'You are not registered!');
    return;
  }
  if (!gameList.tryLeaveSession(user)) {
    sendContent(req, res, "Could not leave session - maybe you're not in a game lobby yet?");
    return;
  }
  sendContent(req, res);
});

app.post('/place_piece', (req, res) => {
  const player = gameList.getUser(req.session);
  if (player === null) {
    sendContent(req, res, 'You are not registered!');
    return;
  }
  if (logAll) console.log('Player requested piece placement:', player.name, req.body)
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
  if (logAll) console.log('Player requested piece placement:', player.name, req.body)
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
