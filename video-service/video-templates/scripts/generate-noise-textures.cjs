/**
 * Writes tileable 200×200 noise PNGs into public/textures/.
 * Run: npm run generate-textures (after npm install)
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SIZE = 200;

function fillNoise(png, light) {
	for (let y = 0; y < SIZE; y++) {
		for (let x = 0; x < SIZE; x++) {
			const idx = (SIZE * y + x) << 2;
			// Deterministic pseudo-random tile (repeats cleanly on modulo SIZE)
			const t = ((x * 73 + y * 131) % 256 + 256) % 256;
			const n = light ? 200 + (t % 56) : t % 220;
			png.data[idx] = n;
			png.data[idx + 1] = n;
			png.data[idx + 2] = n;
			png.data[idx + 3] = 255;
		}
	}
}

const outDir = path.join(__dirname, '..', 'public', 'textures');
fs.mkdirSync(outDir, { recursive: true });

for (const { name, light } of [
	{ name: 'noise-dark.png', light: false },
	{ name: 'noise-light.png', light: true },
]) {
	const png = new PNG({ width: SIZE, height: SIZE });
	fillNoise(png, light);
	fs.writeFileSync(path.join(outDir, name), PNG.sync.write(png));
	console.log('wrote', path.join('public/textures', name));
}
