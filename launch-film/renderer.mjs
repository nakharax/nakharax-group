import { WIDTH, HEIGHT, frameState } from './spec.mjs';

const C = { dark: '#041128', gold: '#e5c896', paper: '#f4f0e8', violet: '#572abe' };
const TAU = Math.PI * 2;
const clamp = x => Math.max(0, Math.min(1, x));
const ease = x => 1 - (1 - clamp(x)) ** 4;

function text(ctx, words, x, y, size, color, options = {}) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.textAlign = options.align || 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${size}px "Space Grotesk", sans-serif`;
  const measured = ctx.measureText(words).width;
  const squeeze = Math.min(1, (options.width || 1690) / Math.max(1, measured));
  ctx.translate(x, y);
  ctx.scale(squeeze, 1);
  if (options.outline) { ctx.lineWidth = 2.5; ctx.strokeText(words, 0, 0); }
  else ctx.fillText(words, 0, 0);
  ctx.restore();
}

function geometry(ctx, t, color, strong = false) {
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.rotate(-0.25 + t * 0.045);
  ctx.strokeStyle = color;
  for (let i = 0; i < 7; i++) {
    ctx.globalAlpha = strong ? 0.25 : 0.14;
    ctx.lineWidth = i === 2 ? 2.5 : 1;
    const r = 220 + i * 145 + (t * 46 % 145);
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.49, 0, 0, TAU);
    ctx.stroke();
  }
  for (let i = 0; i < 30; i++) {
    const a = i * 2.39996 + t * (0.14 + (i % 3) * 0.015);
    const radius = 260 + (i * 127 % 1000);
    const x = Math.cos(a) * radius, y = Math.sin(a) * radius * 0.6;
    ctx.globalAlpha = 0.3 + (i % 4) * 0.12;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, i % 6 === 0 ? 5 : 2, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.16;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.sin(a) * 52, y + Math.cos(a) * 25); ctx.stroke();
  }
  ctx.restore();
}

function brand(ctx, state, assets, lang) {
  const p = ease(state.local / 0.8);
  const s = 0.94 + 0.04 * p + state.local * 0.008;
  ctx.save(); ctx.translate(960, 480); ctx.scale(s, s);
  if (assets.logo?.complete && assets.logo.naturalWidth) {
    ctx.globalAlpha = p;
    // The supplied mark is drawn intact, without recoloring, masking or blending.
    ctx.drawImage(assets.logo, -110, -220, 220, 220);
    ctx.globalAlpha = 1;
  }
  text(ctx, 'NAKHARAX', 0, 88, 180, C.paper, { width: 1450 });
  text(ctx, 'G R O U P', 0, 220, 47, C.gold);
  ctx.restore();
  ctx.fillStyle = C.gold; ctx.fillRect(720, 797, 480 * p, 2);
  ctx.textAlign = 'center'; ctx.fillStyle = C.paper;
  ctx.font = `400 ${lang === 'th' ? 38 : 34}px ${lang === 'th' ? '"Noto Sans Thai"' : '"Space Grotesk"'}, sans-serif`;
  ctx.fillText(lang === 'th' ? 'สร้างสรรค์อย่างมีเป้าหมาย' : 'ENGINEERING INTELLIGENCE. BUILDING WITH PURPOSE.', 960, 860);
}

/** Every pixel is a pure function of time plus immutable local assets. */
export function drawFrame(ctx, seconds, assets = {}, language = 'en') {
  const state = frameState(seconds);
  const { chapter, time, local, shotTime, shotIndex } = state;
  const lang = language === 'th' ? 'th' : 'en';
  const ground = chapter.ground;
  const bg = C[ground];
  const ink = ground === 'gold' || ground === 'paper' ? C.dark : C.paper;
  const accent = ground === 'dark' ? C.gold : ink;
  ctx.save();
  ctx.setTransform(ctx.canvas.width / WIDTH, 0, 0, ctx.canvas.height / HEIGHT, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  geometry(ctx, time, accent, ground !== 'dark');

  if (chapter.id === 'brand') {
    brand(ctx, state, assets, lang);
  } else {
    const enter = ease(shotTime / 0.22);
    const end = clamp((shotTime - 0.59) / 0.16);
    const dir = shotIndex % 2 === 0 ? 1 : -1;
    const slide = dir * ((1 - enter) * 800 - end ** 3 * 900);
    const drift = (shotTime - 0.3) * 150;
    const pulse = 1 + 0.08 * Math.exp(-shotTime * 15) + shotTime * 0.04;
    ctx.save();
    ctx.translate(960 + slide + drift, 510 + (shotIndex % 2 ? -25 : 25));
    ctx.rotate((shotIndex % 2 ? 1 : -1) * (0.025 + end * 0.06));
    ctx.scale(pulse, pulse);
    const words = Array.isArray(state.words) ? state.words : [state.words];
    const baseSize = words.length > 1 ? 258 : 345;
    // Traveling outlined rows give the lettering depth without a generic card grid.
    ctx.globalAlpha = 0.18;
    const ghost = Array.isArray(state.words) ? state.words.at(-1) : state.words;
    for (const row of [-1, 1]) {
      text(ctx, ghost, -drift * 3 * row, row * 340, 300, ink, { outline: true, width: 1750 });
    }
    ctx.globalAlpha = 1;
    words.forEach((word, i) => {
      const y = (i - (words.length - 1) / 2) * 265;
      // A short extruded trail only on the landing, not blur painted into the source.
      ctx.globalAlpha = 0.12 * (1 - enter);
      for (let d = 4; d > 0; d--) text(ctx, word, -dir * d * 17, y + d * 8, baseSize, ink);
      ctx.globalAlpha = 1;
      text(ctx, word, 0, y, baseSize, i === 1 && ground === 'dark' ? C.gold : ink);
    });
    ctx.restore();
    const localBeat = local * 160 / 60;
    const radius = 40 + (localBeat % 2) * 95;
    ctx.strokeStyle = accent; ctx.globalAlpha = 0.35 * (1 - localBeat % 1);
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(1740, 160, radius, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    if (chapter.index === 4 || chapter.index === 5 || chapter.index === 6) {
      text(ctx, chapter.title.toUpperCase(), 112, 165, 28, ink, { align: 'left' });
    }
  }

  // Editorial frame labels contain story identity, not invented operating telemetry.
  ctx.font = '500 23px "Space Grotesk", sans-serif'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = ink; ctx.textAlign = 'left'; ctx.fillText('NAKHARAX GROUP  /  A SHARED ORBIT', 88, 72);
  ctx.textAlign = 'right'; ctx.fillText(`${String(chapter.index + 1).padStart(2, '0')} / 08`, 1832, 72);
  ctx.globalAlpha = 0.35; ctx.fillStyle = ink; ctx.fillRect(88, 1025, 1744, 2);
  ctx.globalAlpha = 1; ctx.fillStyle = accent; ctx.fillRect(88, 1024, 1744 * time / 24, 4);
  if (chapter.id !== 'brand') {
    // Caption has a quiet opaque ground for legibility over every scene.
    ctx.fillStyle = ground === 'gold' || ground === 'paper' ? C.paper : C.dark;
    ctx.fillRect(72, 914, 1776, 88);
    ctx.fillStyle = ground === 'gold' || ground === 'paper' ? C.dark : C.paper;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `400 ${lang === 'th' ? 32 : 30}px ${lang === 'th' ? '"Noto Sans Thai"' : '"Space Grotesk"'}, sans-serif`;
    const caption = chapter.caption[lang];
    const width = ctx.measureText(caption).width;
    ctx.save(); ctx.translate(960, 958); ctx.scale(Math.min(1, 1680 / width), 1); ctx.fillText(caption, 0, 0); ctx.restore();
  }
  ctx.restore();
  return state;
}
