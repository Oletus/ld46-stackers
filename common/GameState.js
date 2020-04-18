class Domino {
  constructor(id, primary, left, right) {
    this.id = "" + id;
    this.primary = primary;
    this.left = left;
    this.right = right;
  }
}

const COLOR_COUNT = 3;
const START_DECK_SIZE = 15;

const generateRandomDominoColor = () => {
  //0 is gold
  return 1 + Math.floor(Math.random() * COLOR_COUNT - 0.01);
}

class GameState {
  constructor(players) {
    this.players = [...players];
    this.state = { id: 0, turn: 0, decks: [[], []], dominos: {}, board: [] };
    this.nextDominoId = 0
    this.generateNewGame();
  }
  
  generateNewGame() {
    this.state.board = [[0,0], [0,0,0], [0,0,0,0], [0,0,0,0,0], [0,0,0,0,0,0]]

    var shared_color = generateRandomDominoColor();
    var gold1 = new Domino(this.nextDominoId++, 0, shared_color, generateRandomDominoColor());
    var gold2 = new Domino(this.nextDominoId++, 0, generateRandomDominoColor(), shared_color);
    this.registerDomino(gold1);
    this.registerDomino(gold2);
    if (Math.random() > 0.5)
      [gold1, gold2] = [gold2, gold1];
 
    this.state.decks[0].push(gold1);
    this.state.decks[1].push(gold1);
    var i;
    for (i = 0; i < START_DECK_SIZE; ++i) {
      this.state.decks[0].push(this.generateRandomDomino());
      this.state.decks[1].push(this.generateRandomDomino());
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
}

export { GameState }
