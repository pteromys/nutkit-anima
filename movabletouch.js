(function () {

var global_object = this['Nuts'] || this;
global_object['MovableTouch'] = (function () {

var Movable = global_object.Movable;

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

Movable["2D"] = Movable2D;


var Movable3D = function () {
	// Touch-richer variant of Movable. Requires hammer.js>=2.0.2.
	Movable.apply(this, arguments);
	// Set speeds
	this.speed[0] = this.speed[1] = 0.001; // rotate 1 rad/s by default
	this.speed[4] = 0.002; // fly at 2 units per second
	// invert y-axis
	this.key_map[this.KEYS.DOWN].amount *= -1;
	this.key_map[this.KEYS.UP].amount *= -1;
	// flying
	this.key_map['press'] = this.key_map[this.KEYS.SPACE] = {which: 4, amount: 1};
	this.key_map[this.KEYS.Z] = {which: 4, amount: -1};
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


Movable["3D"] = Movable3D;

})();

})();
