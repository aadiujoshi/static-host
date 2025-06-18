/**
 * Unit class represents a general-purpose interactive visual element in the animation system.
 * It handles rendering, interaction events, positioning, and state management.
 * Units can be positioned absolutely or relative to other units, and can respond to various mouse events.
 */
class Unit {
    /**
     * Creates a new Unit instance with the specified context and attributes.
     * @param {Context} context - The animation context this unit belongs to
     * @param {Object} attributes - Optional attributes to initialize the unit with
     */
    constructor(context, attributes = {}) {
        this.context = context;
        context.addUnit(this)
        
        // Basic identification
        /** @type {string} Unique identifier for this unit */
        this.name = context.randomName("Unit");
        
        // Visual properties
        /** @type {Image} image resource to be drawn, created from HTTPS URL */
        this.image = null;
        /** @type {'fill' | 'ar' | 'stretch'} Specifies how the image should fit within its container */
        this.imageFit = '';
        /** @type {Object} Color settings with primary color definition */
        this.colors = { primary: "blue", label: 'white' };
        /** @type {Object} Text content configuration */
        this.text = { label: undefined };
        /** @type {Object} Text alignment settings, e.g., 'left', 'center', or 'right' */
        this.textAlign = { label: 'center' };
        /** @type {Object} Text styling configuration */
        this.textStyles = { label: createTextStyle({}) };
        /** @type {number} Rendering order (higher numbers render on top) */
        this.zOrder = 0;
        
        // Event handlers
        /** @type {Function} Handler for click events */
        this.onClick = (event) => {};
        /** @type {Function} Handler for hover events */
        this.onHover = (event) => {};
        /** @type {Function} Handler for double click events */
        this.onDoubleClick = (event) => {};
        /** @type {Function} Handler for mouse leave events */
        this.onMouseLeave = (event) => {};
        /** @type {Function} Handler for mouse down events */
        this.onMouseDown = (event) => {};
        /** @type {Function} Handler for mouse up events */
        this.onMouseUp = (event) => {};
        /** @type {Function} Handler for drag events with start and current positions */
        this.onDrag = (event, start, current) => {};
        /** @type {Function} Handler for drop events with start and end positions */
        this.onDrop = (event, start, end) => {};
        /** @type {Function} Handler for long press events */
        this.onLongPress = (event) => {};
        
        // State and behavior
        /** @type {boolean} Whether the unit responds to interactions */
        this.enabled = true;
        /** @type {Object} Data change handlers mapped by data key */
        this.onDataChange = {};
        
        // Geometry and transformation
        /** @type {Object} Dimensions of the unit */
        this.size = {width: 100, height: 100};
        /** @type {Object} Position in canvas coordinates */
        this.pos = {x: 10, y: 10};
        /** @type {Object} Scale factors for x and y dimensions */
        this.scale = { x: 1, y: 1 };
        /** @type {Object} Rotation angles for x and y axes */
        this.rot = { x: 0, y: 0 }; 

        /**
         * Calculates the center position of the unit, used as the reference point for transformations
         * Can be overridden to change the transformation origin point
         * @returns {{x: number, y: number}} The center coordinates
         */
        this.getCenterPos = calculateCenterPosFactory(this);
        
        // Visual effects
        /** @type {number} Opacity value between 0 and 1 */
        this.opacity = 1;
        /** @type {boolean} Whether to render a shadow */
        this.enableShadow = false;
        /** @type {number} Shadow blur radius */
        this.shadowBlur = 5;
        /** @type {number} Shadow x offset */
        this.shadowOffsetX = 0;
        /** @type {number} Shadow y offset */
        this.shadowOffsetY = 4;
        /** @type {number} Corner radius for rounded rectangles */
        this.borderRadius = 16;
        
        // Core functionality
        /** @type {Function} Drawing function for rendering the unit */
        this.draw = drawDefaultFactory(this);
        /** @type {Function} Hit testing function for interaction detection */
        this.hitTest = hitTestDefaultFactory(this);
        /** @type {Function} Function to calculate actual bounds including transformations */
        this.getMeasuredBounds = measuredBoundsDefaultFactory(this);
        
        // Apply any custom attributes
        Object.assign(this, attributes);
        
        // Set up data change handlers
        if (this.onDataChange) {
            for (const key in this.onDataChange) {
                context.store.onChange(key, this.onDataChange[key]);
            }
        }
    }
    
    /**
     * Updates a single attribute value and syncs with the store if the attribute is being tracked.
     * @param {string} attr - The attribute name to update
     * @param {any} value - The new value for the attribute
     */
    update(attr, value) {
        this[attr] = value;
        this.updateInStore(attr);
        // if (this.context.store.added(this.getAttributeStoreName(attr))) {
        // }
    }
    
    /**
     * Updates the store value for an attribute. Handles nested attributes (e.g., "pos.x").
     * @param {string} attributeName - The full attribute name to update in store, taken from getAttributeStoreName(attribute)
     */
    updateInStore(attributeName) {
        let value;
        try {
            const parts = attributeName.split(".");
            value = parts.reduce((obj, key) => obj?.[key], this);
        } catch (e) {
            value = undefined;
        }
        this.context.store.set(this.getAttributeStoreName(attributeName), value);
    }
    
    /**
     * Generates the unique store key for an attribute of this unit.
     * @param {string} attributeName - The attribute name
     * @returns {string} The store key in format "unitName::attributeName"
     */
    getAttributeStoreName(attributeName){
        return this.name + "::" + attributeName;
    }
    
