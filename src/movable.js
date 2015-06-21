var KEYS = require('./keys.js');
var $ = require('jquery');
var Hammer = require('hammer');

var Movable = function () {
	this.velocity = [0, 0, 0, 0]; // velocity in user units (e.g. px/ms)
	// Configuration
	this.speed = [1, 1, 0.001, 0.001]; // speed scale in user units.
		// Defaults: Move 1000px/s, rotate 1 rad/s, zoom 2.718x/s
	this.key_map = {};
	this.keys_down = {};
	this.touch_map = {
		'pan_x': {which: 0, amount: -1},
		'pan_y': {which: 1, amount: -1},
		'rotate': {which: 2, amount: 1},
		'pinch': {which: 3, amount: 1},
		'wheel': {which: 3, amount: 1},
	};
	// Keymap
	this.key_map[KEYS.LEFT] = {which: 0, amount: -1};
	this.key_map[KEYS.RIGHT] = {which: 0, amount: 1};
	this.key_map[KEYS.UP] = {which: 1, amount: -1};
	this.key_map[KEYS.DOWN] = {which: 1, amount: 1};
	this.key_map[KEYS['<']] = {which: 2, amount: -1}; // roll ACW
	this.key_map[KEYS['>']] = {which: 2, amount: 1}; // roll CW
	this.key_map[189] = this.key_map[173] = this.key_map[109] =
		{which: 3, amount: -1}; // zoom out (gecko's had some weird keycodes)
	this.key_map[187] = this.key_map[61] = this.key_map[107] =
		{which: 3, amount: 1}; // zoom in

	// State
	this.decay_rate = this.decay_coast;
	this.is_hammer_busy = false;
	this.zoom_center = null;
	this.screen_center = [0, 0];
};

