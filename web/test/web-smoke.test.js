import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('index references existing local runtime assets', async () => {
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /node_modules\/@mediapipe\/face_mesh\/face_mesh\.js/);
  assert.match(html, /type="module" src="src\/app\.js/);
  assert.match(html, /id="slider-slim"/);
  assert.match(html, /id="slider-length"/);
  await access(path.join(root, 'src/app.js'));
  await access(path.join(root, 'src/face-warp/face-warp-renderer.js'));
  await access(path.join(root, 'node_modules/@mediapipe/face_mesh/face_mesh.js'));
});

test('FaceMesh initialization is not chained through void methods', async () => {
  const source = await readFile(path.join(root, 'src/face-tracker.js'), 'utf8');
  assert.doesNotMatch(source, /\.setOptions\([^]*\)\.onResults/);
  assert.match(source, /await instance\.initialize\(\)/);
});