    /**
    * Positions this Unit dynamically relative to another Unit.
    *
    * NOTE: Do not use this function if this Unit's position will later be 
    * manually modified, as those changes will be overwritten.
    * 
    * Example:
    *   // place myUnit just below otherUnit, aligned by their horizontal centers
    *   myUnit.bindPositionRelativeTo(otherUnit, "bottom", { x: 0, y: 10 });
    *
    * @param {Unit} otherUnit
    * @param {string} direction  One of the direction keywords above
    * @param {{x?:number,y?:number}} [offset={x:0,y:0}]
    */
    bindPositionRelativeTo(otherUnit, direction, offset = { x: 0, y: 0 }) {
        const { x: padX = 0, y: padY = 0 } = offset;
        
        // Helper to align corners/edges based on direction code
        this._boundPositionListeners = this._boundPositionListeners || [];

        const updatePosition = () => {
            // const thisBox = this.getMeasuredBounds();
            // const otherBox = otherUnit.getMeasuredBounds();

            const thisBox = {x: this.pos.x, y: this.pos.y, width: this.size.width, height: this.size.height};
            const otherBox = {x: otherUnit.pos.x, y: otherUnit.pos.y, width: otherUnit.size.width, height: otherUnit.size.height};

            let newX = 0, newY = 0;
            
            switch (direction) {
                case "top-left":
                newX = otherBox.x - thisBox.width;
                newY = otherBox.y - thisBox.height;
                break;
                case "top-right":
                newX = otherBox.x + otherBox.width;
                newY = otherBox.y - thisBox.height;
                break;
                case "bottom-left":
                newX = otherBox.x - thisBox.width;
                newY = otherBox.y + otherBox.height;
                break;
                case "bottom-right":
                newX = otherBox.x + otherBox.width;
                newY = otherBox.y + otherBox.height;
                break;
                case "left":
                newX = otherBox.x - thisBox.width;
                newY = otherBox.y + (otherBox.height - thisBox.height) / 2;
                break;
                case "right":
                newX = otherBox.x + otherBox.width;
                newY = otherBox.y + (otherBox.height - thisBox.height) / 2;
                break;
                case "top":
                newX = otherBox.x + (otherBox.width - thisBox.width) / 2;
                newY = otherBox.y - thisBox.height;
                break;
                case "bottom":
                newX = otherBox.x + (otherBox.width - thisBox.width) / 2;
                newY = otherBox.y + otherBox.height;
                break;
                case "center":
                default:
                newX = otherBox.x + (otherBox.width - thisBox.width) / 2;
                newY = otherBox.y + (otherBox.height - thisBox.height) / 2;
                break;
            }
            
            // Apply offset
            newX += padX;
            newY += padY;
            
            this.update("pos", { x: newX, y: newY });
        };
        
        // helper to register & record
        const watch = (key) => {
            this.context.store.onChange(key, updatePosition);
            this._boundPositionListeners.push({ key, fn: updatePosition });
        };
        
        watch(otherUnit.getAttributeStoreName("pos"));
        watch(otherUnit.getAttributeStoreName("size"));
        watch(otherUnit.getAttributeStoreName("rot"));
        watch(otherUnit.getAttributeStoreName("scale"));
        watch(this.getAttributeStoreName("size"));
        watch(this.getAttributeStoreName("rot"));
        watch(this.getAttributeStoreName("scale"));
        // Initial placement
        updatePosition();
    };
    
    /**
     * Removes all position binding listeners, stopping automatic position updates.
     * Call this before deleting a unit or when manual positioning is needed.
     */
    unbindPositionRelativeTo() {
        if (!this._boundPositionListeners) return;
        for (let { key, fn } of this._boundPositionListeners) {
            this.context.store.removeOnChange(key, fn);
        }
        this._boundPositionListeners = [];
    }
    
    /**
     * Removes the unit from the context and cleans up any bindings.
     * Call this to properly dispose of a unit.
     */
    delete() {
        this.unbindPositionRelativeTo();
        /**@type {Context} */
        const context = this.context;
        context.removeUnit(this.name);
    }
}

class ScheduledTask {
    static INFINITE = -1; 

    /**
    * @param {string} name - Unique name to identify the task.
    * @param {number} delay - Delay between executions in ms.
    * @param {number} repeat - Number of times to repeat. -1 = infinite.
    * @param {Function} fn - The function to execute.
    * @param {string[]} [channels] - The list of channels this task belongs to.
    */
    constructor(name, delay, repeat, fn, channels = ['global']) {
        this.name = name;
        this.delay = delay;
        this.repeat = repeat;
        this.fn = fn;
        this.remaining = repeat;
        this.lastRun = performance.now();
        this.channels = channels;

        this.lastRun = performance.now();
        this.pausedAt = null;
        this.totalPausedTime = 0;
    }

    shouldRun(now) {
        return now - this.lastRun >= this.delay;
    }

    run(now) {
        this.fn();
        this.lastRun = now;
        if (this.repeat !== ScheduledTask.INFINITE) {
            this.remaining--;
        }
        return this.remaining !== 0;
    }

    notifyPaused(now) {
        this.pausedAt = now;
    }

    notifyResumed(now) {
        if (this.pausedAt !== null) {
            this.lastRun += now - this.pausedAt; // Shift forward by paused duration
            this.pausedAt = null;
        }
    }
}

class AnimationTask extends ScheduledTask {
    /**
    * @param {string} name - Unique task name.
    * @param {number} startVal - The start value of the animation.
    * @param {number} endVal - The end value of the animation.
    * @param {function(number): number} curve - A function mapping [0, 1] to curved [0, 1].
    * @param {number} duration - Duration in milliseconds.
    * @param {function(number): void} fn - A function that receives the interpolated value.
    * @param {string[]} [channels] - The list of channels this task belongs to.
    */
    constructor(name, startVal, endVal, curve, duration, fn, channels = ['global']) {
        const startTime = performance.now();
        super(name, 0, ScheduledTask.INFINITE, () => {}, channels);

        this.startVal = startVal;
        this.endVal = endVal;
        this.curve = curve || (t => t);
        this.duration = duration;
        this.fn = fn;

        this.animStart = startTime;
        this.pausedAt = null;
        this.totalPausedTime = 0;
    }

