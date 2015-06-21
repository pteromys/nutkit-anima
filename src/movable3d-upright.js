var Movable3D = require('./movable3d.js');

Movable3DUpright = function () {
	Movable3D.apply(this, arguments);
	this.angle_xz = 0;
	this.angle_zy = 0;
}
Movable3DUpright.prototype = Object.create(Movable3D.prototype);
(function () {
	var TWOPI = 2 * Math.PI;
	var HALFPI = Math.PI / 2;
	this.moveRotateMix = function (from, to, angle) {
		if (from < 2 && to < 2) { return; }
		if (from == 0) { this.angle_xz += angle; }
		else if (to == 0) { this.angle_xz -= angle; }
		else if (to == 1) { this.angle_zy -= angle; }
		else { this.angle_zy += angle; }
	};
	this.setRotation = function () {
		this.angle_xz %= TWOPI;
		this.angle_zy = Math.max(-HALFPI, Math.min(this.angle_zy, HALFPI));
		var cxz = Math.cos(this.angle_xz);
		var sxz = Math.sin(this.angle_xz);
		var czy = Math.cos(this.angle_zy);
		var szy = Math.sin(this.angle_zy);
		this.rotation[0][0] = cxz;
		this.rotation[0][2] = sxz;
		this.rotation[1][0] = -sxz * szy;
		this.rotation[1][1] = czy;
		this.rotation[1][2] = cxz * szy;
		this.rotation[2][0] = -sxz * czy;
		this.rotation[2][1] = -szy;
		this.rotation[2][2] = cxz * czy;
	};
	var moveResetSuper = this.moveReset;
	this.moveReset = function () {
		moveResetSuper.call(this);
		this.angle_xz = this.angle_zy = 0;
	};
	var movePanSuper = this.movePan;
	this.movePan = function () {
		movePanSuper.apply(this, arguments);
		this.setRotation();
	};
	var moveRBVSuper = this.moveRotateByVelocity;
	this.moveRotateByVelocity = function (dt) {
		moveRBVSuper.call(this, dt);
		this.setRotation();
	};
}).call(Movable3DUpright.prototype);

module.exports = Movable3DUpright;
