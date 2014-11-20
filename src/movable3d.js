var KEYS = require('./keys.js');
var Movable = require('./movable.js');

var Movable3D = function () {
	// Touch-richer variant of Movable. Requires hammer.js>=2.0.2.
	Movable.apply(this, arguments);
	// Set speeds
	this.speed[0] = this.speed[1] = 0.001; // rotate 1 rad/s by default
	this.speed[4] = 0.002; // fly at 2 units per second
	// invert y-axis
	this.key_map[KEYS.DOWN].amount *= -1;
	this.key_map[KEYS.UP].amount *= -1;
	// flying
	this.key_map['press'] = this.key_map[KEYS.SPACE] = {which: 4, amount: 1};
	this.key_map[KEYS.Z] = {which: 4, amount: -1};
	// state variables
	this.origin = null;
	this.displacement = null;
	this.rotation = null;
	this.scale = 1;
	// hmmmmmmmmmmmmmm
	this.units_per_px = 1;
	this.fly_center = [0, 0];
};

Movable3D.prototype = Object.create(Movable.prototype);
(function () {
	this.move = function (dt) {
		// Rotation
		if (this.keys_down['press']) {
			this.velocity[0] = this.speed[0] * (this.fly_center[0] - this.screen_center[0]) * this.units_per_px;
			this.velocity[1] = this.speed[1] * (this.fly_center[1] - this.screen_center[1]) * this.units_per_px;
		}
		this.moveRotateMix(0, 2, this.velocity[this.touch_map.pan_x.which] * dt);
		this.moveRotateMix(1, 2, -this.velocity[this.touch_map.pan_y.which] * dt);
		this.moveRotateMix(0, 1, this.velocity[this.touch_map.rotate.which] * dt);
		// Translation
		this.moveFly(dt * this.velocity[this.key_map.press.which]);
		// Zooming
		this.moveZoom(dt * this.velocity[this.touch_map.pinch.which]);
	};
	this.moveReset = function () {
		this.origin = [0, 0, 0];
		this.displacement = [0, 0, 0];
		this.rotation = [
			[1,0,0,0],
			[0,1,0,0],
			[0,0,1,0],
			[0,0,0,1]
		];
	};
	this.moveRotateMix = function (from, to, angle) {
		// this.moveRoll = this.moveRotateMix.bind(this, 0, 1);
		// this.moveYaw = this.moveRotateMix.bind(this, 0, 2);
		// this.movePitch = this.moveRotateMix.bind(this, 1, 2);
		angle = angle || 0;
		var c = Math.cos(angle);
		var s = Math.sin(angle);
		var t = 0;
		var x = this.rotation[from];
		var y = this.rotation[to];
		for (var i = 0; i < 4; i++) {
			t = x[i] * c + y[i] * s;
			y[i] = -x[i] * s + y[i] * c;
			x[i] = t;
		}
	};
	this.movePan = function (x, y) {
		if (!this.keys_down['press']) {
			this.moveRotateMix(2, 0, x * this.units_per_px);
			this.moveRotateMix(1, 2, y * this.units_per_px);
		}
	};
	this.moveRotate = function (angle) {
		this.moveRotateMix(0, 1, angle);
	};
	this.moveZoom = function (amount) {
		if (!isFinite(this.scale)) { this.scale = 1; }
		this.scale *= Math.exp(amount || 0);
	};
	this.movePinch = function (scale) {
		this.moveZoom(Math.log(scale));
	};
	this.moveFly = function (distance) {
		if (!distance) { return; }
		var d = distance / this.scale;
		for (var i = 0; i < 3; i++) {
			this.origin[i] += this.rotation[2][i] * d;
		}
	};
	var isMovingSuper = this.isMoving;
	this.isMoving = function () {
		if (this.keys_down['press']) { return true; }
		return isMovingSuper.call(this);
	};
	var touchEndSuper = this.touchEnd;
	this.touchEnd = function () {
		touchEndSuper.call(this);
		this.keys_down['press'] = false;
	};
	var bindTouchSuper = this.bindTouch;
	this.bindTouch = function (element) {
		bindTouchSuper.call(this, element);
		var h = this.hammer;
		h.add(new Hammer.Press({threshold: 10}).recognizeWith(h.get('pan')));
		h.on('press', (function (e) {
			this.keys_down['press'] = true;
			this.decay_rate = this.decay_coast;
			this.motionCallback();
		}).bind(this));
		h.on('press pan', (function (e) {
			this.fly_center[0] = e.center.x;
			this.fly_center[1] = e.center.y;
		}).bind(this));
	};
}).call(Movable3D.prototype);

module.exports = Movable3D;