    run(now) {
        const elapsed = now - this.animStart - this.totalPausedTime;
        const rawProgress = Math.min(1, Math.max(0, elapsed / this.duration));
        const curvedProgress = this.curve(rawProgress);
        const value = this.startVal + (this.endVal - this.startVal) * curvedProgress;

        this.fn(value);
        this.lastRun = now;
        return elapsed < this.duration;
    }

    notifyPaused(now) {
        this.pausedAt = now;
    }

    notifyResumed(now) {
        if (this.pausedAt !== null) {
            this.totalPausedTime += now - this.pausedAt;
            this.pausedAt = null;
        }
    }
}

class TaskScheduler {
    constructor() {
        /** @type {ScheduledTask[]} */
        this.tasks = [];
        this.running = false;
        this.now = 0;

        /** @type {Set<string>} */
        this.pausedChannels = new Set();
    }

    add(name, delay, repeat, fn, channels = ['global']) {
        this.remove(name);
        this.tasks.push(new ScheduledTask(name, delay, repeat, fn, channels));
    }

    addAnim(name, startVal, endVal, curve, duration, fn, channels = ['global', 'animation']) {
        this.remove(name);
        this.tasks.push(new AnimationTask(name, startVal, endVal, curve, duration, fn, channels));
    }

    remove(name) {
        this.tasks = this.tasks.filter(task => task.name !== name);
    }

    start() {
        if (this.running) return;
        this.running = true;

        const loop = (now) => {
            if (!this.running) return;

            this.now = now;
            const currentTasks = [...this.tasks];

            for (let task of currentTasks) {
                // Skip if any of the task's channels are paused
                if (task.channels.some(ch => this.pausedChannels.has(ch))) {
                    continue;
                }

                if (task.shouldRun(now)) {
                    const stillActive = task.run(now);
                    if (!stillActive) {
                        this.remove(task.name);
                    }
                }
            }

            if (this.running) {
                requestAnimationFrame(loop);
            }
        };

        requestAnimationFrame(loop);
    }

    pause(channel = 'global') {
        this.pausedChannels.add(channel);
        for (let task of this.tasks) {
            if (task.channels.includes(channel) && typeof task.notifyPaused === 'function') {
                task.notifyPaused(this.now);
            }
        }
    }

    resume(channel = 'global') {
        this.pausedChannels.delete(channel);
        for (let task of this.tasks) {
            if (task.channels.includes(channel) && typeof task.notifyResumed === 'function') {
                task.notifyResumed(this.now);
            }
        }
        if (!this.running) this.start();
    }

    stop(channel = null) {
        if (channel === null) {
            this.running = false;
            this.pausedChannels.clear();
            this.tasks = [];
        } else {
            this.tasks = this.tasks.filter(t => !t.channels.includes(channel));
            this.pausedChannels.delete(channel);
        }
    }
}


/**
* @param {Context} context - AnimateOne context, contains everything
*/
function registerDrawLoop(context) {
    /**@type {TaskScheduler} */
    const scheduler = context.scheduler;
    scheduler.add(
        "render",
        0,
        ScheduledTask.INFINITE,
        () => {
            context.zSortUnits()
            let ctx = context.getCanvasContext();
            ctx.fillStyle = context.canvasBgColor;
            ctx.fillRect(0, 0, context.canvas.width, context.canvas.height);
            context._units.forEach((unit) => { 
                unit.draw(context);
            })
        },
        ['render']
    )
} 

function drawDefaultFactory(unit) {
    return (context) => {
        function drawRoundedRect(ctx, x, y, width, height, radius) {
            radius = Math.min(radius, width / 2, height / 2);
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
        }

        function wrapText(ctx, text, maxWidth) {
            const words = text.split(" ");
            const lines = [];
            let line = "";

            for (let i = 0; i < words.length; i++) {
                const testLine = line + (line ? " " : "") + words[i];
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && line) {
                    lines.push(line);
                    line = words[i];
                } else {
                    line = testLine;
                }
            }
            if (line) lines.push(line);
            return lines;
        }

        /** @type {CanvasRenderingContext2D} */
        const ctx = context.getCanvasContext();
        if (!ctx) return;

        const { opacity = 1, borderRadius = 0 } = unit;
        const { width, height } = unit.size;
        const { x: posX, y: posY } = unit.pos;
        const image = unit.image;
        const imageFit = unit.imageFit || 'fill';

        ctx.save();
        ctx.globalAlpha = opacity;

        // Center-based transform
        const { x: centerX, y: centerY } = unit.getCenterPos();
        ctx.translate(centerX, centerY);
        ctx.rotate(unit.rot?.x || 0);
        ctx.scale(unit.scale?.x || 1, unit.scale?.y || 1);

        // Shadow
        if (unit.enableShadow) {
            ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
            ctx.shadowBlur = unit.shadowBlur;
            ctx.shadowOffsetX = unit.shadowOffsetX;
            ctx.shadowOffsetY = unit.shadowOffsetY;
        }

        // Clipping region
        drawRoundedRect(ctx, -width / 2, -height / 2, width, height, borderRadius);
        ctx.clip();

        // Draw background
        const bgColor = unit.colors?.primary || "black";
        ctx.fillStyle = bgColor;
        ctx.fill();

        // Draw image if provided and loaded
        if (image && image.complete && image.naturalWidth > 0) {
            ctx.save();
            const areaX = -width / 2;
            const areaY = -height / 2;

            let drawW = width;
            let drawH = height;
            let drawX = areaX;
            let drawY = areaY;

            const ar = image.width / image.height;
            const containerAr = width / height;

            if (imageFit === 'ar') {
                if (ar > containerAr) {
                    drawW = width;
                    drawH = width / ar;
                    drawY = areaY + (height - drawH) / 2;
                } else {
                    drawH = height;
                    drawW = height * ar;
                    drawX = areaX + (width - drawW) / 2;
                }
            } else if (imageFit === 'fill') {
                const scale = Math.max(width / image.width, height / image.height);
                drawW = image.width * scale;
                drawH = image.height * scale;
                drawX = areaX + (width - drawW) / 2;
                drawY = areaY + (height - drawH) / 2;
            } else if (imageFit === 'stretch') {
                drawW = width;
                drawH = height;
                drawX = areaX;
                drawY = areaY;
            }

            ctx.drawImage(image, drawX, drawY, drawW, drawH);
            ctx.restore();
        } 

        // Draw all text fields
        const textMap = unit.text || {};
        const textStyles = unit.textStyles || {};
        const textColors = unit.colors || {};
        const textAligns = unit.textAlign || {};

        const padding = 10;
        const lineHeight = 18;
        let yOffset = -height / 2 + padding;

        for (const key in textMap) {
            const text = textMap[key];
            if (!text) continue;

            const color = textColors[key] || "red";
            const font = textStyles[key] || createTextStyle({});
            const align = textAligns[key] || "center";

            ctx.fillStyle = color;
            ctx.font = font;
            ctx.textAlign = align;
            ctx.textBaseline = "top";

            const lines = wrapText(ctx, text, width - 2 * padding);

            for (let i = 0; i < lines.length; i++) {
                let x = 0;
                if (align === "left") x = -width / 2 + padding;
                else if (align === "right") x = width / 2 - padding;
                else x = 0;

                ctx.fillText(lines[i], x, yOffset);
                yOffset += lineHeight;
            }
        }

        ctx.restore();

    };
}

