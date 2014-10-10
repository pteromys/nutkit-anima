this.Nuts = {
	"KEYS": {
		"SHIFT": 16,
		"ESC": 27,
		"SPACE": 32,
		"LEFT": 37,
		"UP": 38,
		"RIGHT": 39,
		"DOWN": 40,
		"<": 188,
		">": 190,
		"QUESTION": 191,
		"TILDE": 192,
		"APOSTROPHE": 222,
	},
};

/* Add letters, numbers, and F keys */
(function (keys) {
	for (var i = 0; i < 10; i++) { keys[i] = 48 + i; }
	for (var i = 65; i < 91; i++) { keys[String.fromCharCode(i)] = i; }
	for (var i = 1; i < 13; i++) { keys["F" + i] = 111 + i; }
})(this.Nuts["KEYS"]);