Movable.prototype = {
	run_multiplier: 4,
	decay_coast: 0.002, // stop in about 0.5s
	decay_brake: 0.01, // stop in about 0.1s
	overlay_selector: '.overlay',
	default_dt: 16,
	options: {
		pan: {threshold: 0, pointers: 0},
		rotate: {threshold: 0},
		pinch: {threshold: 0},
	},

	updateVelocity: function (dt) {
		dt = dt || this.default_dt;
		var vmax = 1;
		if (this.keys_down[KEYS.SHIFT]) { vmax *= this.run_multiplier; }
		var decay_rate = this.decay_rate;
		var accel_rate = this.decay_coast + this.decay_brake;
		function decay(t, cap) {
			var s = Math.abs(t);
			var ds;
			if (s > cap) {
				return t * Math.max(0, 1 - dt * accel_rate);
			} else {
				ds = dt * cap * decay_rate;
				if (t > ds) { return t - ds; }
				else if (t < -ds) { return t + ds; }
				else { return 0; }
			}
		};
		if (this.canAccelerate()) {
			for (var key in this.key_map) {
				if (!this.key_map.hasOwnProperty(key)) { continue; }
				var km = this.key_map[key];
				var i = km.which;
				this.velocity[i] = this.velocity[i] || 0;
				if (this.keys_down[key]) {
					this.velocity[i] +=
						accel_rate * vmax * (this.speed[i] || 1) * km.amount * dt;
				}
			}
		}
		for (var i = 0; i < this.velocity.length; i++) {
			this.velocity[i] = decay(this.velocity[i], vmax * (this.speed[i] || 1));
		}
	},
	update: function (dt) {
		dt = this.last_dt = dt || this.default_dt;
		this.updateVelocity(dt);
		if (this.isMoving()) {
			this.move(dt);
			this.motionCallback();
		}
	},
	isMoving: function () {
		if (this.is_hammer_busy) { return false; }
		for (var i = 0; i < this.velocity.length; i++) {
			if (this.velocity[i]) { return true; }
		}
		for (var key in this.key_map) {
			if (this.key_map.hasOwnProperty(key) && this.keys_down[key]) { return true; }
		}
		return false;
	},
	bind: function (element) {
		this.bindKeyboard(element);
		this.bindTouch(element);
	},
	bindKeyboard: function (element) {
		var t = this;
		var press = function (e) {
			var motion_changed = true;
			if (t.key_map[e.which]) {
				motion_changed = !t.keys_down[e.which];
				t.keys_down[e.which] = true;
				t.decay_rate = t.decay_brake;
				t.zoom_center = null;
				if (motion_changed) { t.motionCallback(); }
				// In theory since motionCallback calls requestAnimationFrame,
				// I could call this callback at the start...
				// ...but that'd be poking through the abstraction barrier.
			}
			t.keys_down[KEYS.SHIFT] = e.shiftKey;
			if (e.which == KEYS.ESC && t.canAccelerate()) {
				t.moveReset();
				t.decay_rate = t.decay_brake;
				t.zoom_center = null;
				t.motionCallback();
			}
		};
		var release = function (e) {
			if (t.keys_down[e.which]) { t.keys_down[e.which] = false; }
			t.keys_down[KEYS.SHIFT] = e.shiftKey;
		};
		var releaseAll = function (e) {
			if (e.type == 'mouseleave' && e.toElement) { return; }
			for (var k in t.keys_down) {
				if (k != 'mouse') {
					t.keys_down[k] = false;
				}
			}
		};
		element = $(element);
		element.on('keydown.mKeyboard', press);
		element.on('keyup.mKeyboard', release);
		element.on('blur.mKeyboard mouseleave.mKeyboard', releaseAll);
	},
	bindTouch: function (element) {
		var h = this.hammer;
		var t = this;
		var last = null;
		var last_pointers = null;
		$(element).on('wheel DOMMouseScroll mousewheel', function (e) {
			// Mousewheel zooming
			e = e.originalEvent;
			if (!(isNaN(e.pageX))) { t.zoom_center = [e.pageX, e.pageY]; }
			var delta_y = e.wheelDelta || (-e.detail);
			if (Math.abs(delta_y) > 20) { delta_y /= 120; }
			t.decay_rate = t.decay_coast;
			t.touchVelocity('wheel', delta_y/400, 0.5);
			t.motionCallback();
		});
		t.setScreenCenter(element);
		$(window).on('load scroll resize', function (e) {
			t.setScreenCenter(element);
		});
		$(element).on('mousedown selectstart', function (e) {
			e.preventDefault();
		});
		$(window).on('mouseup touchcancel touchend mouseleave touchleave',
			function (e) {
				if (!e.relatedTarget) { t.touchEnd(); }
			});
		if (Hammer && !this.hammer) {
			h = this.hammer = new Hammer.Manager($(element)[0]);
			h.add(new Hammer.Pan(this.options.pan));
			h.add(new Hammer.Rotate(this.options.rotate
				).recognizeWith(h.get('pan')));
			h.add(new Hammer.Pinch(this.options.pinch
				).recognizeWith([h.get('pan'), h.get('rotate')]));
			h.on('hammer.input', function (e) {
				var prev = h.session.prevInput || e;
				e.incTime = e.deltaTime - prev.deltaTime;
				e.incX = e.deltaX - prev.deltaX;
				e.incY = e.deltaY - prev.deltaY;
				e.incScale = (e.scale / prev.scale) || 1.0;
				// Clamp incremental rotations to [-90, 90];
				// interpret obtuse rotations as swapped fingers.
				var rot = (450 + e.rotation - prev.rotation) % 360 - 90;
				if (rot > 90) { rot -= 180; }
				e.incRotation = rot * Math.PI / 180;
				t.is_hammer_busy = !(e.isFinal);
				t.decay_rate = t.decay_coast;
				t.zoom_center = [e.center.x, e.center.y];
			});
			this.hammer.on('pan rotate pinch', function (e) {
				// Duplicate events are still causing some bugs here...
				if (last == e.timeStamp) { return; }
				last = e.timeStamp;
				if (e.incTime && (last_pointers == e.pointers.length)) { // Only move if this isn't a duplicate event
					// Incremental scaling is clamped for continuity.
					var scl = e.incScale;
					if (!(scl > 0.1 && scl < 10)) { scl = 1; }
					// Move
					t.movePinch(scl);
					t.moveRotate(e.incRotation);
					t.movePan(e.incX, e.incY);
					// Set coasting velocities averaging over the last 100ms
					var weight = Math.min(1, 0.01 * e.incTime);
					t.touchVelocity('pan_x', e.incX / e.incTime, weight);
					t.touchVelocity('pan_y', e.incY / e.incTime, weight);
					t.touchVelocity('rotate', e.incRotation / e.incTime, weight);
					t.touchVelocity('pinch', (scl - 1) / e.incTime, weight);
				}
				last_pointers = e.pointers.length;
				if (!e.isFinal) { t.is_hammer_busy = true; }
				else {
					last = null;
					last_pointers = null;
				}
				t.decay_rate = t.decay_coast;
				t.motionCallback();
			});
		}
	},
	touchVelocity: function (key, value, weight) {
		key = this.touch_map[key];
		if (!key) { return; }
		if (!isNaN(value)) {
			if (isNaN(weight)) { weight = 1; }
			this.velocity[key.which] *= 1 - weight;
			this.velocity[key.which] += weight * value * key.amount;
		}
		return this.velocity[key.which];
	},
	touchEnd: function () {
		this.is_hammer_busy = false;
	},
	setScreenCenter: function (element) {
		var p = $(element).offset();
		this.screen_center = [
			p.left - $(window).scrollLeft() + $(element).width()/2,
			p.top - $(window).scrollTop() + $(element).height()/2,
		];
	},

	// Default implementation
	canAccelerate: function () {
		// Don't accelerate if a dialog is active.
		return !($(this.overlay_selector).is(':target'));
	},
	motionCallback: function () {},
};

module.exports = Movable;