function drawNoneFactory(unit) {
    return (context) => {};
}

function calculateCenterPosFactory(unit) {
    return () => {
        return {
            x: unit.pos.x + unit.size.width / 2,
            y: unit.pos.y + unit.size.height / 2
        };
    }
}

function createTextStyle({ size = 16, family = "sans-serif", weight, style }) {
    const sizeStr = typeof size === "number" ? `${size}px` : size;
    return [style, weight, sizeStr, family].filter(Boolean).join(" ");
}

function createFunctionPlotUnit(context, {
    fn,
    width,
    height,
    segments = 100,
    strokeColor = "red",
    strokeWidth = 2,
    origin = { x: 0, y: 0 },
    zOrder = 1,
}) {
    const unit = new Unit(context, {
        pos: origin,
        size: { width, height },
        enabled: false,
        zOrder,
        draw: (ctxWrapper) => {
            const ctx = ctxWrapper.getCanvasContext();
            if (!ctx) return;
            
            const center = unit.getCenterPos();
            const halfWidth = unit.size.width / 2;
            
            ctx.save();
            ctx.globalAlpha = unit.opacity ?? 1;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.beginPath();
            
            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const x = -halfWidth + t * unit.size.width;
                const y = fn(x);
                
                if (i === 0) {
                    ctx.moveTo(center.x + x, center.y - y);
                } else {
                    ctx.lineTo(center.x + x, center.y - y);
                }
            }
            
            ctx.stroke();
            ctx.restore();
        }
    });
    
    return unit;
}

function createSliderUnit(context, {
    sliderName,
    text,
    min,
    max,
    width,
    height = 12,
    x = 0,
    y = 0,
    textColor = "black",
    valueColor = "white",
    valueBgColor = "#ff9800"
}) {
    const range = max - min;
    const thumbSize = height * 1.5;
    const storeKey = `${sliderName}::value`;
    const initialValue = min;
    context.store.set(storeKey, initialValue);
    
    const containerUnit = new Unit(context, {
        pos: { x, y },
        size: { width: width + 60, height: height + 70 },
        colors: { primary: "transparent" },
        zOrder: 0,
        name: `slider-container-${sliderName}`
    });
    
    const trackUnit = new Unit(context, {
        size: { width, height },
        borderRadius: height / 2,
        colors: { primary: "#444" },
        zOrder: 1,
        onClick: (event) => {
            const rect = context.canvas.getBoundingClientRect();
            const clickX = event.clientX - rect.left - trackUnit.pos.x;
            const clampedX = Math.max(0, Math.min(clickX, width));
            const progress = clampedX / width;
            context.store.set(storeKey, min + progress * range);
        }
    });
    trackUnit.bindPositionRelativeTo(containerUnit);
    
    // === Thumb ===
    const thumbUnit = new Unit(context, {
        size: { width: thumbSize, height: thumbSize },
        borderRadius: thumbSize / 2,
        colors: { primary: valueBgColor },
        zOrder: 2,
        onDrag: ({ current }) => {
            const relX = current.x - trackUnit.pos.x;
            const clampedX = Math.max(0, Math.min(relX, width));
            const progress = clampedX / width;
            context.store.set(storeKey, min + progress * range);
        },
        onDrop: ({ current }) => {
            const relX = current.x - trackUnit.pos.x;
            const clampedX = Math.max(0, Math.min(relX, width));
            const progress = clampedX / width;
            context.store.set(storeKey, min + progress * range);
        },
        onDataChange: {
            [storeKey]: (val) => {
                const progress = (val - min) / range;
                
                // Align to track position
                const trackX = trackUnit.pos.x;
                const trackY = trackUnit.pos.y;
                
                const newX = trackX + progress * width - thumbSize / 2;
                const newY = trackY + (trackUnit.size.height - thumbSize) / 2;
                
                thumbUnit.pos = { x: newX, y: newY };
            }
        }
    });
    thumbUnit.bindPositionRelativeTo(trackUnit);
    
    // === Label ===
    const labelUnit = new Unit(context, {
        size: { width: 100, height: 20 },
        colors: { primary: "transparent", text: textColor },
        text: { label: text },
        zOrder: 2
    });
    labelUnit.bindPositionRelativeTo(containerUnit, "top-center", {y: -20} );   
    
    // === Value Bubble ===
    const valueUnit = createTextBoxUnit(context, {
        name: sliderName + "-text-box",
        color: valueBgColor,
        width: 60,
        height: height + 12 
    });
    valueUnit.unit.bindPositionRelativeTo(containerUnit, "right", {x: -15});
    context.store.onChange(storeKey, (newVal) => {
        valueUnit.unit.text.label = newVal.toFixed(2).toString();
    });
    context.store.onChange(valueUnit.storeKey, (newTypedVal) => {
        let parsed = parseFloat(newTypedVal);
        if (isNaN(parsed)) {
            if (0 >= min && 0 <= max) {
                parsed = 0;
            } else {
                parsed = min;
            }
        }
        context.store.set(storeKey, parsed)
    });
    //set to default average value
    context.store.set(storeKey, (min + max) / 2.0);
    
    return {
        containerUnit,
        trackUnit,
        thumbUnit,
        labelUnit,
        valueUnit,
        storeKey
    };
}

