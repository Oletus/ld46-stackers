import { GameState } from "/common/gamestate.js";
import { Sprite } from "./gameutils.js/src/gjs/sprite.js";

Sprite.gfxPath = '/';

const DECK_DOMINOS_WIDTH = 8

const layout = {
  board: {offset: {x: 0, y: 0}},
  deck: {offset: {x: 0, y: 0}, padding: {x: 10, y: 4}},
  dragged: {offset: {x: 0, y: 0}},
  domino: {width: 64, height: 32},
}

const isInside = (bounds, x, y) => {
  if (bounds === undefined)
    return false;

  return y > bounds.top && y < bounds.bottom && x > bounds.left && x < bounds.right;
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
    layout.dragged.offset.x = -layout.domino.width / 2;
    layout.dragged.offset.y = -layout.domino.height / 2;
    
    this.mousePos = {x:0, y:0};
    
    this.dragged_domino = 0;

    this.gameContainer = new GameState("Me", "Them");
  }
  
  relayoutBounds() {
    if (this.lastState === undefined || this.localPlayerId === undefined)
      return false;

    var rowCount = this.lastState.board.length;
    var longest = this.lastState.board[rowCount - 1].length // The number of dominos in the bottom row
    var playerDeckSize = this.lastState.decks[this.localPlayerId].length;

    layout.board.bounds = {}
    layout.board.bounds.top = layout.board.offset.y,
    layout.board.bounds.bottom = layout.board.bounds.top + rowCount * layout.domino.height;
    layout.board.bounds.left = layout.board.offset.x + (layout.domino.width / 2); 
    layout.board.bounds.right = layout.board.bounds.left + (longest * layout.domino.width);

    layout.deck.bounds = {}
    layout.deck.bounds.top = layout.deck.offset.y;
    layout.deck.bounds.bottom = layout.deck.bounds.top + Math.ceil(playerDeckSize / DECK_DOMINOS_WIDTH) * (layout.domino.height + layout.deck.padding.y);
    layout.deck.bounds.left = layout.deck.offset.x;
    layout.deck.bounds.right = layout.deck.bounds.left + DECK_DOMINOS_WIDTH * (layout.domino.width + layout.deck.padding.x) - layout.deck.padding.x;
    return true;
  }

  drawGrid(state) {
    var grid = state.board;
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    for (var row = 0; row < grid.length; ++row) {
      for (var slotI = 0; slotI < grid[row].length; ++slotI) {
        let x = layout.board.offset.x + (grid.length - row) * (layout.domino.width / 2) + (slotI * layout.domino.width);
        let y = layout.board.offset.y + row * layout.domino.height;
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
        var y = layout.board.offset.y + row * layout.domino.height;
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
      
      if (domino === this.dragged_domino)
        continue;

      var domino = state.dominos[domino];
      if (domino === undefined)
        continue;

      var x = slotI % DECK_DOMINOS_WIDTH;
      var y = Math.floor(slotI / DECK_DOMINOS_WIDTH);
      
      var x = layout.deck.offset.x + x * (layout.domino.width + layout.deck.padding.x);
      var y = layout.deck.offset.y + y * (layout.domino.height + layout.deck.padding.y);
      this.drawDomino(domino, x, y);
    }
  }

  drawHeldDomino(state, mousePos) {
    if (!this.dragged_domino)
      return;

    var domino = state.dominos[this.dragged_domino];
    if (domino === undefined)
      return;

    var x = layout.dragged.offset.x + mousePos.x;
    var y = layout.dragged.offset.y + mousePos.y;
    this.drawDomino(domino, x, y);
  }

  onStateChange(stateJSON, playerId) {
    this.lastState = JSON.parse(stateJSON);
    this.localPlayerId = playerId;
    this.redraw();
  }

  onMouseMove(mousePos) {
  }

  canvasPress(event) {
    var x = event.currentPosition.x;
    var y = event.currentPosition.y;

    if (layout.board.bounds === undefined || layout.deck.bounds === undefined)
      this.relayoutBounds();
    
    if (isInside(layout.board.bounds, x, y)) {
      this.tryClickBoard(x, y);
    } else if (isInside(layout.deck.bounds, x, y)) {
      this.tryClickDeck(x, y);
    }
  }

  canvasRelease(event) {
  }

  canvasMove(event) {
    this.mousePos = event.currentPosition;
    this.redraw();
  }
  
  tryClickBoard(mouseX, mouseY) {
    mouseX = mouseX - layout.board.offset.x;
    mouseY = mouseY - layout.board.offset.y;

    var pixelX = layout.domino.width;
    var pixelY = layout.domino.height;
    
    var posY = Math.floor(mouseY / pixelY);
    
    var rowAlignedX = mouseX - (this.lastState.board.length - posY) * (pixelX / 2);
    var posX = Math.floor(rowAlignedX / pixelX);

    if (posX < 0)
      return;
    
    var gridPos = {x: posX, y: posY};
    this.tryPlaceDomino(this.dragged_domino, gridPos)
  }
  
  tryClickDeck(mouseX, mouseY) {
    mouseX = mouseX - layout.deck.offset.x;
    mouseY = mouseY - layout.deck.offset.y;

    var pixelX = (layout.domino.width + layout.deck.padding.x);
    var pixelY = (layout.domino.height + layout.deck.padding.y);

    var posX = Math.floor(mouseX / pixelX);

    var overshoot = mouseX - posX * pixelX - layout.domino.width;
    if (overshoot > 0)
      return;

    var posY = Math.floor(mouseY / pixelY);
    overshoot = mouseY - posY * pixelY - layout.domino.height;
    if (overshoot > 0)
      return;

    var index = posX + posY * DECK_DOMINOS_WIDTH;
    var dominoId = this.lastState.decks[this.localPlayerId][index];
    this.tryPickupDomino(dominoId);
    this.redraw();
  }

  tryPickupDomino(dominoId) {
    if (this.dragged_domino === dominoId) {
      this.dragged_domino = 0
      return;
    }

    this.dragged_domino = dominoId;
    return true;
  }
  
  tryPlaceDomino(dominoId, gridPos = {x: 0, y: 0}) {
    if (this.lastState === undefined || this.localPlayerId === undefined)
      return false;

    this.gameContainer.state = this.lastState
    var success = this.gameContainer.placePiece(this.localPlayerId, dominoId, gridPos);
    console.log("Tried place", dominoId, gridPos, success);
    if (success) {
      this.dragged_domino = 0;
      fetch('/place_piece', {
        method: 'POST',
        body: JSON.stringify({
          pieceId: dominoId,
          slotX: gridPos.x,
          slotY: gridPos.y,
        }),
        headers: {
          'Content-type': 'application/json; charset=UTF-8'
        }
      });
      this.redraw();
    }
  }

  redraw() {
    if (this.lastState === undefined || this.localPlayerId === undefined)
      return;

    this.drawGrid(this.lastState);
    this.drawPieces(this.lastState);
    this.drawDeck(this.lastState, this.localPlayerId);

    this.drawHeldDomino(this.lastState, this.mousePos);
  }
}

export { Board }
