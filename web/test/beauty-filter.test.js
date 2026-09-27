import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBeautyFilter } from '../src/effects/beauty-filter.js';

test('beauty filter is disabled without image processing', () => {
  assert.equal(buildBeautyFilter({ enabled: false, smooth: 100, whiten: 100 }), 'none');
});

test('beauty filter uses bounded lightweight canvas filters', () => {
  const filter = buildBeautyFilter({ enabled: true, smooth: 100, whiten: 100 });
  assert.match(filter, /brightness\(1\.200\)/);
  assert.match(filter, /saturate\(0\.880\)/);
  assert.match(filter, /blur\(1\.20px\)/);
});