function createBarChart(context, {
    pos,
    keys,
    title = "",
    xAxisLabel = "",
    yAxisLabel = "",
    barColor = "#4caf50",
    labelColor = "black",
    titleColor = "black",
    labelTextStyle = createTextStyle({}),
    titleTextStyle = createTextStyle({weight: "bold"}),
    barWidth = 20,
    barHeight = 100,
    barSpacing = 10,
    labelRotation = 0, // degrees
    showValues = false
}) {
    const labels = Object.keys(keys);
    const baseY = pos.y;
    
    const chartWidth = labels.length * (barWidth + barSpacing);
    const axisLeftX = pos.x - 10;
    const axisBottomY = pos.y + barHeight;
    
    // === AXIS LINES ===
    const xAxis = new Unit(context, {
        pos: { x: axisLeftX, y: axisBottomY },
        size: { width: chartWidth, height: 2 },
        colors: { primary: "black" },
        zOrder: 1
    });
    
    const yAxis = new Unit(context, {
        pos: { x: axisLeftX, y: pos.y - 10 },
        size: { width: 2, height: barHeight + 10 },
        colors: { primary: "black" },
        zOrder: 1
    });
    
    // === BARS + LABELS ===
    labels.forEach((label, index) => {
        const key = keys[label];
        const x = pos.x + index * (barWidth + barSpacing);
        
        let observedMax = 1;
        
        const bar = new Unit(context, {
            pos: { x, y: baseY },
            size: { width: barWidth, height: 0 },
            colors: { primary: barColor },
            zOrder: 2,
            onDataChange: {
                [key]: (val) => {
                    if (val > observedMax) {
                        observedMax = val;
                    }
                    const h = (val / observedMax) * barHeight;
                    bar.size.height = h;
                    bar.pos.y = baseY + (barHeight - h);
                }
            }
        });
        
        new Unit(context, {
            pos: { x: x - 10, y: baseY + barHeight + 5 },
            size: { width: 50, height: 20 },
            colors: { primary: "transparent", text: labelColor },
            text: { label },
            zOrder: 2,
            rot: { x: -labelRotation * (Math.PI / 180) }
        });
        
        if (showValues) {
            const valueLabel = new Unit(context, {
                pos: { x: x - 5, y: baseY - 20 },
                size: { width: 50, height: 20 },
                colors: { primary: "transparent", text: labelColor },
                text: { label: "0.0" },
                zOrder: 3,
                onDataChange: {
                    [key]: (val) => {
                        valueLabel.text.label = val.toFixed(1);
                        const h = (val / observedMax) * barHeight;
                        valueLabel.pos.y = baseY + (barHeight - h) - 22;
                    }
                }
            });
        }
    });
    
    // === X AXIS LABEL ===
    if (xAxisLabel) {
        const xLabel = new Unit(context, {
            pos: { x: 0, y: 0 },
            size: { width: 100, height: 20 },
            colors: { primary: "transparent", text: titleColor },
            text: { label: xAxisLabel },
            textStyles: { label: labelTextStyle},
            zOrder: 2
        });
        xLabel.bindPositionRelativeTo("bottom", xAxis, {y: 50});
    }
    
    // === Y AXIS LABEL ===
    if (yAxisLabel) {
        const yLabel = new Unit(context, {
            pos: { x: 0, y: 0 },
            size: { width: 100, height: 20 },
            colors: { primary: "transparent", text: titleColor },
            text: { label: yAxisLabel },
            textStyles: { label: labelTextStyle},
            zOrder: 2,
            rot: { x: -Math.PI / 2 }
        });
        
        yLabel.bindPositionRelativeTo("left", yAxis, {x: 50, y: 50});
    }
    
    // === Chart Title ===
    if (title) {
        const titleUnit = new Unit(context, {
            pos: { x: 0, y: 0 },
            size: { width: 200, height: 25 },
            colors: { primary: "transparent", text: titleColor },
            text: { label: title },
            textStyles: {label: titleTextStyle},
            zOrder: 2
        });
        titleUnit.bindPositionRelativeTo("top", xAxis, {y: barHeight + 30});
    }
}

function createTextBoxUnit(context, {
    name = context.randomName("text-box"),
    width = 200,
    height = 40,
    color = "#A9A9A9",
    focusedColor = "gray",
    placeholder = "",
    zOrder = 5,
}) {
    const storeKey = name + "::text";
    
    context.store.set(storeKey, "");
    
    // === Main Textbox Unit ===
    const unit = new Unit(context, {
        name,
        size: { width, height },
        borderRadius: 8,
        colors: { primary: color, text: "black" },
        text: { label: placeholder },
        zOrder,
        isFocused: false, // <-- now a Unit attribute
        
        onClick: () => {
            const bounds = unit.getMeasuredBounds();
            unit.isFocused = true;
            
            context.focusInput(storeKey, (input) => {
                context.store.set(storeKey, input.value);
            }, bounds);
        },
        onMouseLeave: () => {
            unit.colors.primary = color;
        },
        onHover: () => {
            unit.colors.primary = focusedColor;
        },
        
        onDataChange: {
            [storeKey]: (val) => {
                unit.text.label = val || "";
            }
        }
    });
    
    return { unit, storeKey };
}

