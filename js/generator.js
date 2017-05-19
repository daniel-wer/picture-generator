const DEFAULT_HEADLINE_FONT_SIZE = 90;
const HEADLINE_FONT = `font118413`;
const DEFAULT_SUBLINE_FONT_SIZE = 30;
const SUBLINE_FONT = `font122550`;
const COLORS = ["#009ee3", "#ffed00", "#e5007d"];
let SCALE;

const FONTS = {
  headline: {
    size: DEFAULT_HEADLINE_FONT_SIZE,
    font: HEADLINE_FONT,
  },
  subline: {
    size: DEFAULT_SUBLINE_FONT_SIZE,
    font: SUBLINE_FONT,
  },
};

// Polyfill trimLeft function for browsers that aren't supporting it yet
String.prototype.trimLeft = function() {
    return this.replace(/^\s+/,"");
}

class Picture {

  constructor() {
    this.x = 100;
    this.y = 100;
    this.hitBoxes = [];

    this.canvas = document.getElementById("main-canvas");
    this.mainText = document.getElementById("main-text");
    this.subText = document.getElementById("sub-text");
    this.sizeSlider = document.getElementById("size-slider");
    this.imageDrop = document.getElementById("image-drop");
    this.downloadButton = document.getElementById("download-button");
    this.ctx = this.canvas.getContext("2d");

    // canvas size in pixels divided by the size of the canvas html element
    SCALE = this.canvas.width / this.canvas.clientWidth;
    this.reset();
    this.attachEventListeners();
    this.restoreState();
  }

  attachEventListeners() {
    this.mainText.addEventListener("input", () => this.onTextChange());
    this.subText.addEventListener("input", () => this.onTextChange());
    this.sizeSlider.addEventListener("input", () => this.onSizeChange());
    document.addEventListener("DOMContentLoaded", () => this.onImageDrop());
    this.downloadButton.addEventListener("click", () => this.download());
    // Mouse events
    this.canvas.addEventListener("mousedown", (evt) => this.onMouseDown(evt));
    document.addEventListener("mousemove", (evt) => this.onMouseMove(evt));
    document.addEventListener("mouseup", (evt) => this.onMouseUp(evt));
    // Touch events
    this.canvas.addEventListener("touchstart", (evt) => this.onTouchStart(evt));
    // Set passive to false, so the scrolling can be prevented on mobile
    document.addEventListener("touchmove", (evt) => this.onTouchMove(evt), { passive: false });
    document.addEventListener("touchend", (evt) => this.onTouchEnd(evt));
    document.addEventListener("touchcancel", (evt) => this.onTouchEnd(evt));
  }

  reset() {
    if (!this.bgPicture) {
      this.ctx.fillStyle = "#009ee3";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    } else {
      drawImageProp(this.ctx, this.bgPicture, 0, 0, this.canvas.width, this.canvas.height);
    }
    // Reset hit boxes
    this.hitBoxes = []
  }

  render() {
    this.reset();
    drawTextBGWrapped(this.ctx, this.mainText.value, this.subText.value, this.x, this.y, this.hitBoxes);
    this.saveState();
  }

  download() {
    const url = this.canvas.toDataURL("image/png");
    window.open(url);
  }

  onTextChange() {
    this.render();
  }

  onSizeChange() {
    FONTS["headline"].size = parseInt(this.sizeSlider.value, 10);
    FONTS["subline"].size = Math.round(FONTS["headline"].size / 3);
    this.render();
  }

  onImageDrop() {
    // From the tiny-css documentation: https://picnicss.com/documentation#dropimage
    const _this = this;
    [].forEach.call(document.querySelectorAll(".dropimage"), function(img) {
      img.onchange = function(e) {
        var inputfile = this, reader = new FileReader();
        reader.onloadend = function(){
          const url = `url(${reader.result})`;
          inputfile.style["background-image"] = url;

          // Render the image onto the canvas after successful loading
          const image = new Image();
          image.src = reader.result;
          image.onload = () => {
            _this.bgPicture = image;
            _this.render();
          };
        }
        reader.readAsDataURL(e.target.files[0]);
      }
    });
  }

  onMouseDown(evt) {
    // Convert click position to canvas position
    const rect = this.canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    this.startDrag(x, y);
    this.prevEvt = evt;
  }

  onTouchStart(evt) {
    // Convert touch position to canvas position
    const rect = this.canvas.getBoundingClientRect();
    const x = evt.targetTouches[0].clientX - rect.left;
    const y = evt.targetTouches[0].clientY - rect.top;
    this.startDrag(x, y);
    this.prevTouchEvt = evt;
  }

  startDrag(x, y) {
    if (hitTest(x, y, this.hitBoxes)) {
      this.dragging = true;
    }
  }

  onMouseMove(evt) {
    if (this.dragging) {
      const [moveX, moveY] = getMovement(this.prevEvt, evt);
      this.prevEvt = evt;
      this.moveDrag(moveX, moveY);
    }
  }

  onTouchMove(evt) {
    if (this.dragging) {
      evt.preventDefault();
      const [moveX, moveY] = getTouchMovement(this.prevTouchEvt, evt);
      this.prevTouchEvt = evt;
      this.moveDrag(moveX * window.devicePixelRatio, moveY * window.devicePixelRatio);
    }
  }

  moveDrag(moveX, moveY) {
    this.x -= moveX;
    this.y -= moveY;
    this.render();
  }

  onMouseUp() {
    this.stopDrag();
  }

  onTouchEnd() {
    this.stopDrag();
  }

