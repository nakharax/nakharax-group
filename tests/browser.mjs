import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { startServer } from '../scripts/static-server.mjs';
const { chromium } = createRequire(import.meta.url)('@playwright/test');

const server = await startServer();
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
await mkdir('.runtime/screenshots', { recursive: true });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function check(name, run) {
  try { await run(); results.push({ name, status: 'PASS' }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, status: 'FAIL', error: error.stack }); console.error(`FAIL ${name}: ${error.stack}`); }
}
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.route('https://**/*', route => route.abort()); // Existing optional Google stylesheet is offline too.
try {
  await page.goto(server.url, { waitUntil: 'load' });
  await check('new film opens from existing CTA', async () => {
    await page.locator('#film-open').click();
    await page.locator('[data-launch-film] canvas').waitFor({ state: 'visible', timeout: 3000 });
    await page.waitForFunction(() => window.launchFilmPlayer?.getState().ready, { timeout: 3000 });
  });
  if (results.at(-1).status === 'FAIL') throw new Error('Player is absent; remaining behavioral checks cannot run.');
  await check('canvas really animates and play/pause freezes time', async () => {
    await page.locator('[data-film-play]').click();
    // Opening starts playback. First click pauses; second starts it again.
    if (!(await page.evaluate(() => window.launchFilmPlayer.getState().playing))) await page.locator('[data-film-play]').click();
    const before = await page.locator('[data-film-canvas]').screenshot();
    await sleep(350);
    const after = await page.locator('[data-film-canvas]').screenshot();
    assert.notDeepEqual(before, after);
    await page.locator('[data-film-play]').click();
    const t = await page.evaluate(() => window.launchFilmPlayer.getState().time);
    await sleep(160);
    assert.equal(await page.evaluate(() => window.launchFilmPlayer.getState().time), t);
  });
  await check('seeking and chapters produce their real frames', async () => {
    await page.evaluate(() => window.launchFilmPlayer.seek(12));
    assert.equal(await page.evaluate(() => window.launchFilmPlayer.getState().chapter), 'xpfirm');
    await page.locator('[data-film-chapter="5"]').click();
    assert.equal(await page.evaluate(() => window.launchFilmPlayer.getState().chapter), 'protocol');
    await page.locator('[data-film-seek]').fill('18');
    assert.equal(await page.evaluate(() => window.launchFilmPlayer.getState().chapter), 'workforce');
  });
  await check('mute is a real state and end resolves without looping', async () => {
    const old = await page.evaluate(() => window.launchFilmPlayer.getState().muted);
    await page.locator('[data-film-mute]').click();
    assert.notEqual(await page.evaluate(() => window.launchFilmPlayer.getState().muted), old);
    await page.evaluate(() => window.launchFilmPlayer.seek(23.85));
    if (!(await page.evaluate(() => window.launchFilmPlayer.getState().playing))) await page.locator('[data-film-play]').click();
    await page.waitForFunction(() => window.launchFilmPlayer.getState().time === 24);
    assert.equal(await page.evaluate(() => window.launchFilmPlayer.getState().playing), false);
  });
  await check('close Escape and reopen stop and resume coherently', async () => {
    await page.evaluate(() => window.launchFilmPlayer.seek(5));
    await page.locator('[data-film-play]').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#film').evaluate(el => el.open), false);
    assert.equal(await page.evaluate(() => window.launchFilmPlayer.getState().playing), false);
    await page.locator('#film-open').click();
    assert.equal(await page.evaluate(() => window.launchFilmPlayer.getState().playing), true);
    await page.locator('#film-close').click();
    assert.equal(await page.evaluate(() => window.launchFilmPlayer.getState().playing), false);
    await page.locator('#film-open').click();
  });
  await check('pagehide lifecycle stops playback', async () => {
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
    assert.equal(await page.evaluate(() => window.launchFilmPlayer.getState().playing), false);
  });
  await check('EN/TH captions and transcript track actual page language', async () => {
    await page.evaluate(() => { document.documentElement.lang = 'th'; window.launchFilmPlayer.seek(12); });
    await page.waitForFunction(() => document.querySelector('[data-film-caption]').textContent.includes('พื้นที่บริหาร'));
    await page.locator('[data-film-summary]').click();
    assert.ok((await page.locator('[data-film-transcript]').innerText()).includes('ไม่มีอำนาจเทรด'));
    await page.locator('[data-film-summary]').click();
    await page.evaluate(() => { document.documentElement.lang = 'en'; });
  });
  await check('responsive mobile tablet and desktop keep controls usable', async () => {
    if (!(await page.locator('#film').evaluate(el => el.open))) await page.locator('#film-open').click();
    await page.locator('[data-film-canvas]').waitFor({ state: 'visible' });
    await page.evaluate(() => window.launchFilmPlayer.pause());
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: width === 360 ? 900 : 1000 });
      await page.evaluate(() => window.launchFilmPlayer.seek(13.1));
      await sleep(120);
      const metrics = await page.locator('[data-launch-film]').evaluate(root => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        controls: [...root.querySelectorAll('button,input[type="range"]')].filter(el => el.getClientRects().length).map(el => ({ label: el.getAttribute('aria-label') || el.textContent, width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      }));
      assert.equal(metrics.overflow, false, `${width}px document overflows`);
      assert.equal(metrics.controls.length, 12, 'all 11 buttons and the seek input must really be visible');
      for (const c of metrics.controls) assert.ok(c.width >= 43.9 && c.height >= 43.9, `${width}px ${c.label}: ${c.width}x${c.height}`);
      await page.screenshot({ path: `.runtime/screenshots/player-${width}.png`, fullPage: false });
    }
  });
  await check('no uncaught browser errors in normal film lifecycle', async () => assert.deepEqual(errors, []));
  await check('reduced motion opens still until explicit playback', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); await p.route('https://**/*', route => route.abort());
    await p.goto(server.url); await p.locator('#film-open').click();
    await p.waitForFunction(() => window.launchFilmPlayer?.getState().ready);
    assert.equal(await p.evaluate(() => window.launchFilmPlayer.getState().playing), false);
    await p.locator('[data-film-play]').click();
    assert.equal(await p.evaluate(() => window.launchFilmPlayer.getState().playing), true);
    await ctx.close();
  });
  await check('missing Web Audio and unavailable 3D retain silent film', async () => {
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => { window.AudioContext = undefined; window.webkitAudioContext = undefined; });
    const p = await ctx.newPage(); await p.route('https://**/*', route => route.abort());
    await p.route('**/app.js', route => route.fulfill({ contentType: 'text/javascript', body: '/* 3D deliberately unavailable in this failure-path test. */' }));
    await p.goto(server.url); await p.locator('#film-open').click();
    await p.waitForFunction(() => window.launchFilmPlayer?.getState().playing);
    await sleep(200);
    assert.ok(await p.evaluate(() => window.launchFilmPlayer.getState().time > 0));
    assert.equal(await p.evaluate(() => window.launchFilmPlayer.getState().audioAvailable), false);
    await ctx.close();
  });
  await check('missing local fonts or logo does not block silent-capable playback', async () => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.route('https://**/*', route => route.abort());
    await p.route('**/assets/fonts/*.ttf', route => route.abort());
    await p.route('**/assets/nakharax-icon.png', route => route.abort());
    await p.goto(server.url); await p.locator('#film-open').click();
    await p.waitForFunction(() => window.launchFilmPlayer?.getState().ready, null, { timeout: 3000 });
    assert.equal(await p.evaluate(() => window.launchFilmPlayer.getState().playing), true);
    await ctx.close();
  });
  await check('standalone film loads local assets and seeks deterministically', async () => {
    const p = await context.newPage(); const external = [];
    p.on('request', req => { if (!req.url().startsWith(server.url) && !req.url().startsWith('data:')) external.push(req.url()); });
    await p.goto(server.url + '/launch-film/');
    await p.waitForFunction(() => window.launchFilmPlayer?.getState().ready);
    const seek = async t => { await p.evaluate(t => window.launchFilmPlayer.seek(t), t); return p.locator('canvas').screenshot(); };
    const first = await seek(9.45); await seek(22); assert.deepEqual(await seek(9.45), first);
    assert.deepEqual(external, []);
    assert.equal(await p.evaluate(() => document.fonts.check('700 30px "Space Grotesk"')), true);
    await p.close();
  });
} catch (error) { if (!results.some(r => r.status === 'FAIL')) results.push({ name: 'harness', status: 'FAIL', error: error.message }); }
finally {
  await context.close(); await browser.close(); await server.close();
  await writeFile('.runtime/browser-results.json', JSON.stringify({ results, passed: results.filter(r => r.status === 'PASS').length, failed: results.filter(r => r.status === 'FAIL').length }, null, 2));
}
console.log(`Browser: ${results.filter(r => r.status === 'PASS').length} passed, ${results.filter(r => r.status === 'FAIL').length} failed`);
process.exitCode = results.some(r => r.status === 'FAIL') ? 1 : 0;
