import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { startServer } from './static-server.mjs';
import { synthesizeAudio } from '../launch-film/audio.mjs';
import { DURATION, BPM } from '../launch-film/spec.mjs';
import { encodeWav } from './film-audio.mjs';

const usage = 'Usage: node scripts/export-film.mjs --output <directory>\nRequires Node, @playwright/test with Chromium, and FFmpeg. Uses local assets only.';
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--help') { console.log(usage); process.exit(0); }
if (args.length !== 2 || args[0] !== '--output' || !args[1].trim()) { console.error(usage); process.exit(1); }
const output = resolve(args[1]);
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const FPS = 60, FRAMES = DURATION * FPS;

async function encode(options) {
  await new Promise((resolve, reject) => {
    const process = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-threads', '2', '-filter_threads', '1', ...options], { stdio: ['ignore', 'ignore', 'pipe'] });
    let errorText = '';
    process.stderr.on('data', data => { errorText = (errorText + data).slice(-6000); });
    process.on('error', reject);
    process.on('close', code => code === 0 ? resolve() : reject(new Error(`FFmpeg exited ${code}: ${errorText}`)));
  });
}

let browser, server;
try {
  if (spawnSync(ffmpeg, ['-version'], { stdio: 'ignore' }).status !== 0) throw new Error('FFmpeg executable not available; install it or set FFMPEG to its executable path.');
  let chromium;
  try { ({ chromium } = createRequire(import.meta.url)('@playwright/test')); }
  catch { throw new Error('Playwright is not available. Install the pinned @playwright/test version from launch-film/README.md in your isolated build environment.'); }
  await mkdir(join(output, 'frames'), { recursive: true });
  await writeFile(join(output, 'original-score.wav'), encodeWav(synthesizeAudio(48000), 48000));
  server = await startServer();
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1300 } });
  await page.route('**/*', route => route.request().url().startsWith(server.url) ? route.continue() : route.abort());
  await page.goto(server.url + '/launch-film/');
  await page.waitForFunction(() => window.launchFilmPlayer?.getState().ready);
  await page.evaluate(async () => {
    const { drawFrame } = await import('/launch-film/renderer.mjs');
    const logo = new Image(); logo.src = '/assets/nakharax-icon.png'; await logo.decode();
    const output = document.createElement('canvas'), sample = document.createElement('canvas');
    output.width = sample.width = 1920; output.height = sample.height = 1080;
    const composite = output.getContext('2d', { alpha: false }), ctx = sample.getContext('2d', { alpha: false });
    window.renderFilmFrame = (t, count = 3) => {
      const shutter = 1 / 120;
      const nextCut = (Math.floor(t / 0.75) + 1) * 0.75;
      const from = t + shutter > nextCut ? Math.max(0, t - shutter) : t;
      for (let i = 0; i < count; i++) {
        drawFrame(ctx, Math.min(24, from + (i + 0.5) / count * shutter), { logo }, 'en');
        composite.globalAlpha = 1 / (i + 1);
        composite.drawImage(sample, 0, 0);
      }
      composite.globalAlpha = 1;
      return output.toDataURL('image/jpeg', 0.94).split(',')[1];
    };
  });
  for (let frame = 0; frame < FRAMES; frame++) {
    const jpeg = await page.evaluate(time => window.renderFilmFrame(time), frame / FPS);
    await writeFile(join(output, 'frames', `${String(frame).padStart(5, '0')}.jpg`), Buffer.from(jpeg, 'base64'));
    if (frame % 180 === 0) console.log(`Rendered ${frame}/${FRAMES}`);
  }
  const poster = await page.evaluate(() => window.renderFilmFrame(22.5, 1));
  await writeFile(join(output, 'poster.jpg'), Buffer.from(poster, 'base64'));
  await browser.close(); browser = undefined;
  await server.close(); server = undefined;
  const mp4 = join(output, 'nakharax-launch-1080p60.mp4');
  const webm = join(output, 'nakharax-launch-1080p60.webm');
  console.log('Encoding MP4 with original score...');
  await encode(['-framerate', String(FPS), '-i', join(output, 'frames', '%05d.jpg'), '-i', join(output, 'original-score.wav'), '-vf', 'noise=alls=1:allf=t+u:all_seed=37', '-c:v', 'libx264', '-preset', 'fast', '-crf', '19', '-profile:v', 'high', '-level:v', '4.2', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-c:a', 'aac', '-b:a', '192k', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9', '-ar', '48000', '-t', String(DURATION), '-movflags', '+faststart', '-metadata', 'title=NakharaX Group — A Shared Orbit', mp4]);
  console.log('Encoding WebM companion...');
  await encode(['-i', mp4, '-c:v', 'libvpx-vp9', '-threads', '2', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4', '-crf', '33', '-b:v', '0', '-c:a', 'libopus', '-b:a', '128k', '-t', String(DURATION), webm]);
  await encode(['-i', mp4, '-vf', "select='eq(mod(n,180),90)',scale=480:270,tile=4x2", '-frames:v', '1', join(output, 'contact-sheet.jpg')]);
  const files = {};
  for (const name of ['nakharax-launch-1080p60.mp4', 'nakharax-launch-1080p60.webm', 'original-score.wav', 'poster.jpg', 'contact-sheet.jpg']) {
    const bytes = await readFile(join(output, name));
    files[name] = { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  }
  const sourceFiles = {};
  for (const name of ['launch-film/spec.mjs', 'launch-film/renderer.mjs', 'launch-film/audio.mjs', 'scripts/export-film.mjs', 'assets/nakharax-icon.png', 'assets/fonts/SpaceGrotesk-Bold.ttf', 'assets/fonts/SpaceGrotesk-Regular.ttf', 'assets/fonts/NotoSansThai-Regular.ttf']) {
    sourceFiles[name] = createHash('sha256').update(await readFile(name)).digest('hex');
  }
  const receipt = { title: 'NakharaX Group — A Shared Orbit', width: 1920, height: 1080, fps: FPS, frames: FRAMES, seconds: DURATION, bpm: BPM, motionBlurSamples: 3, sourceFiles, files };
  await writeFile(join(output, 'export-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { if (browser) await browser.close(); if (server) await server.close(); }
