import bodyParser from 'body-parser';
import express from 'express';
import session from 'express-session';
import fs from 'fs';
import path from 'path';
import imageSize from 'image-size';
import yargs from 'yargs';

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

class Player {
  constructor(id, name) {
    this.id = "" + id;
    this.name = name;
  }
}

let allRegisteredPlayers = [];

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
    return `<div class="registeredPlayer">You are: ${escapeHTML(player.name)}.</div>`
  } else {
    return `<div class="unregisteredPlayer"><form id="registerForm" onsubmit="postForm('/register', document.getElementById('registerForm')); return false;">
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

const sendContent = (req, res, notification) => {
  const player = getPlayer(req.session);
  const responseJson = {
    pageContentHTML: getPlayerChunk(player)
  };
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
      sendContent(req, res, 'Olet jo rekisteröinyt!');
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

app.listen(config.port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${config.port}`)
});
