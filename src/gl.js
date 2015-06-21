var $ = require('jquery');

var GLWrapper = function (canvas) {
	// Declare some properties
	this.gl = null;
	this.context_serial = 0;
	this.shader_sources = {};
	this.shaders = {};
	this.projection_matrix = new Float32Array(16);
	// Set bound methods
	this.handleContextLost = this.handleContextLost.bind(this);
	this.handleContextRestored = this.handleContextRestored.bind(this);
	this.resize = this.resize.bind(this);
	// Bind the canvas
	if (canvas) { this.bindCanvas(canvas); }
};

GLWrapper.prototype = {
	// Overrideable methods
	setupCallback: function () {},
	resizeCallback: function (w, h) {},

	// Initialization
	bindCanvas: function (canvas) {
		this.canvas = canvas;
		// Get context
		if (!canvas.getContext) { return null; }
		this.gl = canvas.getContext('webgl') ||
			canvas.getContext('experimental-webgl');
		if (!this.gl) {
			throw 'WebGL unavailable.';
			return false;
		}
		this.context_serial++;
		// Handle context loss
		this.canvas.addEventListener('webglcontextlost',
			this.handleContextLost, false);
		this.canvas.addEventListener('webglcontextrestored',
			this.handleContextRestored, false);
		// Set up shaders
		for (var name in this.shader_sources) {
			this.linkProgram(name);
		}
		this.setupCallback();
	},

	////////////////////
	// Event Handlers //
	////////////////////

	// Screen resizing
	resize: function (w, h) {
		this.canvas.width = w;
		this.canvas.height = h;
		if (this.gl) { this.gl.viewport(0, 0, w, h); }
		this.resizeCallback(w, h);
	},
	// Context events
	handleContextLost: function (e) {
		e.preventDefault();
		this.canvas.removeEventListener('webglcontextlost',
			this.handleContextLost, false);
	},
	handleContextRestored: function (e) {
		this.bindCanvas(this.canvas);
	},

	///////////////
	// Internals //
	///////////////

    setProjectionMatrix: function (w, h, n, f) {
		// Generate a projection matrix toward 0 onto a rectangle at z = 1.
		// Matrix entries by column left-to-right, down each column.
		var m = this.projection_matrix;
		m[0] = 1/w;
		m[5] = 1/h;
		m[10] = (n+f)/(n-f); // new z
		m[11] = -1;
		m[14] = 2*n*f/(n-f); // old z becomes last coordinate for division
		m[1] = m[2] = m[3] = m[4] = m[6] = m[7] = m[8] = m[9] = m[12] = m[13] = m[15] = 0;
	},

	// Shader loading
	addProgram: function (name, vert, frag) {
		// Add a shader program.
		//     name = symbolic name
		//     vert = code for the vertex shader
		//     frag = code for the fragment shader
		this.shader_sources[name] = [vert, frag];
		if (this.gl) { this.linkProgram(name); }
	},
	addProgramByURLs: function (name, vert, frag, callback) {
		// Add a shader program with URLs instead of code.
		// Requires jQuery.
		var code = ['', ''];
		var loaded = 0;
		function tryCompiling(index, data) {
			loaded |= (1 << index);
			code[index] = data;
			if ((loaded & 3) == 3) {
				this.addProgram(name, code[0], code[1]);
				callback();
			}
		}
		$.get(vert, tryCompiling.bind(this, 0));
		$.get(frag, tryCompiling.bind(this, 1));
	},
	linkProgram: function (name) {
		if (!this.shader_sources[name]) { return null; }
		var gl = this.gl;
		var TYPES = [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER];
		function compile(source, i) {
			var ans = gl.createShader(TYPES[i]);
			gl.shaderSource(ans, source);
			gl.compileShader(ans);
			if (!gl.getShaderParameter(ans, gl.COMPILE_STATUS) &&
				!gl.isContextLost()) {
				throw 'Shader compile error: ' + gl.getShaderInfoLog(ans);
			}
			return ans;
		}
		var objs = this.shader_sources[name].map(compile);
		var prog = gl.createProgram();
		gl.attachShader(prog, objs[0]);
		gl.attachShader(prog, objs[1]);
		gl.linkProgram(prog);
		if (!gl.getProgramParameter(prog, gl.LINK_STATUS) &&
			!gl.isContextLost()) {
			throw 'Shader link error: ' + gl.getProgramInfoLog(prog);
		}
		this.shaders[name] = prog;
		return prog;
	},
};

module.exports = GLWrapper;
