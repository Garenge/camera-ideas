import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateNoseTransform,
  normalizedPointToCanvas,
} from '../src/coordinate-mapper.js';

test('normalizedPointToCanvas maps normalized coordinates', () => {
  assert.deepEqual(normalizedPointToCanvas({ x: 0.25, y: 0.5 }, 640, 480), {
    x: 160,
    y: 240,
  });
});

test('calculateNoseTransform returns a centered sticker transform', () => {
  const landmarks = Array.from({ length: 295 }, () => ({ x: 0, y: 0 }));
  landmarks[4] = { x: 0.5, y: 0.5 };
  landmarks[6] = { x: 0.5, y: 0.4 };
  landmarks[64] = { x: 0.45, y: 0.5 };
  landmarks[294] = { x: 0.55, y: 0.5 };

  const transform = calculateNoseTransform(landmarks, 640, 480);
  assert.equal(transform.x, 320);
  assert.equal(transform.y, 240);
  assert.ok(transform.size > 100);
  assert.ok(Math.abs(transform.angle) < 0.0001);
});

test('calculateNoseTransform rejects incomplete landmarks', () => {
  assert.equal(calculateNoseTransform([], 640, 480), null);
});
