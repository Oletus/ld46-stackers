'use strict';

import { arrayUtil } from './utiljs.js';

/**
 * A renderable object that game objects can inherit. May contain multiple renderers that have different render order,
 * like a foreground and background.
 * @constructor
 */
const RenderableObject = function() {
};

/**
 * Initialize the object.
 */
RenderableObject.prototype.initRenderableObject = function() {
    this.renderOrder = 0; // Renderers with greater render order get rendered first
};

/**
 * Override this function to generate multiple renderers from this object.
 * @return {Array.<Object>} Renderers aka. objects with render(ctx) functions and renderOrder.
 */
RenderableObject.prototype.renderObjects = function() {
    return [this];
};

/**
 * In case the object doesn't have multiple renderers, the render(ctx) function on the object itself is used to render
 * it. Override this function to implement rendering.
 * @param {CanvasRenderingContext2D} ctx Rendering context.
 */
RenderableObject.prototype.render = function(ctx) {
    return;
};

/**
 * Push the renderers of this object to renderList.
 * @param {Array.<Object>} renderList
 */
RenderableObject.prototype.pushRenderers = function(renderList) {
    renderList.push.apply(renderList, this.renderObjects());
};

/**
 * Sort renderable objects for rendering.
 * @protected
 */
RenderableObject._renderSort = function(a, b) {
    if (a.renderOrder > b.renderOrder) {
        return -1;
    }
    if (b.renderOrder > a.renderOrder) {
        return 1;
    }
    return 0;
};

/**
 * Render a list of renderable objects in the correct order.
 * @param {CanvasRenderingContext2D} ctx Rendering context.
 * @param {Array.<Object>} renderList List of renderers generated by RenderableObject.renderObjects()
 */
RenderableObject.renderList = function(ctx, renderList) {
    arrayUtil.stableSort(renderList, RenderableObject._renderSort);
    for (var i = 0; i < renderList.length; ++i) {
        renderList[i].render(ctx);
    }
};

export { RenderableObject }