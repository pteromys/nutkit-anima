all: dist/nutkit.min.js

.PHONY: watchify

dist/nutkit.js: src/*.js package.json
	npm run build

dist/nutkit.min.js: dist/nutkit.js package.json
	npm run minify

watchify:
	npm run watchify

clean:
	rm dist/nutkit.*