//============================================================================================
//                             ANIMATION UTILITY FUNCTIONS
//============================================================================================

/**
* @param {Unit} unit 
*/
function fadeOut(unit, duration) {
    /** @type {TaskScheduler} */
    const scheduler = unit.context.scheduler;
    scheduler.addAnim(
        unit.context.randomName("fade-out-anim"), 1, 0, linear, duration, (progress) => {
            unit.opacity = progress;
        }
    )
}

/**
* @param {Unit} unit 
*/
function fadeIn(unit, duration) {
    /** @type {TaskScheduler} */
    const scheduler = unit.context.scheduler;
    scheduler.addAnim(
        unit.context.randomName("fade-in-anim"), 0, 1, linear, duration, (progress) => {
            unit.opacity = progress;
        }
    )
}

/**
* @param {Unit} unit 
*/
function moveBy(unit, x, y, duration, curve) {
    /** @type {TaskScheduler} */
    const scheduler = unit.context.scheduler;
    scheduler.addAnim(
        unit.context.randomName("anim"), unit.pos.x, unit.pos.x + x, curve, duration, (progress) => {
            unit.pos.x = progress;
        }
    );
    scheduler.addAnim(
        unit.context.randomName("anim"), unit.pos.y, unit.pos.y + y, curve, duration, (progress) => {
            unit.pos.y = progress;
        }
    );
}

/**
* Animates movingUnit to a position relative to targetUnit based on direction and offset.
* @param {string} direction - e.g. "top", "bottom-right", "left"
* @param {Unit} movingUnit - the unit to move
* @param {Unit} targetUnit - the unit to move relative to
* @param {{x?: number, y?: number}} [offset={x:0, y:0}] - offset from the aligned edge
* @param {number} [duration=500] - animation time in ms
* @param {(t:number)=>number} [curve=linear] - interpolation curve
*/
function moveToUnit(direction, movingUnit, targetUnit, offset = {}, duration = 500, curve = linear) {
    const { x: padX = 0, y: padY = 0 } = offset;
    const dir = direction.toLowerCase();
    
    const thisBox = movingUnit.measuredSize?.() ?? {
        x: movingUnit.pos.x,
        y: movingUnit.pos.y,
        width: movingUnit.size.width,
        height: movingUnit.size.height
    };
    
    const targetBox = targetUnit.measuredSize?.() ?? {
        x: targetUnit.pos.x,
        y: targetUnit.pos.y,
        width: targetUnit.size.width,
        height: targetUnit.size.height
    };
    
    let finalX, finalY;
    
    if (dir.includes("left")) {
        finalX = targetBox.x - thisBox.width - padX;
    } else if (dir.includes("right")) {
        finalX = targetBox.x + targetBox.width + padX;
    } else {
        finalX = targetBox.x + (targetBox.width - thisBox.width) / 2;
    }
    
    if (dir.includes("top")) {
        finalY = targetBox.y - thisBox.height - padY;
    } else if (dir.includes("bottom")) {
        finalY = targetBox.y + targetBox.height + padY;
    } else {
        finalY = targetBox.y + (targetBox.height - thisBox.height) / 2;
    }
    
    const deltaX = finalX - movingUnit.pos.x;
    const deltaY = finalY - movingUnit.pos.y;
    
    moveBy(movingUnit, deltaX, deltaY, duration, curve);
}

function applyHoverColor(unit, hoverColor) {
    /**@type {Unit} */
    const u = unit;
    const mainPrimary = u.colors.primary;
    u.onHover = (event) => u.colors.primary = hoverColor; 
    u.onMouseLeave = (event) => u.colors.primary = mainPrimary;
}

//============================================================================================
//                             INTERPOLATION FUNCTIONS
//============================================================================================

//linear
const linear = (x) => x; 

//sinusoidal function
const easeInOut1 = (x) => ((Math.sin(Math.PI * x - (Math.PI / 2)) / 2) + 0.5); 

//faster, sigmoid function
const easeInOut2 = (x) => (1 / (1 + Math.pow(Math.E, (-10 * (x - 0.5))))); 

//============================================================================================
//                             HIT TESTING FUNCTIONS
//============================================================================================

function hitTestDefaultFactory(unit) {
    return (x, y) => {
        const { x: cx, y: cy } = unit.getCenterPos();
        
        // Step 1: move to local coords
        let lx = x - cx;
        let ly = y - cy;
        
        // Step 2: inverse rotation
        const sin = Math.sin(-unit.rot.x);
        const cos = Math.cos(-unit.rot.x);
        let rx = lx * cos - ly * sin;
        let ry = lx * sin + ly * cos;
        
        // Step 3: inverse scale
        rx /= unit.scale.x;
        ry /= unit.scale.y;
        
        // Step 4: shift into local bounding box space
        const finalX = rx + unit.size.width / 2;
        const finalY = ry + unit.size.height / 2;
        
        return (
            finalX >= 0 &&
            finalY >= 0 &&
            finalX <= unit.size.width &&
            finalY <= unit.size.height
        );
    };
}

