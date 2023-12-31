var fps = 30;
var server_fps = 1;
var server;
var player;
var hud = new Object();
var keys_pressed = {
	"KeyW": false,
	"KeyA": false,
	"KeyS": false,
	"KeyD": false
}
var mouse_position = new vector(0, 0);
var rotation_offset = 0;
var player_speed = 1;
var update_server_tick;

var username;
//set name from URL
try {
	let URL = window.location.search;
	let params = new URLSearchParams(URL);
	username = params.get("name"); //this will get foo from <url>?name=foo
	if (username === null) {
		username = "Anonymous";
	}
}
catch(err) {
	console.error("Failed to get username from URL parameters", err);
}

var server_url;
try {
	let URL = window.location.search;
	params = new URLSearchParams(URL);
	server_url = "ws://" + params.get("server_url");
	if (server_url === "ws://null"/*Javascript why*/) {
		server_url = "ws://" + "localhost:8080";
	}
}
catch(err) {
	console.error("Failed to get server from URL parameters", err);
}

var game_data = {
	"character": {
		"variants": [
			load_image("img/character/character.svg")
		],
		"radius": 40
	},
	"world": {
		"biome": {
			"forest": {
				"ground": {
					"img": load_image("img/world/biome/forest/grass.svg")
				},
				"tree": {
					"img": load_image("img/world/biome/forest/tree.svg"),
					"radius": 50,
					"size": 180
				},
				"boulder": {
					"img": load_image("img/world/biome/forest/boulder.svg"),
					"radius": 60,
					"size": 130
				}
			}
		}
	}
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


function game_init() {
	init_player();
	open_socket();
	load_hud();
	game_ready();
}

function load_hud() {
	hud.health = document.getElementById("health_bar");
	hud.energy = document.getElementById("energy_bar");
	document.getElementById("player_username").innerText = username;
}

function update_hud() {
	hud.health.style.width = `${player.health}%`;
	hud.energy.style.width = `${player.stamina}%`;
	document.getElementById("player_username").innerText = username;
}

function key_down(e) {
	if (e.code in keys_pressed) {
		if (keys_pressed[e.code] === false) {
			keys_pressed[e.code] = true;
		}
	}
}
function key_up(e) {
	if (e.code in keys_pressed) {
		if (keys_pressed[e.code] === true) {
			keys_pressed[e.code] = false;
		}
	}
}

function init_player() {
	let player_vector = new vector(0, 0);
	player = new character(player_vector, 0, 0, username);
}

function message(type, data) { //incoming message
	if (type === "position_update") {
		if ("position" in data) {
			player.position.x = data.position.x;
			player.position.y = data.position.y;
		}
		if ("rotation" in data) {
			player.rotation = data.rotation;
		}
	}
	else if (type === "other_players") {
		let char_array = Array.from(characters);
		for (let other_player_num in data) {
			let other_player = data[other_player_num];
			let exists = false;
			for (let existing_character_num in char_array) {
				let existing_character = char_array[existing_character_num];
				if (existing_character != player) {
					//console.log("not the same");
					if (existing_character.id === other_player.id) {
						exists = true;
						existing_character.position.x = other_player.position.x;
						existing_character.position.y = other_player.position.y;
						existing_character.rotation = other_player.rotation;
						existing_character.username = other_player.username;
						existing_character.health = other_player.health;
						existing_character.stamina = other_player.stamina;
					}
				}
				else {
					//console.log("the same");
				}
			}
			if (!exists) {
				let new_character = new character(new vector(other_player.position.x, other_player.position.y), other_player.rotation, other_player.variant, other_player.username);
				new_character.id = other_player.id;
			}
		}
		//remove players
		for (let exiting_character_num in char_array) {
			let existing_character = char_array[exiting_character_num];
			let exists = false;
			for (let other_player_num in data) {
				let other_player = data[other_player_num];
				if (other_player.id === existing_character.id) {
					exists = true;
				}
			}
			if (!exists) {
				if (existing_character != player) {
					existing_character.destroy();
				}
			}
		}
	}
	else if (type === "world") {
		nodes = new Set();
		data.forEach(function(itr, idx) {
			let this_node = new node(new vector(itr.position.x, itr.position.y), itr.rotation, itr.radius, itr.size, itr.type);
		});
	}
	else if (type === "server_data") {
		if ("fps" in data) {
			server_fps = data.fps;
			clearInterval(update_server_tick);
			update_server_tick = setInterval(send_position_to_server, server_fps);
		}
	}
	else {
		console.log("Unknown packet");
	}
}

function do_collisions() {
	nodes.forEach(function(itr, idx) {
		collide(itr, player);
	});
}

function do_movement(delta) {
	if (keys_pressed["KeyW"]) {
		player.position.y -= player_speed * (delta/8);
	}
	if (keys_pressed["KeyS"]) {
		player.position.y += player_speed * (delta/8);
	}
	if (keys_pressed["KeyA"]) {
		player.position.x -= player_speed * (delta/8);
	}
	if (keys_pressed["KeyD"]) {
		player.position.x += player_speed * (delta/8);
	}

	//rotation
	player.rotation = canvas_center.rotation_to(mouse_position) + rotation_offset;

	if (mouse_down && !punching) {
		interact();
	}
}

document.onmousemove = function(e) {
	//console.log(e);
	//position.rot = point_towards([xenter, yenter], e) + rotate_offset;
	mouse_position.x = e.pageX;
	mouse_position.y = e.pageY;
}

function game_tick(delta) {
	//calculations
	do_movement(delta);
	do_collisions();
	move_camera();

	//rendering
	render_background();
	render_characters();
	render_nodes();
	render_usernames();
}

function render_characters() {
	let ctx = canvas.getContext("2d");
	characters.forEach(function(itr, idx) {
		ctx.save();
		let character_position = global_to_canvas(itr.position);
		ctx.translate(character_position.x, character_position.y);
		ctx.rotate(itr.rotation);
		let image = game_data.character.variants[itr.variant];
		ctx.drawImage(image, -50, -50, dwidth = 100, dheight = 100);
		ctx.restore();
	});
}

function render_usernames() {
	let ctx = canvas.getContext("2d");
	characters.forEach(function(itr, idx) {
		ctx.save();
		let character_position = global_to_canvas(itr.position);
		ctx.translate(character_position.x, character_position.y-80);
		//measure text
		ctx.font = "15px Arial";
		let size = ctx.measureText(itr.username);
		//draw name plate
		round_rect(ctx, -((size.width/2)+12), -20, size.width+24, 30, 4, "#555555aa", undefined);
		//draw name
		ctx.font = "15px Arial";
		ctx.textAlign = "center";
		ctx.fillStyle = "white";
		ctx.fillText(itr.username, 0, 0);
		ctx.restore();
	});
}

function render_background() {
	let ctx = canvas.getContext("2d");
	let image = game_data.world.biome.forest.ground.img;
	for (let i = -2500; i < 5000; i += image.width) {
		for (let j = -2500; j < 5000; j += image.height) {
			ctx.save();
			let where_this_ground = global_to_canvas(new vector(i, j));
			ctx.translate(where_this_ground.x, where_this_ground.y);
			ctx.drawImage(image, 0, 0);
			ctx.restore();
		}
	}
}

function render_nodes() {
	let ctx = canvas.getContext("2d");
	nodes.forEach(function(itr, idx) {
		ctx.save();
		let position = global_to_canvas(itr.position);
		let rotation = itr.rotation;
		let image = game_data.world.biome.forest[itr.type].img;

		ctx.translate(position.x, position.y);
		ctx.rotate(rotation);
		ctx.drawImage(image, -itr.size/2, -itr.size/2, dwidth=itr.size, dheight=itr.size);
		ctx.restore();
	});
}

function move_camera() {
	camera.x = player.position.x;
	camera.y = player.position.y;
}

function open_socket() {
	server = new WebSocket(server_url);
	server.onopen = function() {
	  server.send(JSON.stringify({
		  "type": "init",
		  "data": {
			  "username": player.username,
			  "variant": player.variant
		  }
	  }));
	  update_server_tick = setInterval(send_position_to_server, 1000/20);
	}
	server.onmessage = function(thing) {
	  	let thingp = JSON.parse(thing.data);
		message(thingp.type, thingp.data);
	}
}

function send_position_to_server() {
	let data = {
		"type": "movement",
		"data": {
			"position": player.position,
			"rotation": player.rotation
		}
	}
	server.send(JSON.stringify(data));
	if (server.readyState != 1) {
		clearInterval(update_server_tick);
		console.log("disconnected from server");
	}
}

//interaction
var interact_interval;
var punching = false;
var mouse_down = false;
document.body.onmousedown = function() {
	mouse_down = true;
}
document.body.onmouseup = function() {
	mouse_down = false;
}
function interact() {
	if (!punching) {
		punching = true;
		interact_interval = setInterval(interaction_animation, 1000/fps, Date.now());
		server.send(JSON.stringify({
			"type": "interact",
			"data": undefined
		}));
	}
}

function inter_anim_curve(x) {
	return -15*Math.pow(x-0.25, 2)+1;
}

function interaction_animation(start_time) {
	let now = Date.now();
	let x = (now - start_time)/1000;
	//console.log(inter_anim_curve(x));
	rotation_offset = inter_anim_curve(x)/2;
	if (x >= 0.5) {
		clearInterval(interact_interval);
		rotation_offset = 0;
		punching = false;
	}
}
