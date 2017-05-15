const HEADLINE_FONT_SIZE = 90;
const HEADLINE_FONT = `${HEADLINE_FONT_SIZE}px font118413`;
const SUBLINE_FONT_SIZE = 40;
const SUBLINE_FONT = `${SUBLINE_FONT_SIZE}px font122550`;
const HEADLINE_DISTANCE = HEADLINE_FONT_SIZE / 95 * 120;
const SUBLINE_DISTANCE = SUBLINE_FONT_SIZE / 95 * 120;
const COLORS = ["#009ee3", "#ffed00", "#e5007d"];

const FONTS = {
  headline: {
    size: HEADLINE_FONT_SIZE,
    font: HEADLINE_FONT,
    distance: HEADLINE_DISTANCE,
  },
  subline: {
    size: SUBLINE_FONT_SIZE,
    font: SUBLINE_FONT,
    distance: SUBLINE_DISTANCE,
  },
};

String.prototype.trimLeft = function() {
    return this.replace(/^\s+/,"");
}

class Picture {

  constructor() {
    this.x = 50;
    this.y = 50;
    this.canvas = document.getElementById("main-canvas");
    this.mainText = document.getElementById("main-text");
    this.subText = document.getElementById("sub-text");
    this.imageText = document.getElementById("image-text");
    this.imageDrop = document.getElementById("image-drop");
    this.downloadButton = document.getElementById("download-button");
    this.ctx = this.canvas.getContext("2d");
    this.reset();
    this.attachEventListeners();
    this.restoreState();
  }

  attachEventListeners() {
    this.mainText.addEventListener("input", () => this.onTextChange());
    this.subText.addEventListener("input", () => this.onTextChange());
    this.imageText.addEventListener("change", () => this.onImageChange());
    document.addEventListener("DOMContentLoaded", () => this.onImageDrop());
    this.canvas.addEventListener("mousedown", (evt) => this.onMouseDown(evt));
    document.addEventListener("mousemove", (evt) => this.onMouseMove(evt));
    document.addEventListener("mouseup", (evt) => this.onMouseUp(evt));
    this.downloadButton.addEventListener("click", () => this.download());
  }

  reset() {
    if (!this.bgPicture) {
      this.ctx.fillStyle = "#009ee3";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    } else {
      drawImageProp(this.ctx, this.bgPicture, 0, 0, this.canvas.width, this.canvas.height);
    }
  }

  render() {
    this.reset();
    drawTextBGWrapped(this.ctx, this.mainText.value, this.subText.value, this.x, this.y);
    this.saveState();
  }

  download() {
    const url = this.canvas.toDataURL("image/png");
    window.open(url);
  }

  onTextChange(evt) {
    this.render();
  }

  onImageChange(evt) {
    const image = new Image();
    image.onload = () => {
      this.bgPicture = image;
      this.render();
    };
    image.onerror = () => {
      this.bgPicture = null;
      this.reset();
    };
    image.src = this.imageText.value;
  }

  onImageDrop() {
    const _this = this;
    [].forEach.call(document.querySelectorAll('.dropimage'), function(img) {
      img.onchange = function(e) {
        var inputfile = this, reader = new FileReader();
        reader.onloadend = function(){
          const url = `url(${reader.result})`;
          inputfile.style['background-image'] = url;

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
    this.dragging = true;
    this.prevEvt = evt;
  }

  onMouseMove(evt) {
    if (this.dragging) {
      const [moveX, moveY] = getMovement(this.prevEvt, evt);
      this.x -= moveX;
      this.y -= moveY;
      this.prevEvt = evt;
      this.render();
    }
  }

  onMouseUp() {
    this.dragging = false;
  }

  saveState() {
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

function getMovement(prevEvt, evt) {
  return [prevEvt.screenX - evt.screenX, prevEvt.screenY - evt.screenY];
}

function drawTextBG(ctx, txt, x, y, font, bgColor, textColor) {
  /// color for background
  ctx.fillStyle = bgColor;
  const width = ctx.measureText(txt).width;
  const trimmedWidth = ctx.measureText(txt.trimLeft()).width;
  const padding = width - trimmedWidth;
  /// draw background rect assuming height of font
  const margin = (FONTS[font].distance - FONTS[font].size) / 2;
  ctx.fillRect(x + padding, y, trimmedWidth + 2*margin, FONTS[font].distance);
  /// text color
  ctx.fillStyle = textColor;
  /// draw text on top
  ctx.fillText(txt, x + margin, y);
}

function drawTextBGWrapped(ctx, mainText, subText, x, y) {
  ctx.textBaseline = 'top';

  // Draw the boxes and text for the headline
  ctx.font = FONTS["headline"].font;
  lines = mainText.split("\n");
  let curY = y;
  for (const line of lines) {
    drawTextBG(ctx, line, x, curY, "headline", COLORS[2], COLORS[1]);
    curY += FONTS["headline"].distance - 1;
  }

  // Draw the box and text for the subline if it exists
  if (subText.length > 0) {
    ctx.font = FONTS["subline"].font;
    drawTextBG(ctx, subText, x, curY, "subline", COLORS[1], COLORS[0]);
  }
}

/**
 * By Ken Fyrstenberg Nilsen
 *
 * drawImageProp(context, image [, x, y, width, height [,offsetX, offsetY]])
 *
 * If image and context are only arguments rectangle will equal canvas
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

const picture = new Picture();