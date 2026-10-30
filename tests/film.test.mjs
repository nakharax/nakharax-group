import test from 'node:test';
import assert from 'node:assert/strict';

// These tests catch incorrect scene boundaries/clamping and audible/rendered drift.
test('seeking selects the story at real second boundaries', async () => {
  const { frameState } = await import('../launch-film/spec.mjs');
  for (const [time, id] of [[0, 'beyond'], [2.999, 'beyond'], [3, 'impact'], [6, 'human'], [9, 'intelligence'], [12, 'xpfirm'], [15, 'protocol'], [18, 'workforce'], [21, 'brand'], [24, 'brand']]) {
    assert.equal(frameState(time).chapter.id, id, `seek ${time}`);
  }
});

test('seeking clamps malformed and out-of-range inputs to a real frame', async () => {
  const { frameState } = await import('../launch-film/spec.mjs');
  for (const value of [-100, NaN, Infinity, -Infinity, undefined, '12']) assert.equal(frameState(value).time, 0);
  assert.equal(frameState(100).time, 24);
  assert.equal(frameState(1.25).time, 1.25);
  assert.equal(frameState(24).ended, true);
});

test('seeking backward returns exactly the same render state', async () => {
  const { frameState } = await import('../launch-film/spec.mjs');
  const first = frameState(7.125);
  frameState(23.5);
  frameState(0);
  assert.deepEqual(frameState(7.125), first);
});

test('chapter navigation covers the whole film without gaps', async () => {
  const { CHAPTERS, DURATION } = await import('../launch-film/spec.mjs');
  assert.equal(CHAPTERS[0].start, 0);
  assert.equal(CHAPTERS.at(-1).end, DURATION);
  for (let i = 1; i < CHAPTERS.length; i++) assert.equal(CHAPTERS[i].start, CHAPTERS[i - 1].end);
  assert.ok(CHAPTERS.every(c => c.end > c.start && c.caption.en && c.caption.th));
});

test('soundtrack is reproducible and lasts exactly as long as the film', async () => {
  const { synthesizeAudio } = await import('../launch-film/audio.mjs');
  const a = synthesizeAudio(8000);
  const b = synthesizeAudio(8000);
  assert.ok(a instanceof Float32Array);
  assert.equal(a.length, 192000);
  assert.deepEqual(a, b);
});

test('soundtrack has finite samples, audible content and headroom', async () => {
  const { synthesizeAudio } = await import('../launch-film/audio.mjs');
  const samples = synthesizeAudio(8000);
  let peak = 0, energy = 0;
  for (const x of samples) { assert.ok(Number.isFinite(x)); peak = Math.max(peak, Math.abs(x)); energy += x * x; }
  assert.ok(peak <= 0.96, `peak ${peak}`);
  assert.ok(peak > 0.2);
  assert.ok(energy / samples.length > 0.001);
  assert.ok(samples.slice(-800).every(x => Math.abs(x) < 0.005), 'end card resolves to silence');
});

test('soundtrack rejects invalid rates instead of allocating arbitrary buffers', async () => {
  const { synthesizeAudio } = await import('../launch-film/audio.mjs');
  for (const rate of [0, -1, NaN, Infinity, 1e9, 8000.5, '48000']) assert.throws(() => synthesizeAudio(rate), RangeError);
});
