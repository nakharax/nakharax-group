import { DURATION, CHAPTERS, frameState } from './spec.mjs';
import { drawFrame } from './renderer.mjs';
import { synthesizeAudio } from './audio.mjs';

const strings = {
  en: { play: 'Play', pause: 'Pause', replay: 'Replay', restart: 'Restart', mute: 'Mute', unmute: 'Sound on', transcript: 'Read the film transcript', seek: 'Film position in seconds', chapters: 'Film chapters', reduced: 'Reduced motion: playback is optional. The full transcript is available below.', silent: 'Sound is unavailable. The film can still play silently.' },
  th: { play: 'เล่น', pause: 'พัก', replay: 'เล่นอีกครั้ง', restart: 'เริ่มใหม่', mute: 'ปิดเสียง', unmute: 'เปิดเสียง', transcript: 'อ่านบทภาพยนตร์', seek: 'ตำแหน่งภาพยนตร์เป็นวินาที', chapters: 'ตอนของภาพยนตร์', reduced: 'โหมดลดการเคลื่อนไหว: กดเล่นได้เมื่อต้องการ หรืออ่านบทภาพยนตร์ด้านล่าง', silent: 'ไม่สามารถเปิดเสียงได้ ภาพยนตร์ยังเล่นแบบไม่มีเสียงได้' },
};
const formatTime = t => `00:${String(Math.floor(t)).padStart(2, '0')}`;

