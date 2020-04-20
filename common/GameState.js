class Domino {
  constructor(id, primary, left, right) {
    this.id = "" + id;
    this.primary = primary;
    this.left = left;
    this.right = right;
  }
}

const COLOR_COUNT = 5;
const GOLD_PIECES_EACH = 3;
const START_DECK_SIZE = 13; //not including gold pieces

const generateRandomDominoColor = () => {
  //0 is gold
  return 1 + Math.floor(Math.max(0, Math.random() * COLOR_COUNT - 0.0001));
}

class GameState {
  constructor(players) {
    this.players = [...players];
    this.generateNewGame();
  }
  
  generateNewGame() {
    this.state = { id: 0, turn: 0, victory:null, decks: [[], []], dominos: {}, board: [] };
    this.nextDominoId = 0

    // board stores ids of dominos; dominos are looked up from state.dominos dictionary
    this.state.board = [[0,0], [0,0,0], [0,0,0,0], [0,0,0,0,0], [0,0,0,0,0,0]]

    for (i = 0; i < GOLD_PIECES_EACH; ++i) {
      var gold1 = new Domino(this.nextDominoId++, 0, generateRandomDominoColor(), generateRandomDominoColor());
      var gold2 = new Domino(this.nextDominoId++, 0, generateRandomDominoColor(), generateRandomDominoColor());
      this.registerDomino(gold1);
      this.registerDomino(gold2);
      this.state.decks[0].push(gold1.id);
      this.state.decks[1].push(gold2.id);
    }
 
    // decks store ids of dominos; dominos are looked up from state.dominos dictionary
    var i;
    for (i = 0; i < START_DECK_SIZE; ++i) {
      this.state.decks[0].push(this.generateRandomDomino().id);
      this.state.decks[1].push(this.generateRandomDomino().id);
    }
    this.state.decks[0].sort((a, b) => (this.state.dominos[a].primary === 0 ? -1000 : 0) + (this.state.dominos[a].left - this.state.dominos[b].left) * 100 + (this.state.dominos[a].right - this.state.dominos[b].right) * 10 + (this.state.dominos[a].primary - this.state.dominos[b].primary));
    this.state.decks[1].sort((a, b) => (this.state.dominos[a].primary === 0 ? -1000 : 0) + (this.state.dominos[a].left - this.state.dominos[b].left) * 100 + (this.state.dominos[a].right - this.state.dominos[b].right) * 10 + (this.state.dominos[a].primary - this.state.dominos[b].primary));
  }

  fromJSON(json) {
    this.state = JSON.parse(json);
  }

  toJSON() {
    return JSON.stringify(this.state);
  }
  
  registerDomino(domino) {
    this.state.dominos[domino.id] = domino;
  }
  
  generateRandomDomino() {
    var domino = new Domino(this.nextDominoId++, generateRandomDominoColor(), generateRandomDominoColor(), generateRandomDominoColor());
    this.registerDomino(domino)
    return domino
  }
  
  getPlayerId(playerName) {
    const playerIndex = this.players[0].name == playerName ? 0 : this.players[1].name == playerName ? 1 : -1;
    return playerIndex;
  }
  
  discardPiece(playerIndex, pieceId) {
    if (this.state.dominos[pieceId].primary == 0) {
      console.log("Cannot discard gold piece!");
      return false;
    }
    if (!this.replacePiece(playerIndex, pieceId))
      return false;

    this.state.turn = (playerIndex + 1) % 2;
    return true;
  }
  
  replacePiece(playerIndex, pieceId) {
    var deck = this.state.decks[playerIndex];
    var newDeck = deck.filter(value => value != pieceId);
    if (newDeck.length == deck.length) {
      // piece wasn't in deck
      return false;
    }

    if (typeof this.players[0] === "object")
      newDeck.push(this.generateRandomDomino().id);
    this.state.decks[playerIndex] = newDeck;
    return true;
  }
  
  testVictory() {
    var left = this.state.board[0][0];
      if (left === 0)
        return false;
    var right = this.state.board[0][1]
    if (right === 0)
      return false;

    left = this.state.dominos[left];
    right = this.state.dominos[right];
    if (0 !== left.primary || 0 !== right.primary)
      return false;

    this.state.victory = true;
    return true;
  }

  placePiece(playerIndex, pieceId, slotCoord) {
    if (playerIndex != this.state.turn)
      return false;
    
    if (this.state.board[slotCoord.y][slotCoord.x] !== 0)
      return false;

    const domino = this.state.dominos[pieceId];
    
    // only gold pieces can be on top
    if (domino.primary !== 0 && slotCoord.y === 0) {
        return false;
    }

    // require support of the proper colors
    if (this.state.board.length > slotCoord.y + 1) {
      var left = this.state.board[slotCoord.y + 1][slotCoord.x]
      if (left !== 0) {
        left = this.state.dominos[left];
        if (domino.left !== left.primary)
          return false;
      }
      var right = this.state.board[slotCoord.y + 1][slotCoord.x + 1]
      if (right !== 0) {
        right = this.state.dominos[right];
        if (domino.right !== right.primary)
          return false;
      }
    }
    if (slotCoord.y > 0 && slotCoord.x > 0) {
      var upLeft = this.state.board[slotCoord.y - 1][slotCoord.x - 1]
      if (upLeft !== 0) {
        upLeft = this.state.dominos[upLeft];
        if (domino.primary !== upLeft.right)
          return false;
      }
    }
    if (slotCoord.y > 0 && slotCoord.x z < this.state.board[slotCoord.y - 1].length) {
      var upRight = this.state.board[slotCoord.y - 1][slotCoord.x]
      if (upRight !== 0) {
        upRight = this.state.dominos[upRight];
        if (domino.primary !== upRight.left)
          return false;
      }
    }

    if (!this.replacePiece(playerIndex, pieceId))
      return false;

    this.state.board[slotCoord.y][slotCoord.x] = pieceId
    this.state.turn = (playerIndex + 1) % 2;
    
    this.testVictory();
    
    return true;
  }
}

export { GameState }
