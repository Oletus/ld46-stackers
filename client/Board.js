import { Sprite } from "./gameutils.js/src/gjs/sprite.js";

var ctx;
var board;


Sprite.gfxPath = 'static/';

var test_grid = [
    [{"primary":1,"left":2,"right":1},0], 
    [{"primary":1,"left":1,"right":3},{"primary":2,"left":3,"right":1},{"primary":1,"left":3,"right":3}], 
    [{"primary":1,"left":3,"right":2},{"primary":1,"left":2,"right":1},0,{"primary":3,"left":2,"right":1}], 
    [{"primary":1,"left":2,"right":1},0,{"primary":1,"left":2,"right":2},0,0], 
    [{"primary":1,"left":1,"right":2},0,0,0,0,0]
];

class Board {
    constructor() {
        this.domino_base = new Sprite('domino_base.png');
        this.domino_t_red = new Sprite('domino_top-red.png');
        this.domino_t_green = new Sprite('domino_top-green.png');
        this.domino_t_blue = new Sprite('domino_top-blue.png');
        this.domino_bl_red = new Sprite('domino_bottom_left-red.png');
        this.domino_bl_green = new Sprite('domino_bottom_left-green.png');
        this.domino_bl_blue = new Sprite('domino_bottom_left-blue.png');
        this.domino_br_red = new Sprite('domino_bottom_right-red.png');
        this.domino_br_green = new Sprite('domino_bottom_right-green.png');
        this.domino_br_blue = new Sprite('domino_bottom_right-blue.png');
    
        this.domino_tops = [this.domino_t_red, this.domino_t_green, this.domino_t_blue];
        this.domino_bottom_lefts = [this.domino_bl_red, this.domino_bl_green, this.domino_bl_blue];
        this.domino_bottom_rights = [this.domino_br_red, this.domino_br_green, this.domino_br_blue];
    }

    init() {
        console.log("Drawing board grid...");
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        let row_pos = 0;
        for (var row of test_grid) {
            row_pos += 1;
            let slot_pos = 0;
            for (var slot of row) {
                slot_pos += 1;
                let x = (test_grid.length-row_pos)*(this.domino_base.width/2) + (slot_pos*this.domino_base.width);
                let y = (row_pos+1)*this.domino_base.height;
                ctx.strokeRect(x, y, this.domino_base.width, this.domino_base.height);
            }
        }
    };

    draw() {
        console.log("Drawing board...");
        let row_pos = 0;
        for (var row of test_grid) {
            row_pos += 1;
            let slot_pos = 0;
            for (var slot of row) {
                slot_pos += 1;
                if (slot) {
                    var x = (test_grid.length-row_pos)*(this.domino_base.width/2) + (slot_pos*this.domino_base.width);
                    var y = (row_pos+1)*this.domino_base.height;
                    console.log(this.domino_base);
                    this.domino_base.draw(ctx, 100, 100);
                    this.domino_tops[slot.primary-1].draw(ctx, x, y);
                    this.domino_bottom_lefts[slot.left-1].draw(ctx, x, y);
                    this.domino_bottom_rights[slot.right-1].draw(ctx, x, y);
                }
            }
        }
    }
};

export { Board }
