import bodyParser from 'body-parser';
import express from 'express';
import session from 'express-session';
import fs from 'fs';
import path from 'path';
import imageSize from 'image-size';
import yargs from 'yargs';

import { GameState } from './common/GameState.js';
import { Player } from './gamelobby/Player.js';
import { GameList } from './gamelobby/GameList.js';

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

let allRegisteredPlayers = [];
const gameList = new GameList();

const getPlayer = (session) => {
  if (!session.hasOwnProperty("playerId")) {
    return null;
  }
  if (session.playerId < 0 || session.playerId >= allRegisteredPlayers.length) {
    return null;
  }
  return allRegisteredPlayers[session.playerId];
}

const indexHTML = fs.readFileSync('content/index.html', 'utf8');

const getPlayerChunk = (player) => {
  if (player !== null) {
    let playerInfoChunk = "";
    // TODO: Shouldn't show a list of all players on the server here.
    if (gameList.getCurrentGameForPlayer(player) === null) {
      playerInfoChunk = ` All players on server: ${getPlayersDisplayList()}.
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

const getPlayersDisplayList = () => {
  const strList = [];
  for (const player of allRegisteredPlayers) {
    strList.push(escapeHTML(player.name));
  }
  return strList.join(', ');
}

app.get('/', (req, res) => {
  res.send(indexHTML);
});

app.use(express.static('content/static'));
app.use('/common', express.static('common'));

const sendContent = (req, res, notification) => {
  const player = getPlayer(req.session);
  const responseJson = {
    pageContentHTML: getPlayerChunk(player),
    playerRegistered: player !== null,
  };
  const gameState = gameList.getCurrentGameForPlayer(player);
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
    if (getPlayer(req.session) !== null) {
      sendContent(req, res, 'You are already registered!');
      return;
    }
    try {
      const reqData = JSON.parse(req.body.jsonData);
      const playerName = reqData.playerName;
      req.session.playerId = allRegisteredPlayers.length;
      allRegisteredPlayers.push(new Player(req.session.playerId, playerName));
      console.log('Player registered:', playerName);
      sendContent(req, res);
      return;
    } catch(err) {}
  }
  sendContent(req, res, 'Something went wrong.');
});

app.post('/startGame', (req, res) => {
  const player = getPlayer(req.session);
  if (player === null) {
    sendContent(req, res, 'You are not registered!');
    return;
  }
  if (allRegisteredPlayers.length < 2) {
    sendContent(req, res, 'Need two players present to start the game!');
    return;
  }
  if (allRegisteredPlayers[0] !== player && allRegisteredPlayers[1] !== player) {
    // TODO: Implement a better lobby system.
    sendContent(req, res, 'You need to be one of the first 2 players on the server to start the game!');
    return;
  }
  gameList.startGame((players) => new GameState(players), [allRegisteredPlayers[0], allRegisteredPlayers[1]]);
});

app.post('/place_piece', (req, res) => {
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