function hitTestLineFactory(unit) {
    return (px, py) => {
        function distToSegmentSquared(px, py, x1, y1, x2, y2) {
            const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
            if (l2 === 0) return (px - x1) ** 2 + (py - y1) ** 2;
            let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
            t = Math.max(0, Math.min(1, t));
            const projX = x1 + t * (x2 - x1);
            const projY = y1 + t * (y2 - y1);
            return (px - projX) ** 2 + (py - projY) ** 2;
        }
        
        const tolerance = 6; // pixels
        const { startPos, endPos, fn, segments } = unit;
        
        const dx = endPos.x - startPos.x;
        const dy = endPos.y - startPos.y;
        
        let last = null;
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = startPos.x + dx * t;
            const y = startPos.y + dy * t + fn(t);
            
            if (last) {
                const distSq = distToSegmentSquared(px, py, last.x, last.y, x, y);
                if (distSq < tolerance * tolerance) return true;
            }
            last = { x, y };
        }
        
        return false;
    }
}

//============================================================================================
//                              REAL MEASURED SIZE FUNCTIONS 
//============================================================================================

/**
* Returns a function that computes the transformed bounding box
* (including position, rotation, and scale) of a unit.
* 
* @param {Unit} unit 
* @returns {() => { x: number, y: number, width: number, height: number }}
*/
function measuredBoundsDefaultFactory(unit) {
    return () => { 
        const { width, height } = unit.size;
        const scaleX = unit.scale?.x ?? 1;
        const scaleY = unit.scale?.y ?? 1;
        const angle = unit.rot?.x ?? 0;
        
        // Center of rotation
        const cx = unit.pos.x + width / 2;
        const cy = unit.pos.y + height / 2;
        
        // Define the 4 corners relative to center
        const halfW = (width * scaleX) / 2;
        const halfH = (height * scaleY) / 2;
        
        const corners = [
            { x: -halfW, y: -halfH }, // top-left
            { x: halfW, y: -halfH },  // top-right
            { x: halfW, y: halfH },   // bottom-right
            { x: -halfW, y: halfH }   // bottom-left
        ];
        
        // Rotate each corner and translate to absolute position
        const rotated = corners.map(({ x, y }) => {
            const rx = x * Math.cos(angle) - y * Math.sin(angle);
            const ry = x * Math.sin(angle) + y * Math.cos(angle);
            return { x: cx + rx, y: cy + ry };
        });
        
        // Find bounding box
        const xs = rotated.map(p => p.x);
        const ys = rotated.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    };
}

class GestureDetector {
    constructor(context) {
        this.context = context;

        this._isDragging = false;
        this._dragStart = null;
        this._dragUnit = null;
        this._longPressTimeout = null;
        this._hoveredUnit = null;
        this._lastMousePos = null; // ⬅️ Track mouse persistently

        this._registerEvents();
    }

    _registerEvents() {
        const canvas = this.context.canvas;

        canvas.addEventListener("click", (event) => {
            const { x, y } = this._getMousePos(event);
            for (let unit of [...this.context._units].reverse()) {
                if (unit.hitTest(x, y) && unit.enabled) {
                    unit.onClick?.(event);
                    break;
                }
            }
        });

        canvas.addEventListener("dblclick", (event) => {
            const { x, y } = this._getMousePos(event);
            for (let unit of [...this.context._units].reverse()) {
                if (unit.hitTest(x, y) && unit.enabled) {
                    unit.onDoubleClick?.(event);
                    break;
                }
            }
        });

        canvas.addEventListener("mousedown", (event) => {
            const { x, y } = this._getMousePos(event);

            for (let unit of [...this.context._units].reverse()) {
                if (unit.hitTest(x, y) && unit.enabled) {
                    unit.onMouseDown?.(event);
                    this._isDragging = true;
                    this._dragStart = { x, y };
                    this._dragUnit = unit;

                    this._longPressTimeout = setTimeout(() => {
                        unit.onLongPress?.(event);
                    }, 500);
                    break;
                }
            }
        });

        canvas.addEventListener("mouseup", (event) => {
            clearTimeout(this._longPressTimeout);
            this._longPressTimeout = null;

            const { x, y } = this._getMousePos(event);

            if (this._isDragging && this._dragUnit) {
                this._dragUnit.onMouseUp?.(event);
                this._dragUnit.onDrop?.({
                    event,
                    start: this._dragStart,
                    current: { x, y }
                });

                this._isDragging = false;
                this._dragStart = null;
                this._dragUnit = null;
            }
        });

        canvas.addEventListener("mousemove", (event) => {
            const { x, y } = this._getMousePos(event);
            this._lastMousePos = { x, y };

            if (this._isDragging && this._dragUnit) {
                this._dragUnit.onDrag?.({
                    event,
                    start: this._dragStart,
                    current: { x, y }
                });
            }
        });

        canvas.addEventListener("mouseleave", (event) => {
            clearTimeout(this._longPressTimeout);
            this._longPressTimeout = null;
            this._isDragging = false;
            this._dragUnit = null;

            if (this._hoveredUnit) {
                this._hoveredUnit.onMouseLeave?.(event);
                this._hoveredUnit = null;
            }

            this._lastMousePos = null;
        });

        // 🔁 Add hover tracking loop
        this.context.scheduler.add("hover-polling", 0, -1, () => {
            if (!this._lastMousePos) return;

            const { x, y } = this._lastMousePos;
            let newHoveredUnit = null;

            for (let unit of [...this.context._units].reverse()) {
                if (unit.enabled && unit.hitTest(x, y)) {
                    newHoveredUnit = unit;
                    if (unit !== this._hoveredUnit) {
                        unit.onHover?.({ x, y });
                    }
                    break;
                }
            }

            if (this._hoveredUnit && this._hoveredUnit !== newHoveredUnit) {
                this._hoveredUnit.onMouseLeave?.({ x, y });
            }

            this._hoveredUnit = newHoveredUnit;
        });
    }

    _getMousePos(event) {
        const rect = this.context.canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    }
}

//should typically only be used for non-ui related values, like anything done with calculations,
//or anything that should be displayed 
class DataStore {
    constructor() {
        this._data = {};
        this._listeners = {};
    }
    
