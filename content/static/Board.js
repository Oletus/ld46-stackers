import { Sprite } from "./gameutils.js/src/gjs/sprite.js";

Sprite.gfxPath = '/';


const layout = {
  board: {offset: {x: 0, y: 0}},
  deck: {offset: {x: 0, y: 0}, padding: {x: 10, y: 4}},
  domino: {width: 64, height: 32},
}

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
    
    layout.domino.width = this.domino_base.img.width;
    layout.domino.height = this.domino_base.img.height;
    layout.board.offset.x = layout.domino.width / 2;
    layout.deck.offset.x = layout.domino.width / 2;
    layout.deck.offset.y = layout.domino.height * 7.5;
  }

  drawGrid(state) {
    var grid = state.board;
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    for (var row = 0; row < grid.length; ++row) {
      for (var slotI = 0; slotI < grid[row].length; ++slotI) {
        let x = layout.board.offset.x + (grid.length - row) * (layout.domino.width / 2) + (slotI * layout.domino.width);
        let y = layout.board.offset.y + (row + 1) * layout.domino.height;
        this.ctx.strokeRect(x, y, layout.domino.width, layout.domino.height);
      }
    }
  }
  
  drawDomino(domino, x, y) {
    this.domino_base.draw(this.ctx, x, y, layout.domino.width, layout.domino.height);
    this.domino_tops[domino.primary].draw(this.ctx, x, y, layout.domino.width, layout.domino.height);
    this.domino_bottom_lefts[domino.left].draw(this.ctx, x, y, layout.domino.width, layout.domino.height);
    this.domino_bottom_rights[domino.right].draw(this.ctx, x, y, layout.domino.width, layout.domino.height);
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

        var x = layout.board.offset.x + (grid.length - row) * (layout.domino.width / 2) + (slotI * layout.domino.width);
        var y = layout.board.offset.y + (row + 1) * layout.domino.height;
        this.drawDomino(domino, x, y);
      }
    }
  }

  drawDeck(state, playerId) {
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
      
      var x = layout.deck.offset.x + x * (layout.domino.width + layout.deck.padding.x);
      var y = layout.deck.offset.y + y * (layout.domino.height + layout.deck.padding.y);
      this.drawDomino(domino, x, y);
    }
  }

  onStateChange(stateJSON, playerId) {
    this.lastState = JSON.parse(stateJSON);
    this.localPlayerId = playerId;
    this.redraw();
  }

  redraw() {
    if (this.lastState === undefined || this.localPlayerId === undefined)
      return;

    this.drawGrid(this.lastState);
    this.drawPieces(this.lastState);
    this.drawDeck(this.lastState, this.localPlayerId);
  }
}

export { Board }