export function mountFilm(root) {
  root.classList.add('nx-film');
  // Static authored markup only: no user, URL, storage or remote content is interpolated.
  root.innerHTML = `
    <div class="nx-film-screen"><canvas data-film-canvas width="1920" height="1080" role="img" tabindex="0" aria-label="NakharaX Group brand film. Use the player controls or read the transcript below."></canvas></div>
    <p class="nx-film-caption" data-film-caption></p>
    <div class="nx-film-controls">
      <button type="button" data-film-play></button>
      <button type="button" data-film-restart></button>
      <button type="button" data-film-mute aria-pressed="false"></button>
      <output data-film-time aria-live="off">00:00 / 00:24</output>
      <input data-film-seek type="range" min="0" max="24" step="0.05" value="0" />
    </div>
    <p class="nx-film-status" data-film-status role="status"></p>
    <div class="nx-film-chapters" data-film-chapters></div>
    <details class="nx-film-transcript"><summary data-film-summary></summary><ol data-film-transcript></ol></details>`;
  const q = s => root.querySelector(s);
  const canvas = q('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const dialog = root.closest('dialog');
  const assets = { logo: new Image() };
  let time = 0, base = 0, anchor = 0, playing = false, muted = false, raf = 0, readyFlag = false;
  let audioContext, audioBuffer, source, soundToken = 0;
  let audioAvailable = Boolean(window.AudioContext || window.webkitAudioContext);
  let lastChapter = '', lastLang = '';
  const lang = () => document.documentElement.lang === 'th' ? 'th' : 'en';
  const current = () => playing ? frameState(base + (performance.now() - anchor) / 1000).time : time;

  CHAPTERS.forEach((chapter, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.filmChapter = index;
    button.textContent = `${String(index + 1).padStart(2, '0')} / ${chapter.title}`;
    button.addEventListener('click', () => seek(chapter.start));
    q('[data-film-chapters]').append(button);
  });

  function render() {
    const language = lang(), copy = strings[language], state = frameState(time);
    if (ctx) drawFrame(ctx, time, assets, language);
    q('[data-film-play]').textContent = playing ? copy.pause : state.ended ? copy.replay : copy.play;
    q('[data-film-play]').setAttribute('aria-pressed', String(playing));
    q('[data-film-restart]').textContent = copy.restart;
    q('[data-film-mute]').textContent = muted ? copy.unmute : copy.mute;
    q('[data-film-mute]').setAttribute('aria-pressed', String(muted));
    q('[data-film-seek]').setAttribute('aria-label', copy.seek);
    q('[data-film-seek]').value = String(time);
    q('[data-film-seek]').setAttribute('aria-valuetext', `${formatTime(time)} / 00:24`);
    q('[data-film-time]').textContent = `${formatTime(time)} / 00:24`;
    q('[data-film-summary]').textContent = copy.transcript;
    q('[data-film-chapters]').setAttribute('aria-label', copy.chapters);
    q('[data-film-status]').textContent = !audioAvailable ? copy.silent : reduced.matches ? copy.reduced : '';
    if (lastChapter !== state.chapter.id || lastLang !== language) {
      q('[data-film-caption]').textContent = state.chapter.caption[language];
      q('[data-film-caption]').lang = language;
      q('[data-film-transcript]').replaceChildren(...CHAPTERS.map(chapter => {
        const item = document.createElement('li');
        item.lang = language;
        item.textContent = `${formatTime(chapter.start)} — ${chapter.caption[language]}`;
        return item;
      }));
      q('[data-film-chapters]').querySelectorAll('button').forEach((button, index) => button.setAttribute('aria-current', index === state.chapter.index ? 'true' : 'false'));
      lastChapter = state.chapter.id; lastLang = language;
    }
  }

  function stopSound() {
    soundToken++;
    if (source) { try { source.stop(); } catch {} source.disconnect(); source = undefined; }
  }

  async function startSound() {
    if (muted || !audioAvailable || !playing) return;
    const token = soundToken;
    try {
      if (!audioContext) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) throw new Error('Web Audio is unavailable');
        audioContext = new Context();
        const pcm = synthesizeAudio(audioContext.sampleRate);
        audioBuffer = audioContext.createBuffer(1, pcm.length, audioContext.sampleRate);
        audioBuffer.copyToChannel(pcm, 0);
      }
      await audioContext.resume();
      if (!playing || muted || token !== soundToken || current() >= DURATION) return;
      source = audioContext.createBufferSource(); source.buffer = audioBuffer;
      source.connect(audioContext.destination); source.start(0, current());
    } catch {
      audioAvailable = false; stopSound(); render();
    }
  }

  function tick() {
    if (!playing) return;
    time = current();
    if (time >= DURATION) { pause(); return; }
    render(); raf = requestAnimationFrame(tick);
  }
  function play() {
    if (playing || !readyFlag) return;
    if (time >= DURATION) time = 0;
    base = time; anchor = performance.now(); playing = true;
    stopSound(); void startSound(); render(); raf = requestAnimationFrame(tick);
  }
  function pause() {
    time = current(); playing = false; cancelAnimationFrame(raf); stopSound(); render();
  }
  function seek(seconds) {
    time = frameState(seconds).time; base = time; anchor = performance.now();
    stopSound(); if (playing) void startSound(); render();
  }
  function resize() {
    const width = Math.max(1, root.getBoundingClientRect().width);
    canvas.width = Math.min(1920, Math.max(720, Math.round(width * Math.min(devicePixelRatio || 1, 2))));
    canvas.height = Math.round(canvas.width * 9 / 16); render();
  }

  q('[data-film-play]').addEventListener('click', () => playing ? pause() : play());
  q('[data-film-restart]').addEventListener('click', () => seek(0));
  q('[data-film-mute]').addEventListener('click', () => { muted = !muted; stopSound(); if (playing && !muted) void startSound(); render(); });
  q('[data-film-seek]').addEventListener('input', event => seek(Number(event.target.value)));
  canvas.addEventListener('keydown', event => {
    if (event.key === ' ') { event.preventDefault(); playing ? pause() : play(); }
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); seek(current() + (event.key === 'ArrowRight' ? 3 : -3)); }
    if (event.key === 'Home') { event.preventDefault(); seek(0); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('pagehide', pause);
  reduced.addEventListener('change', () => { if (reduced.matches) pause(); else render(); });
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  new ResizeObserver(resize).observe(root);

  const logoReady = new Promise(resolve => { assets.logo.onload = resolve; assets.logo.onerror = resolve; });
  assets.logo.src = new URL('../assets/nakharax-icon.png', import.meta.url).href;
  const ready = Promise.allSettled([logoReady, document.fonts.load('700 80px "Space Grotesk"'), document.fonts.load('400 32px "Noto Sans Thai"', 'ภาษาไทย')]).then(() => {
    // Local assets normally load; a missing font must still allow system-font playback.
    readyFlag = true; resize();
  });
  if (dialog) {
    document.getElementById('film-open')?.addEventListener('click', () => {
      if (!dialog.open) dialog.showModal();
      dialog.dispatchEvent(new CustomEvent('nx:film-open'));
      void ready.then(() => { if (dialog.open && !reduced.matches) play(); });
    });
    document.getElementById('film-close')?.addEventListener('click', () => { pause(); dialog.close(); });
    // Escape's native cancel path can remove open before a close event is delivered.
    dialog.addEventListener('cancel', pause);
    dialog.addEventListener('close', pause);
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) { pause(); dialog.close(); }
    });
  }
  render();
  return { ready, play, pause, seek, getState: () => ({ time: current(), playing, muted, ready: readyFlag, audioAvailable, chapter: frameState(current()).chapter.id }) };
}

for (const root of document.querySelectorAll('[data-launch-film]')) window.launchFilmPlayer = mountFilm(root);
