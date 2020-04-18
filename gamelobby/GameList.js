
class GameList {

  constructor() {
    this.allOngoingGames = [];
    this.ongoingGamesByPlayer = {};  // Map from player id to game specific state object.
  }

  // createGame should be a function for initializing a game state for an array of players.
  startGame(createGame, players) {
    const game = createGame(players);
    console.log('Game Created:', game.state.id);
    this.allOngoingGames.push(game);
    for (const player of players) {
      // TODO: Do something sensible if the player is already in another game. Maybe support players leaving a game?
      this.ongoingGamesByPlayer[player.id] = game;
    }
  }

  getCurrentGameForPlayer(player) {
    if (player === null) {
      return null;
    }
    if (!this.ongoingGamesByPlayer.hasOwnProperty(player.id)) {
      return null;
    }
    return this.ongoingGamesByPlayer[player.id];
  }

}

export { GameList }