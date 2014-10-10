(function () {

var global_object = this['Nuts'] || this;
global_object['MovableTouch'] = (function () {

var Movable = global_object.Movable;

var MovableTouch = function () {
	// Touch-richer variant of Movable. Requires hammer.js>=2.0.2.
	Movable.apply(this, arguments);
	// Default key and touch maps
	// rolling the view
	this.key_map[this.KEYS['<']] = {which: 2, amount: -1};
	this.key_map[this.KEYS['>']] = {which: 2, amount: 1};
	// zooming (gecko has had some weird keycodes)
	this.key_map[189] = this.key_map[173] = this.key_map[109] =
		{which: 3, amount: -1};
	this.key_map[187] = this.key_map[61] = this.key_map[107] =
		{which: 3, amount: 1};
	this.touch_map = {
		'pan_x': {which: 0, speed: -1},
		'pan_y': {which: 1, speed: -1},
		'rotate': {which: 2, speed: 1},
		'pinch': {which: 3, speed: 1},
	};
	this.speed[this.touch_map.rotate.which] = 0.001; // Rotate 1 rad/sec
	this.speed[this.touch_map.pinch.which] = 0.001; // Zoom about 4x/sec
	// Status variables
	this.is_hammer_busy = false;
	this.zoom_center = null;
	this.cos = 1;
	this.sin = 0;
	this.position[2] = this.position[3] = 0;
	this.velocity[2] = this.velocity[3] = 0;
};

MovableTouch.prototype = Object.create(Movable.prototype);
(function () {
	this.options = this.options || {};
	this.options.pan = {threshold: 0, pointers: 0};
	this.options.rotate = {threshold: 0};
	this.options.pinch = {threshold: 0};
	this.bindTouch = function (element) {
		var h = this.hammer;
		var t = this;
		if (!this.hammer) {
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
				e.incRotation = rot;
				if (e.isFinal) { t.is_hammer_busy = false; }
			});
		}
		this.hammer.on('pan rotate pinch', function (e) {
			if (e.incTime) { // Only move if this isn't a duplicate event
				// Incremental scaling is clamped for continuity.
				var scl = e.incScale;
				if (!(scl > 0.1 && scl < 10)) { scl = 1; }
				// Move
				t.movePan(e.incX, e.incY);
				t.moveRotate(e.incRotation);
				t.movePinch(scl);
				// Set coasting velocities averaging over the last 100ms
				var weight = Math.min(1, 0.01 * e.incTime);
				t.touchVelocity('pan_x', e.incX / e.incTime, weight);
				t.touchVelocity('pan_y', e.incY / e.incTime, weight);
				t.touchVelocity('rotate', e.incRotation / e.incTime, weight);
				t.touchVelocity('pinch', (scl - 1) / e.incTime, weight);
			}
			if (!e.isFinal) { t.is_hammer_busy = true; }
			t.decay_rate = t.decay_coast;
			t.motionCallback();
		});
		$(element).on('wheel DOMMouseScroll mousewheel', function (e) {
			// Mousewheel zooming
			e = e.originalEvent;
			if (!(isNaN(e.pageX))) { t.zoom_center = [e.pageX, e.pageY]; }
			var delta_y = e.wheelDelta || (-e.detail);
			if (Math.abs(delta_y) > 20) { delta_y /= 120; }
			t.decay_rate = t.decay_coast;
			t.touchVelocity('pinch', delta_y);
			t.motionCallback();
		});
		$(window).on('mouseup touchcancel touchend mouseleave touchleave',
			function (e) {
				if (!e.relatedTarget) { t.touchEnd(); }
			});
	};
	this.bindKeyboard = function (element) {
		var t = this;
		Movable.prototype.bindKeyboard.apply(this, arguments);
		$(element).on('keydown.mKeyboard', function (e) {
			t.zoom_center = null;
		});
	};
	this.isMoving = function () {
		if (this.is_hammer_busy) { return false; }
		return Movable.prototype.isMoving.apply(this, arguments);
	};
	this.movePan = function (x, y) {
		this.position[this.touch_map.pan_x.which] -= this.cos * x + this.sin * y;
		this.position[this.touch_map.pan_y.which] -= -this.sin * x + this.cos * y;
	};
	this.moveRotate = function (angle) {
		this.position[this.touch_map.rotate.which] += angle;
	};
	this.movePinch = function (scale) {
		this.position[this.touch_map.pinch.which] += (1 - scale);
	};
	this.moveReset = function () {
		Movable.prototype.moveReset.call(this);
		this.cos = 1;
		this.sin = 0;
	};
	this.touchEnd = function () {
		this.is_hammer_busy = false;
	};
	this.touchVelocity = function (key, value, weight) {
		key = this.touch_map[key];
		if (arguments.length > 1) {
			if (isNaN(weight)) { weight = 1; }
			this.velocity[key.which] *= 1 - weight;
			this.velocity[key.which] += weight * value * key.speed;
		}
		return this.velocity[key];
	};
}).call(MovableTouch.prototype);

return MovableTouch;

})();

})();
