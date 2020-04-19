import { Sprite } from "./gameutils.js/src/gjs/sprite.js";

Sprite.gfxPath = '/';

var test_grid = [
  [{"primary":1,"left":2,"right":1},0], 
  [{"primary":1,"left":1,"right":3},{"primary":2,"left":3,"right":1},{"primary":1,"left":3,"right":3}], 
  [{"primary":1,"left":3,"right":2},{"primary":1,"left":2,"right":1},0,{"primary":3,"left":2,"right":1}], 
  [{"primary":1,"left":2,"right":1},0,{"primary":1,"left":2,"right":2},0,0], 
  [{"primary":1,"left":1,"right":2},0,0,0,0,0]
];

class Board {
  constructor(ctx) {
    this.ctx = ctx;
    this.domino_base = new Sprite('domino_base.png');

    this.domino_t_gold = new Sprite('domino_top-gold.png');
    this.domino_t_red = new Sprite('domino_top-red.png');
    this.domino_bl_red = new Sprite('domino_bottom_left-red.png');
    this.domino_br_red = new Sprite('domino_bottom_right-red.png');
    this.domino_t_green = new Sprite('domino_top-green.png');
    this.domino_bl_green = new Sprite('domino_bottom_left-green.png');
    this.domino_br_green = new Sprite('domino_bottom_right-green.png');
    this.domino_t_blue = new Sprite('domino_top-blue.png');
    this.domino_bl_blue = new Sprite('domino_bottom_left-blue.png');
    this.domino_br_blue = new Sprite('domino_bottom_right-blue.png');

    this.domino_tops = [this.domino_t_gold, this.domino_t_red, this.domino_t_green, this.domino_t_blue];
    this.domino_bottom_lefts = [this.domino_bl_red, this.domino_bl_red, this.domino_bl_green, this.domino_bl_blue];
    this.domino_bottom_rights = [this.domino_bl_red, this.domino_br_red, this.domino_br_green, this.domino_br_blue];
  }

  drawGrid(state) {
    var grid = state.board;
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    for (var row = 0; row < grid.length; ++row) {
      for (var slotI = 0; slotI < grid[row].length; ++slotI) {
        let x = (grid.length - row) * (this.domino_base.img.width / 2) + (slotI * this.domino_base.img.width);
        let y = (row + 1) * this.domino_base.img.height;
        this.ctx.strokeRect(x, y, this.domino_base.img.width, this.domino_base.img.height);
      }
    }
  }

  drawPieces(state) {
    var grid = state.board;
    for (var row = 0; row < grid.length; ++row) {
      for (var slotI = 0; slotI < grid[row].length; ++slotI) {
        var slot = grid[row][slotI];
        if (slot === undefined)
          continue;

        if (slot === 0)
          continue;

        var domino = grid[row][slotI];
        if (domino === 0)
          continue;

        var domino = state.dominos[domino];
        if (domino === undefined)
          continue;

        var x = (grid.length - row) * (this.domino_base.img.width / 2) + (slotI * this.domino_base.img.width);
        var y = (row + 1) * this.domino_base.img.height;
        this.domino_base.draw(this.ctx, x, y);
        this.domino_tops[domino.primary].draw(this.ctx, x, y);
        this.domino_bottom_lefts[domino.left].draw(this.ctx, x, y);
        this.domino_bottom_rights[domino.right].draw(this.ctx, x, y);
      }
    }
  }

  drawDeck(state, playerId) {
    var deckOffset = {x: this.domino_base.img.width / 2, y: this.domino_base.img.height * 7.5}
    var deck = state.decks[playerId];
    for (var slotI = 0; slotI < deck.length; ++slotI) {
      var domino = deck[slotI];
      if (domino === 0)
        continue;

      var domino = state.dominos[domino];
      if (domino === undefined)
        continue;

      var x = slotI % 8;
      var y = Math.floor(slotI / 8);
      
      var x = x * (this.domino_base.img.width + 10) + deckOffset.x;
      var y = y * (this.domino_base.img.height + 4) + deckOffset.y;

      this.domino_base.draw(this.ctx, x, y);
      this.domino_tops[domino.primary].draw(this.ctx, x, y);
      this.domino_bottom_lefts[domino.left].draw(this.ctx, x, y);
      this.domino_bottom_rights[domino.right].draw(this.ctx, x, y);
    }
  }

  draw(stateJSON, playerId) {
    var state = JSON.parse(stateJSON);
    this.drawGrid(state);
    this.drawPieces(state);
    this.drawDeck(state, playerId);
  }
}

export { Board }
