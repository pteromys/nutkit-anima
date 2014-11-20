var KEYS = require('./keys.js');
var Movable = require('./movable.js');

var Movable2D = function () {
	// Touch-richer variant of Movable. Requires hammer.js>=2.0.2.
	Movable.apply(this, arguments);
	// State variables
	this.speed[0] = this.speed[1] = 0.002; // move 2 units/sec by default
	this.position = [0, 0, 0, 0];
	this.cos = 1;
	this.sin = 0;
	this.scale = 1;
	this.units_per_px = 1;
};

Movable2D.prototype = Object.create(Movable.prototype);
(function () {
	this.move = function (dt) {
		var s = 1 / this.units_per_px;
		this.moveRotate(this.velocity[this.touch_map.rotate.which] * dt);
		this.moveZoomWithCenter(this.velocity[this.touch_map.pinch.which] * dt);
		this.movePan(this.velocity[this.touch_map.pan_x.which] * dt * s,
			this.velocity[this.touch_map.pan_y.which] * dt * s);
	};
	this.moveReset = function () {
		for (var i = 0; i < this.velocity.length; i++) {
			this.position[i] = this.velocity[i] = 0;
		}
		this.cos = 1;
		this.sin = 0;
		this.scale = 1;
	};
	this.movePan = function (x, y) {
		var ix = this.touch_map.pan_x.which;
		var iy = this.touch_map.pan_y.which;
		var s = this.units_per_px / this.scale;
		x *= s;
		y *= s;
		this.position[ix] = this.position[ix] || 0;
		this.position[iy] = this.position[iy] || 0;
		this.position[ix] += this.cos * x + this.sin * y;
		this.position[iy] += -this.sin * x + this.cos * y;
	};
	this.moveRotate = function (angle) {
		var i = this.touch_map.rotate.which;
		var cx = 0;
		var cy = 0;
		if (this.zoom_center) {
			cx = this.zoom_center[0] - this.screen_center[0];
			cy = this.zoom_center[1] - this.screen_center[1];
		}
		this.position[i] = (this.position[i] || 0) + angle;
		this.movePan(-cx, -cy);
		this.cos = Math.cos(this.position[i]);
		this.sin = Math.sin(this.position[i]);
		this.movePan(cx, cy);
	};
	this.moveZoom = function (amount) {
		if (!isFinite(this.scale)) { this.scale = 1; }
		this.scale *= Math.exp(amount || 0);
	};
	this.movePinch = function (scale) {
		this.moveZoomWithCenter(Math.log(scale));
	};
	this.moveZoomWithCenter = function (amount) {
		var cx = 0;
		var cy = 0;
		if (this.zoom_center && this.screen_center) {
			cx = this.zoom_center[0] - this.screen_center[0];
			cy = this.zoom_center[1] - this.screen_center[1];
		}
		this.movePan(-cx, -cy);
		this.moveZoom(amount);
		this.movePan(cx, cy);
	};
}).call(Movable2D.prototype);

module.exports = Movable2D;

