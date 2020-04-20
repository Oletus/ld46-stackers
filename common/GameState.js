class Domino {
  constructor(id, primary, left, right) {
    this.id = "" + id;
    this.primary = primary;
    this.left = left;
    this.right = right;
  }
}

const COLOR_COUNT = 3;
const START_DECK_SIZE = 15; //not including gold piece

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

    // we generate the final pair of dominos and guarantee a shared color
    var shared_color = generateRandomDominoColor();
    var gold1 = new Domino(this.nextDominoId++, 0, shared_color, generateRandomDominoColor());
    var gold2 = new Domino(this.nextDominoId++, 0, generateRandomDominoColor(), shared_color);
    this.registerDomino(gold1);
    this.registerDomino(gold2);
    
    // half the time, swap, so the players don't know which side of the domino they have is shared
    if (Math.random() > 0.5)
      [gold1, gold2] = [gold2, gold1];
 
    // decks store ids of dominos; dominos are looked up from state.dominos dictionary
    this.state.decks[0].push(gold1.id);
    this.state.decks[1].push(gold2.id);
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
    
    // gold pieces must be on top
    if (domino.primary === 0 && slotCoord.y !== 0) {
        return false;
    }
    // only gold pieces can be on top
    if (domino.primary !== 0 && slotCoord.y === 0) {
        return false;
    }

    // require support of the proper colors
    if (this.state.board.length > slotCoord.y + 1) {
      var left = this.state.board[slotCoord.y + 1][slotCoord.x]
      if (left === 0)
        return false;
      var right = this.state.board[slotCoord.y + 1][slotCoord.x + 1]
      if (right === 0)
        return false;

      left = this.state.dominos[left];
      right = this.state.dominos[right];
      if (domino.left !== left.primary || domino.right !== right.primary)
        return false;
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
