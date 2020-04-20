import { GameState } from "/common/GameState.js";
import { Sprite } from "./gameutils.js/src/gjs/sprite.js";

Sprite.gfxPath = '/';

const DECK_DOMINOS_WIDTH = 8

const layout = {
  board: {offset: {x: 0, y: 0}},
  deck: {offset: {x: 0, y: 0}, padding: {x: 4, y: 4}},
  dragged: {offset: {x: 0, y: 0}},
  domino: {width: 64, height: 32},
  discard: {width: 128, height: 128, margin: {left: 20}},
  turnIndicator: {offset: {x: 100, y: 50}},
  muteIcon: {width: 40, height: 40}
}

const isInside = (bounds, x, y) => {
  if (bounds === undefined)
    return false;

  return y > bounds.top && y < bounds.bottom && x > bounds.left && x < bounds.right;
}

var bgm

class Board {
  constructor(ctx) {
    this.ctx = ctx;
    this.domino_base = new Sprite('domino_base.png');

    this.domino_t_gold = new Sprite('domino_top-crown.png');
    this.domino_t_red = new Sprite('domino_top-red.png');
    this.domino_bl_red = new Sprite('domino_bottom_left-red.png');
    this.domino_br_red = new Sprite('domino_bottom_right-red.png');
    this.domino_t_green = new Sprite('domino_top-green.png');
    this.domino_bl_green = new Sprite('domino_bottom_left-green.png');
    this.domino_br_green = new Sprite('domino_bottom_right-green.png');
    this.domino_t_blue = new Sprite('domino_top-blue.png');
    this.domino_bl_blue = new Sprite('domino_bottom_left-blue.png');
    this.domino_br_blue = new Sprite('domino_bottom_right-blue.png');

    this.domino_transparent_top_bg = new Sprite('domino_transparent_top_bg.png');

    this.domino_tops = [this.domino_t_gold, this.domino_t_red, this.domino_t_green, this.domino_t_blue];
    this.domino_bottom_lefts = [this.domino_bl_red, this.domino_bl_red, this.domino_bl_green, this.domino_bl_blue];
    this.domino_bottom_rights = [this.domino_bl_red, this.domino_br_red, this.domino_br_green, this.domino_br_blue];
    
    this.muted = true;
    this.playing_icon = new Sprite('playing.png');
    this.muted_icon = new Sprite('muted.png');

    layout.domino.width = this.domino_base.img.width;
    layout.domino.height = this.domino_base.img.height;
    layout.board.offset.x = (ctx.canvas.width - layout.discard.width - layout.discard.margin.left) / 2 - layout.domino.width * 3.5;
    layout.deck.offset.x = ctx.canvas.width / 2 - (layout.domino.width + layout.deck.padding.x) * 4;
    layout.deck.offset.y = layout.domino.height * 3;
    layout.dragged.offset.x = -layout.domino.width / 2;
    layout.dragged.offset.y = -layout.domino.height / 2;
    
    this.mousePos = {x:0, y:0};
    
    this.dragged_domino = 0;

    this.gameContainer = new GameState("Me", "Them");

    bgm = new window.Howl({src:'chilling_at_the_pyramid.mp3',autoplay:false,loop:true,volume:0.2});
  }
  
