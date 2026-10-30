import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

// Catches malformed WAV exports that sound different or cannot be decoded.
test('WAV encodes real PCM with a standard mono 48kHz header', async () => {
  const { encodeWav } = await import('../scripts/film-audio.mjs');
  const wav = encodeWav(new Float32Array([0, -1, 1, 0.5]), 48000);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  assert.equal(wav.readUInt32LE(24), 48000);
  assert.equal(wav.readUInt16LE(22), 1);
  assert.equal(wav.readUInt32LE(40), 8);
  assert.equal(wav.length, 52);
  assert.equal(wav.readInt16LE(46), -32768);
  assert.equal(wav.readInt16LE(48), 32767);
  assert.equal(wav.readInt16LE(50), 16384);
});

test('exporter rejects invalid arguments before trying browser or encoder', () => {
  const result = spawnSync(process.execPath, ['scripts/export-film.mjs', '--unknown'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Usage:/);
});

test('exporter help can be read without rendering anything', () => {
  const result = spawnSync(process.execPath, ['scripts/export-film.mjs', '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /--output/);
});
