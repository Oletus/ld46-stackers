class Domino {
  constructor(id, primary, left, right) {
    this.id = "" + id;
    this.primary = primary;
    this.left = left;
    this.right = right;
  }
}

const COLOR_COUNT = 5;
const START_DECK_SIZE = 16; //not including gold piece

const generateRandomDominoColor = () => {
  //0 is gold
  return 1 + Math.floor(Math.max(0, Math.random() * COLOR_COUNT - 0.0001));
}

class GameState {
  constructor(players) {
    this.players = [...players];
    this.state = { id: 0, turn: 0, decks: [[], []], dominos: {}, board: [] };
    this.nextDominoId = 0
    this.generateNewGame();
  }
  
  generateNewGame() {
    // board stores ids of dominos; dominos are looked up from state.dominos dictionary
    this.state.board = [[0,0], [0,0,0], [0,0,0,0], [0,0,0,0,0], [0,0,0,0,0,0]]

    var i;
    for (i = 0; i < START_DECK_SIZE; ++i) {
      this.state.decks[0].push(this.generateRandomDomino().id);
      this.state.decks[1].push(this.generateRandomDomino().id);
    }
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

  placePiece(playerIndex, pieceId, slotCoord) {
    if (playerIndex != this.state.turn)
      return false;
    
    if (this.state.board[slotCoord.y][slotCoord.x] !== 0)
      return false;

    const domino = this.state.dominos[pieceId];

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
    return true;
  }
}

export { GameState }