  stopDrag() {
    this.dragging = false;
  }

  saveState() {
    // Persist the current state in the url hash (base64 encoded)
    // Debounce this function to avoid performance hit
    this.saveState = debounce(() => {
      const state = {
        x: this.x,
        y: this.y,
        h: this.mainText.value,
        s: this.subText.value,
      }
      location.hash = `#${btoa(JSON.stringify(state))}`;
    }, 250);
    this.saveState();
  }

  restoreState() {
    // Restore base64 encoded state from the url hash, if present
    const hash = location.hash;
    if (hash.length) {
      const state = JSON.parse(atob(hash.slice(1)));
      this.x = state.x || this.x;
      this.y = state.y || this.y;
      this.mainText.value = state.h;
      this.subText.value = state.s;
      this.render();
    }
  }
}


// UTILITY FUNCTIONS

function hitTest(x, y, hitBoxes) {
  // Test whether the x,y coordinate is inside one of the hit boxes
  for (box of hitBoxes) {
    if (box[0] <= x && x <= box[2] && box[1] <= y && y <= box[3]) {
      return true;
    }
  }
  return false;
}

function getMovement(prevEvt, evt) {
  // Get the change in x and y between the previous and current mouse event
  return [prevEvt.screenX - evt.screenX, prevEvt.screenY - evt.screenY];
}

function getTouchMovement(prevEvt, evt) {
  // Get the change in x and y between the previous and current touch event
  return [
    prevEvt.targetTouches[0].screenX - evt.targetTouches[0].screenX,
    prevEvt.targetTouches[0].screenY - evt.targetTouches[0].screenY
  ];
}

function drawTextBG(ctx, txt, x, y, font, bgColor, textColor, hitBoxes) {
  // As spaces are used to "move" individual lines to the right, measure the text with and without spaces
  const width = ctx.measureText(txt).width;
  const trimmedWidth = ctx.measureText(txt.trimLeft()).width;
  const padding = width - trimmedWidth;

  // Draw background rectangle
  const margin = (getFontDistance(FONTS[font]) - FONTS[font].size) / 2;
  const rectX = x + padding;
  const rectY = y;
  const rectWidth = trimmedWidth + 2*margin;
  const rectHeight = getFontDistance(FONTS[font]);
  ctx.fillStyle = bgColor;
  ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
  // Push the rectangle into the hitBoxes array for drag/drop
  hitBoxes.push([rectX / SCALE, rectY / SCALE, (rectX + rectWidth) / SCALE, (rectY + rectHeight) / SCALE]);

  // Draw text
  ctx.fillStyle = textColor;
  ctx.fillText(txt, x + margin, y);
}

function drawTextBGWrapped(ctx, mainText, subText, x, y, hitBoxes) {
  ctx.textBaseline = "top";

  // Draw the boxes and text for the headline
  ctx.font = getCanvasFont(FONTS["headline"]);
  lines = mainText.split("\n");
  let curY = y;
  for (const line of lines) {
    if (line.length > 0) {
      drawTextBG(ctx, line, x, curY, "headline", COLORS[2], COLORS[1], hitBoxes);
    }
    // Increase curY to draw the next line
    curY += getFontDistance(FONTS["headline"]) - 1;
  }

  // Draw the box and text for the subline if it exists
  if (subText.length > 0) {
    ctx.font = getCanvasFont(FONTS["subline"]);
    drawTextBG(ctx, subText, x, curY, "subline", COLORS[1], COLORS[0], hitBoxes);
  }
}

/**
 * By Ken Fyrstenberg Nilsen
 *
 * drawImageProp(context, image [, x, y, width, height [,offsetX, offsetY]])
 *
 * If image and context are only arguments rectangle will equal canvas
 *
 * Scales an image to fit the canvas
*/
function drawImageProp(ctx, img, x, y, w, h, offsetX, offsetY) {

  if (arguments.length === 2) {
    x = y = 0;
    w = ctx.canvas.width;
    h = ctx.canvas.height;
  }

  // default offset is center
  offsetX = typeof offsetX === "number" ? offsetX : 0.5;
  offsetY = typeof offsetY === "number" ? offsetY : 0.5;

  // keep bounds [0.0, 1.0]
  if (offsetX < 0) offsetX = 0;
  if (offsetY < 0) offsetY = 0;
  if (offsetX > 1) offsetX = 1;
  if (offsetY > 1) offsetY = 1;

  var iw = img.width,
    ih = img.height,
    r = Math.min(w / iw, h / ih),
    nw = iw * r,   // new prop. width
    nh = ih * r,   // new prop. height
    cx, cy, cw, ch, ar = 1;

  // decide which gap to fill    
  if (nw < w) ar = w / nw;                             
  if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh;  // updated
  nw *= ar;
  nh *= ar;

  // calc source rectangle
  cw = iw / (nw / w);
  ch = ih / (nh / h);

  cx = (iw - cw) * offsetX;
  cy = (ih - ch) * offsetY;

  // make sure source rectangle is valid
  if (cx < 0) cx = 0;
  if (cy < 0) cy = 0;
  if (cw > iw) cw = iw;
  if (ch > ih) ch = ih;

  // fill image in dest. rectangle
  ctx.drawImage(img, cx, cy, cw, ch,  x, y, w, h);
}

// https://davidwalsh.name/javascript-debounce-function
function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

function getCanvasFont(font) {
  return `${font.size}px ${font.font}`;
}

function getFontDistance(font) {
  return font.size / 95 * 120;
}

const picture = new Picture();