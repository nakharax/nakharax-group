export const BPM = 160;
export const BEATS = 64;
export const DURATION = BEATS * 60 / BPM;
export const WIDTH = 1920;
export const HEIGHT = 1080;

const scenes = [
  ['beyond', 'Beyond ideas', ['BEYOND', 'IDEAS.', ['BEYOND', 'IDEAS.'], 'BEYOND.'], 'dark', 'Human ambition starts with an idea.', 'ความมุ่งมั่นของมนุษย์เริ่มต้นจากความคิด'],
  ['impact', 'Into impact', ['INTO', 'IMPACT.', ['INTO', 'IMPACT.'], 'BUILD.'], 'gold', 'Engineering intelligence. Building with purpose.', 'วิศวกรรมแห่งปัญญา สร้างสรรค์อย่างมีเป้าหมาย'],
  ['human', 'Human ambition', ['HUMAN', 'AMBITION.', ['HUMAN', 'AMBITION.'], 'ONE VISION.'], 'paper', 'Independent minds. One shared orbit.', 'ความคิดที่เป็นอิสระ บนวงโคจรแห่งเป้าหมายเดียวกัน'],
  ['intelligence', 'Engineered intelligence', ['ENGINEERED', 'INTELLIGENCE.', ['HUMAN', 'DIRECTION.'], 'REAL WORK.'], 'violet', 'AI amplifies the work. Human judgment stays at the helm.', 'AI ขยายพลังการทำงาน มนุษย์ยังเป็นผู้กำหนดทิศทาง'],
  ['xpfirm', 'XpFirm', ['XPFIRM', 'RISK.', 'DISCIPLINE.', ['RISK &', 'DISCIPLINE.']], 'dark', 'XpFirm — a Trader Risk & Discipline Workspace. Not a promise of returns.', 'XpFirm — พื้นที่บริหารความเสี่ยงและวินัย ไม่ใช่คำสัญญาผลตอบแทน'],
  ['protocol', 'NakharaX Protocol', ['NAKHARAX', 'PROTOCOL', 'OWN MISSION.', 'OWN ORBIT.'], 'gold', 'NakharaX Protocol — a distinct initiative with its own development path.', 'NakharaX Protocol — อีกหนึ่งภารกิจที่มีเส้นทางการพัฒนาของตนเอง'],
  ['workforce', 'AI Workforce', ['HUMAN-LED', 'AI', 'WORKFORCE', ['WITH', 'PURPOSE.']], 'dark', 'Internal AI operations, under human direction. No customer trading authority.', 'ทีม AI ภายในภายใต้การนำของมนุษย์ ไม่มีอำนาจเทรดแทนลูกค้า'],
  ['brand', 'NakharaX Group', ['NAKHARAX GROUP'], 'dark', 'Engineering intelligence. Building with purpose.', 'วิศวกรรมแห่งปัญญา สร้างสรรค์อย่างมีเป้าหมาย'],
];

export const CHAPTERS = scenes.map(([id, title, shots, ground, en, th], index) => Object.freeze({
  id, title, shots, ground, index, start: index * 3, end: (index + 1) * 3,
  caption: Object.freeze({ en, th }),
}));

export function frameState(seconds = 0) {
  const time = typeof seconds === 'number' && Number.isFinite(seconds)
    ? Math.min(DURATION, Math.max(0, seconds)) : 0;
  const chapter = CHAPTERS[Math.min(7, Math.floor(time / 3))];
  const local = time - chapter.start;
  const beat = time * BPM / 60;
  const shotIndex = chapter.id === 'brand' ? 0 : Math.min(3, Math.floor(local / 0.75));
  return {
    time, beat, chapter, local, shotIndex,
    shotTime: local - shotIndex * 0.75,
    words: chapter.shots[shotIndex],
    ended: time === DURATION,
  };
}
