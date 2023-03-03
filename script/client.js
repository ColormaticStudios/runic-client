var canvas;
var canvas_center = new vector(0, 0);
var mouse_position = new vector(0, 0);

function load_image(path) {
  let image = new Image();
  image.src = path;
  return image;
}

function global_to_canvas(pos) {
	let tempx = -player.position.x + pos.x + canvas_center.x;
	let tempy = -player.position.y + pos.y + canvas_center.y;
	return new vector(tempx, tempy);
}

function round_rect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof stroke != "undefined" ) {
    stroke = true;
  }
  if (typeof radius === "undefined") {
    radius = 5;
  }
	ctx.fillStyle = fill;
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
  if (stroke) {
    ctx.stroke();
  }
  if (fill) {
    ctx.fill();
  }        
}

function resize_canvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas_center.x = canvas.width / 2;
  canvas_center.y = canvas.height / 2;
}

function clear() {
	const ctx = canvas.getContext("2d");
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function init() {
	canvas = document.getElementById("main_canvas");
	resize_canvas();
	document.onkeydown = key_down;
	document.onkeyup = key_up;
	game_init();
}

function tick() {
	resize_canvas(canvas);
	game_tick();
}

function game_ready() {
	setInterval(tick, 1000 / fps);
}
