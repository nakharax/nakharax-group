// Encode the exact mono PCM used by the browser; no separate offline composition.
export function encodeWav(samples, sampleRate) {
  const dataLength = samples.length * 2;
  const wav = Buffer.alloc(44 + dataLength);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + dataLength, 4); wav.write('WAVE', 8);
  wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(dataLength, 40);
  samples.forEach((value, index) => {
    const x = Math.max(-1, Math.min(1, value));
    wav.writeInt16LE(Math.round(x * (x < 0 ? 32768 : 32767)), 44 + index * 2);
  });
  return wav;
}
