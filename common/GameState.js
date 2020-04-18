
class GameState {
  constructor(players) {
    this.players = [...players];
    this.state = { id: 0 };
  }

  fromJSON(json) {
    this.state = JSON.parse(json);
  }

  toJSON() {
    return JSON.stringify(this.state);
  }
}

export { GameState }