  relayoutBounds() {
    if (this.lastState === undefined || this.localPlayerId === undefined)
      return false;

    var rowCount = this.lastState.board.length;
    var longest = this.lastState.board[rowCount - 1].length // The number of dominos in the bottom row
    var playerDeckSize = this.lastState.decks[this.localPlayerId].length;

    layout.board.bounds = {}
    layout.board.bounds.top = layout.board.offset.y,
    layout.board.bounds.bottom = layout.board.bounds.top + (rowCount + 1) * layout.domino.height / 2;
    layout.board.bounds.left = layout.board.offset.x + (layout.domino.width / 2); 
    layout.board.bounds.right = layout.board.bounds.left + (longest * layout.domino.width);

    layout.discard.bounds = {}
    layout.discard.bounds.top = layout.board.bounds.bottom - 2 * layout.domino.height;
    layout.discard.bounds.bottom = layout.discard.bounds.top + layout.discard.height;
    layout.discard.bounds.left = layout.board.bounds.right + layout.discard.margin.left;
    layout.discard.bounds.right = layout.discard.bounds.left + layout.discard.width;

    layout.muteIcon.bounds = {}
    layout.muteIcon.bounds.top = layout.board.bounds.top + layout.domino.height / 3;
    layout.muteIcon.bounds.bottom = layout.muteIcon.bounds.top + layout.muteIcon.height;
    layout.muteIcon.bounds.left = layout.discard.bounds.left + (layout.discard.width / 2) - (layout.muteIcon.width / 2);
    layout.muteIcon.bounds.right = layout.muteIcon.bounds.left + layout.muteIcon.width;

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
    this.ctx.beginPath();
    for (var row = 0; row < grid.length; ++row) {
      for (var slotI = 0; slotI < grid[row].length; ++slotI) {
        var x1 = layout.board.offset.x + (grid.length - row) * (layout.domino.width / 2) + (slotI * layout.domino.width);
        var x2 = x1 + layout.domino.width / 2;
        var x3 = x1 + layout.domino.width;
        var y1 = layout.board.offset.y + row * layout.domino.height / 2;
        var y2 = y1 + layout.domino.height / 2;
        var y3 = y1 + layout.domino.height;
        this.ctx.moveTo(x2, y1);
        this.ctx.lineTo(x3, y2);
        this.ctx.lineTo(x2, y3);
        this.ctx.lineTo(x1, y2);
        this.ctx.lineTo(x2, y1);

        if (row === 0) {
          this.domino_transparent_top_bg.drawRotated(this.ctx, x2, y2, 0.0)
        }
      }
    }
    this.ctx.stroke();

    this.ctx.font = "30px Arial";
    this.ctx.fillText(this.lastState.victory === true ? "Success!" : this.localPlayerId === this.lastState.turn ? "Your Turn" : "Waiting", layout.turnIndicator.offset.x, layout.turnIndicator.offset.y);

    if (layout.discard.bounds === undefined)
      this.relayoutBounds();

    this.ctx.fillRect(layout.discard.bounds.left, layout.discard.bounds.top , layout.discard.bounds.right - layout.discard.bounds.left, layout.discard.bounds.bottom - layout.discard.bounds.top);
    this.drawAudioIcons();
  }
 
  drawAudioIcons() {
    if (this.muted) {
      this.muted_icon.draw(this.ctx, layout.muteIcon.bounds.left, layout.muteIcon.bounds.top, layout.muteIcon.width, layout.muteIcon.height);
    } else {
      this.playing_icon.draw(this.ctx, layout.muteIcon.bounds.left, layout.muteIcon.bounds.top, layout.muteIcon.width, layout.muteIcon.height);
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
        var y = layout.board.offset.y + row * layout.domino.height / 2;
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
    if (!bgm.playing() && !this.muted)
      bgm.play();
    this.redraw();
  }

  onMouseMove(mousePos) {
  }

  canvasPress(event) {
    var x = event.currentPosition.x;
    var y = event.currentPosition.y;

    if (layout.board.bounds === undefined || layout.deck.bounds === undefined)
      this.relayoutBounds();
    
    if (this.dragged_domino && isInside(layout.board.bounds, x, y)) {
      this.tryClickBoard(x, y);
    } else if (isInside(layout.deck.bounds, x, y)) {
      this.tryClickDeck(x, y);
    } else if (isInside(layout.discard.bounds, x, y)) {
      this.tryClickDiscard();
    } else if (isInside(layout.muteIcon.bounds, x, y)) {
      this.toggleMute();
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

    var pixelHalfX = layout.domino.width / 2;
    var pixelHalfY = layout.domino.height / 2;

    var mouseX = this.mousePos.x - layout.board.offset.x - pixelHalfX;
    var mouseY = this.mousePos.y - layout.board.offset.y;
    
    var posY = Math.round(mouseY / pixelHalfY);
    var posX = Math.round(mouseX / pixelHalfX);

    if (posY % 2 == 1 && posX % 2 == 1) {
      posY = posY * pixelHalfY / layout.domino.height;
      posX = posX * pixelHalfX / layout.domino.width;
    } else {
      posY = Math.round(mouseY / layout.domino.height);
      posX = Math.round(mouseX / layout.domino.width);
    }
    posY = posY * 2 - 1;
    posX = posX - (this.lastState.board.length - posY) / 2

    if (posX < 0)
      return;
    
    var gridPos = {x: posX, y: posY};
    this.tryPlaceDomino(this.dragged_domino, gridPos)
  }
  
  toggleMute() {
    this.muted = !this.muted;
    bgm.mute(this.muted);
    this.redraw();
  }

  tryClickDiscard() {
    if (this.dragged_domino == 0) {
      return false;
    }
    
    this.gameContainer.state = this.lastState
    var success = this.gameContainer.discardPiece(this.localPlayerId, this.dragged_domino);
    console.log("Tried discarding domino ", this.dragged_domino, success);
    if (success) {
      fetch('/discard_piece', {
        method: 'POST',
        body: JSON.stringify({
          pieceId: this.dragged_domino,
        }),
        headers: {
          'Content-type': 'application/json; charset=UTF-8'
        }
      });
      this.redraw();
      this.dragged_domino = 0;
    }
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
    if (this.lastState.victory === true || this.lastState.victory === false)
      return;

    if (this.localPlayerId != this.lastState.turn) {
      return;
    }
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