    /**
    * Set a value and notify listeners.
    * @param {string} key 
    * @param {*} value 
    */
    set(key, value) {
        this._data[key] = value;
        (this._listeners[key] || []).forEach(fn => { 
            fn(value)
        });
    }
    
    /**
    * @param {string} key 
    * @deprecated
    */
    added(key) {
        return this._data.hasOwnProperty(key);
    }
    
    /**
    * Get a value by key.
    * @param {string} key 
    * @returns {*}
    */
    get(key) {
        if (this._data[key] != null) {
            return this._data[key];
        } else {
            throw new Error("Empty key in store: " + key);
        }
    }
    
    /**
    * Subscribe to changes on a key.
    * @param {string} key 
    * @param {function} fn 
    */
    onChange(key, fn) {
        this._listeners[key] = this._listeners[key] || [];
        this._listeners[key].push(fn);
    }
    
    removeOnChange(key, fn) {
        const lst = this._listeners[key];
        if (lst) this._listeners[key] = lst.filter(f => f !== fn);
    }
}

class Context {
    static SIZE_STORE_KEY = "CONTEXT::size";
    anchorNames = [
        ['top-left', 'top-center', 'top-right'],
        ['center-left', 'center', 'center-right'],
        ['bottom-left', 'bottom-center', 'bottom-right']
    ];
    
    constructor(canvas, container, scheduler, store) {
        if (!canvas) throw Error("Could not find canvas");
        
        this._units = [];
        this.zSorted = false;
        this.canvas = canvas;
        this.scheduler = scheduler;
        this.store = store;
        
        this.canvasBgColor = 'white';

        const resizeCanvasToMatch = () => {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            this.store.set(Context.SIZE_STORE_KEY, { width: canvas.width, height: canvas.height });
        };
        
        const observer = new ResizeObserver(resizeCanvasToMatch);
        observer.observe(container);
        
        this.store.set(Context.SIZE_STORE_KEY, {});
        this.store.onChange(Context.SIZE_STORE_KEY, this.setupAnchors.bind(this));
        
        const hiddenInput = document.createElement("input");
        hiddenInput.style.position = "absolute";
        hiddenInput.style.opacity = "0";
        hiddenInput.style.pointerEvents = "none";
        container.appendChild(hiddenInput);
        this._hiddenInput = hiddenInput;
        
        resizeCanvasToMatch();
    }
    
    focusInput(storeKey, onInput, bounds) {
        const input = this._hiddenInput;
        input.value = this.store.get(storeKey) ?? "";
        // input.style.opacity = "1";
        input.style.pointerEvents = "auto";
        input.focus();
        
        // Position input exactly over the target Unit
        const canvasRect = this.canvas.getBoundingClientRect();
        
        input.oninput = () => {
            onInput(input);
        };
        
        input.onblur = () => {
            input.style.opacity = "0";
            input.style.pointerEvents = "none";
        };
    }
    
    
    setupAnchors() {
        const size = this.store.get(Context.SIZE_STORE_KEY);
        
        const anchorUnits = this._units.filter(u => u.name.startsWith("CONTEXT-ANCHOR-UNIT"));
        
        if (anchorUnits.length === 0) {
            for (let r = 0; r < this.anchorNames.length; r++) {
                for (let c = 0; c < this.anchorNames[0].length; c++) {
                    const name = "CONTEXT-ANCHOR-UNIT-" + this.anchorNames[r][c];
                    let n = new Unit(this, {
                        name,
                        size: { width: 0, height: 0 },
                        pos: { x: 0, y: 0 },
                        zOrder: Number.MIN_SAFE_INTEGER,
                    });
                    // n.addToStore("pos");
                    n.draw = drawNoneFactory(n);
                }
            }
        }
        
        for (let r = 0; r < this.anchorNames.length; r++) {
            for (let c = 0; c < this.anchorNames[0].length; c++) {
                const name = "CONTEXT-ANCHOR-UNIT-" + this.anchorNames[r][c];
                const anchorUnit = this._units.find(u => u.name === name);
                if (!anchorUnit) throw Error("Screen anchor was removed / not found");
                
                const xFrac = c / 2; // 0, 0.5, 1
                const yFrac = r / 2; // 0, 0.5, 1
                
                const newX = size.width * xFrac;
                const newY = size.height * yFrac;
                
                anchorUnit.update("pos", { x: newX, y: newY });
            }
        }
    }
    
    /**
    * Returns a special invisible Unit located at one of the 9 anchor positions on the screen.
    * These anchors adjust with screen size and are intended to be used for relative layout.
    *
    * Available positions:
    * - "top-left", "top-center", "top-right"
    * - "center-left", "center", "center-right"
    * - "bottom-left", "bottom-center", "bottom-right"
    *
    * Example:
    *   const anchor = context.getAnchor("top-right");
    *   myUnit.bindPositionRelativeTo("bottom-left", anchor); // places myUnit just below top-right corner
    *
    * @param {string} posName - One of the 9 valid anchor names
    * @returns {Unit} anchor Unit with dynamic position
    */
    getAnchor(posName) {
        return this._units.find(unit => unit.name === "CONTEXT-ANCHOR-UNIT-" + posName);
    }
    
    getCanvasContext() {
        return this._setupHiDPICanvas(this.canvas);
    }
    
    addUnit(unit) {
        this.zSorted = false;
        this._units.push(unit);
    }
    
    removeUnit(name) {
        this._units = this._units.filter(unit => unit.name !== name);
    }
    
    zSortUnits() {
        if (this.zSorted) return;
        this._units.sort((a, b) => a.zOrder - b.zOrder);
    }
    
    _setupHiDPICanvas(canvas) {
        const ctx = canvas.getContext("2d");
        return ctx;
    }
    
    randomName(target) {
        // return target + "::" + (Math.floor(Math.random() * (9999999 - 1000000 + 1)) + 1000000);
        return target + "::" + crypto.randomUUID();
    }
}
