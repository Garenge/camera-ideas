import test from 'node:test';
import assert from 'node:assert/strict';

import { buildFaceWarpParameters } from '../src/face-warp/face-shape.js';
import { LandmarkSmoother } from '../src/face-warp/landmark-smoother.js';
import { fragmentShaderSource } from '../src/face-warp/shaders.js';

function createFace() {
  const landmarks = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  landmarks[1] = { x: 0.5, y: 0.48, z: 0 };
  landmarks[10] = { x: 0.5, y: 0.2, z: 0 };
  landmarks[127] = { x: 0.31, y: 0.36, z: 0 };
  landmarks[152] = { x: 0.5, y: 0.82, z: 0 };
  landmarks[172] = { x: 0.34, y: 0.68, z: 0 };
  landmarks[234] = { x: 0.3, y: 0.55, z: 0 };
  landmarks[356] = { x: 0.69, y: 0.36, z: 0 };
  landmarks[397] = { x: 0.66, y: 0.68, z: 0 };
  landmarks[454] = { x: 0.7, y: 0.55, z: 0 };
  return landmarks;
}

test('face warp parameters map slider values to normalized strengths', () => {
  const parameters = buildFaceWarpParameters(createFace(), {
    enabled: true,
    length: -25,
    slim: 40,
  });

  assert.equal(parameters.enabled, 1);
  assert.equal(parameters.slim, 0.4);
  assert.equal(parameters.length, -0.5);
  assert.ok(parameters.faceWidth > 0);
  assert.ok(parameters.faceHeight > 0);
  assert.ok(parameters.topY < parameters.templeY);
  assert.ok(parameters.templeY < parameters.cheekY);
  assert.ok(parameters.cheekY < parameters.jawY);
  assert.ok(parameters.jawY < parameters.chin[1]);
  assert.ok(parameters.cheekHalfWidth > parameters.jawHalfWidth);
});

test('face warp disables itself without landmarks or toggle', () => {
  const missingFace = buildFaceWarpParameters([], { enabled: true });
  const toggledOff = buildFaceWarpParameters(createFace(), { enabled: false });

  assert.equal(missingFace.enabled, 0);
  assert.equal(missingFace.slim, 0);
  assert.equal(missingFace.length, 0);
  assert.equal(toggledOff.enabled, 0);
});

test('face warp reduces strength when the nose indicates a side pose', () => {
  const face = createFace();
  face[1] = { x: 0.64, y: 0.48, z: 0 };
  const parameters = buildFaceWarpParameters(face, {
    enabled: true,
    length: 50,
    slim: 100,
  });

  assert.ok(parameters.slim < 1);
  assert.ok(parameters.length < 1);
});

test('face warp combines effects from the original coordinate with an outer feather', () => {
  assert.match(fragmentShaderSource, /slimDisplacement\(sourceUv\)/);
  assert.match(fragmentShaderSource, /lengthDisplacement\(sourceUv\)/);
  assert.match(fragmentShaderSource, /horizontalInfluenceMask\(uv, 1\.02, 1\.34\)/);
  assert.doesNotMatch(fragmentShaderSource, /applySlimWarp\(sampleUv\)/);
});

test('landmark smoother moves toward new points instead of jumping', () => {
  const smoother = new LandmarkSmoother(0.25);
  smoother.update([{ x: 0, y: 0, z: 0 }]);
  const smoothed = smoother.update([{ x: 1, y: 1, z: 1 }]);

  assert.deepEqual(smoothed[0], { x: 0.25, y: 0.25, z: 0.25 });
});
