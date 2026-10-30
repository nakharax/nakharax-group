import * as THREE from "./vendor/three.module.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const reduced = matchMedia("(prefers-reduced-motion: reduce)");

let paused = reduced.matches,
  visible = true,
  dragging = false,
  px = 0,
  py = 0,
  targetX = 0,
  targetY = 0,
  angle = 0,
  pitch = 0,
  velAngle = 0,
  velPitch = 0,
  scene,
  camera,
  renderer,
  solarSystem,
  sunGroup,
  sunSpikes,
  stars,
  sparkleGroup,
  planets = [],
  rockets = [],
  meteors = [],
  activePlanetIdx = 0,
  clock = 0;

const container = $("#universe");
let activeView = "orbit",
  ready = false,
  scrollProgress = 0;

// Camera presets tailored for the diagonal sweeping Solar System showcase
const views = {
  orbit: { y: 8.5, z: 22.0, scale: 1.0 },
  profile: { y: 1.2, z: 23.5, scale: 1.04 },
  core: { y: 5.5, z: 14.2, scale: 1.32 },
  zenith: { y: 24.0, z: 2.0, scale: 0.92 },
};

const camState = {
  y: views.orbit.y,
  z: views.orbit.z,
  scale: views.orbit.scale,
  shipX: 2.2,
  shipY: 0.3,
};

function selectView(name) {
  if (!ready || !views[name]) return;
  activeView = name;
  container.dataset.view = name;
  $$("[data-view]").forEach((b) => {
    if (b.tagName === "BUTTON") {
      b.setAttribute("aria-pressed", String(b.dataset.view === name));
    }
  });
  $("#scene-state").textContent = "SOLAR VIEW / " + name.toUpperCase();
  if (paused || reduced.matches) {
    resize(true);
  }
}

const labelRefreshCallbacks = [];

// Draw Playful Condensed Hand-Cut Poster Letters (exact match to SOLAR SYSTEM / PLANET font in 20488946.jpg!)
function drawPlayfulPosterWord(ctx, word, centerY, fontSize, faceColor, shadowColor = "#020a1c") {
  ctx.save();
  ctx.font = `900 ${fontSize}px "NakharaSolarDisplay", "Arial Narrow", "Liberation Sans Narrow", sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.lineJoin = "round";

  const chars = Array.from(word);
  const charWidths = chars.map((ch) => {
    const w = ctx.measureText(ch).width * 0.84;
    return ch === " " ? fontSize * 0.34 : w + fontSize * 0.04;
  });
  const totalW = charWidths.reduce((a, b) => a + b, 0);

  let curX = -totalW / 2;
  chars.forEach((ch, i) => {
    const cw = charWidths[i];
    const cx = curX + cw / 2;
    curX += cw;
    if (ch === " ") return;

    // Alternating playful bounce & hand-cut angle per character (just like 20488946.jpg!)
    const bounceY = ((i % 3) - 1) * (fontSize * 0.045);
    const charTilt = ((i % 2 === 0 ? 1 : -1) * 0.048) + ((i % 3 === 1 ? 0.025 : -0.015));

    ctx.save();
    ctx.translate(cx, centerY + bounceY);
    ctx.rotate(charTilt);
    // Condensed tall poster block proportions
    ctx.scale(0.82, 1.24);

    // Solid 3D Extruded Deep-Navy Block Shadow (down-left & down-right block thickness)
    const extrudeSteps = Math.max(4, Math.round(fontSize * 0.11));
    ctx.fillStyle = shadowColor;
    for (let d = extrudeSteps; d >= 1; d--) {
      ctx.fillText(ch, -d * 0.75, d * 1.15);
      ctx.fillText(ch, d * 0.55, d * 1.15);
    }
    ctx.lineWidth = Math.max(5, fontSize * 0.19);
    ctx.strokeStyle = shadowColor;
    ctx.strokeText(ch, 0, 0);

    // Crisp Foreground Letter Face
    ctx.fillStyle = faceColor;
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });

  ctx.restore();
}

function makeLabelSprite(text, subtext = "", accentColor = "#ffbe0b", scaleW = 2.65, tiltRad = -0.34) {
  const cv = document.createElement("canvas");
  cv.width = 640;
  cv.height = 280;
  const ctx = cv.getContext("2d");
  const tex = new THREE.CanvasTexture(cv);

  const renderLabel = () => {
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save();
    ctx.translate(cv.width / 2, cv.height / 2);
    ctx.rotate(tiltRad);

    const mainY = subtext ? -22 : 0;
    drawPlayfulPosterWord(ctx, text, mainY, 68, "#ffffff", "#020a1c");

    if (subtext) {
      drawPlayfulPosterWord(ctx, subtext.replace("★ ", ""), 42, 34, accentColor, "#020a1c");
    }
    ctx.restore();
    tex.needsUpdate = true;
  };

  renderLabel();
  labelRefreshCallbacks.push(renderLabel);

  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
    }),
  );
  spr.scale.set(scaleW, scaleW * (cv.height / cv.width), 1);
  spr.renderOrder = 12;
  return spr;
}

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    labelRefreshCallbacks.forEach((fn) => fn());
    if (ready) renderAt(clock);
  });
}

// Create Stylized Vector-Illustration Shading + Gloss Cap Sprite matching 20488946.jpg
function makeGlossSprite(radius) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const ctx = cv.getContext("2d");

  // Clip to circle matching sphere radius
  ctx.save();
  ctx.beginPath();
  ctx.arc(128, 128, 118, 0, Math.PI * 2);
  ctx.clip();

  // Bottom-right crescent shadow for rich 2.5D illustrated depth
  const sh = ctx.createRadialGradient(90, 88, 30, 138, 138, 126);
  sh.addColorStop(0, "rgba(0,0,0,0)");
  sh.addColorStop(0.65, "rgba(4,12,32,0.12)");
  sh.addColorStop(1, "rgba(2,8,24,0.48)");
  ctx.fillStyle = sh;
  ctx.fillRect(0, 0, 256, 256);

  // Crisp glossy top-left oval highlight (exact style of 20488946.jpg)
  ctx.save();
  ctx.translate(86, 76);
  ctx.rotate(-0.58);
  ctx.scale(1.45, 0.72);
  const hl = ctx.createRadialGradient(0, 0, 2, 0, 0, 46);
  hl.addColorStop(0, "rgba(255,255,255,0.68)");
  hl.addColorStop(0.65, "rgba(255,255,255,0.32)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hl;
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();

  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(cv),
      transparent: true,
      depthWrite: false,
    }),
  );
  spr.scale.set(radius * 2.16, radius * 2.16, 1);
  return spr;
}

// Create Billboarded Spiky Solar Corona Sprite (exact spiky orange-gold starburst from 20488946.jpg!)
function makeSunSpikyCoronaSprite(scaleSize) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 512;
  const ctx = cv.getContext("2d");
  const cx = 256, cy = 256;

  // Soft outer orange-gold glow
  const glow = ctx.createRadialGradient(cx, cy, 90, cx, cy, 250);
  glow.addColorStop(0, "rgba(255, 140, 0, 0.85)");
  glow.addColorStop(0.55, "rgba(255, 102, 0, 0.35)");
  glow.addColorStop(1, "rgba(255, 69, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 512, 512);

  // 28 alternating long & short spiky solar flare rays around silhouette
  const spikes = 28;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? (i % 4 === 0 ? 236 : 210) : 142;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const rayGrad = ctx.createRadialGradient(cx, cy, 130, cx, cy, 238);
  rayGrad.addColorStop(0, "#ffbe0b");
  rayGrad.addColorStop(0.55, "#fb8500");
  rayGrad.addColorStop(1, "#ff5400");
  ctx.fillStyle = rayGrad;
  ctx.fill();

  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(cv),
      transparent: true,
      depthWrite: false,
    }),
  );
  spr.scale.set(scaleSize, scaleSize, 1);
  return spr;
}

// Custom Illustrated Planet Surface Texture Generator matching 20488946.jpg
function makeIllustratedPlanetTexture(type) {
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 256;
  const ctx = cv.getContext("2d");

  if (type === "sun") {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#ffd166");
    g.addColorStop(0.35, "#ff9f1c");
    g.addColorStop(0.75, "#f76707");
    g.addColorStop(1, "#e8590c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);
  } else if (type === "mercury") {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#cbd5e1");
    g.addColorStop(0.5, "#94a3b8");
    g.addColorStop(1, "#475569");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);
    // Craters
    [
      [90, 80, 22],
      [210, 140, 30],
      [340, 95, 18],
      [430, 165, 25],
      [150, 190, 16],
    ].forEach(([x, y, r]) => {
      ctx.fillStyle = "rgba(51,65,85,0.55)";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (type === "venus") {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#fde047");
    g.addColorStop(0.45, "#f59e0b");
    g.addColorStop(1, "#b45309");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 === 0 ? "rgba(254,240,138,0.38)" : "rgba(146,64,14,0.35)";
      ctx.fillRect(0, i * 42, 512, 20);
    }
  } else if (type === "earth") {
    // Vibrant Ocean Blue
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#38bdf8");
    g.addColorStop(0.5, "#0284c7");
    g.addColorStop(1, "#0369a1");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);
    // Stylized Green Continents
    ctx.fillStyle = "#4ade80";
    [
      [80, 70, 65, 42],
      [190, 120, 85, 55],
      [330, 65, 75, 48],
      [410, 150, 65, 45],
      [120, 175, 50, 35],
    ].forEach(([x, y, rx, ry]) => {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.ellipse(x + 10, y + 6, rx * 0.65, ry * 0.65, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4ade80";
    });
    // White cloud ribbons
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    [
      [140, 55, 55, 10],
      [290, 145, 70, 12],
      [420, 95, 50, 10],
    ].forEach(([x, y, rx, ry]) => {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (type === "mars") {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#fb7185");
    g.addColorStop(0.4, "#ef4444");
    g.addColorStop(0.8, "#b91c1c");
    g.addColorStop(1, "#7f1d1d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);
    [
      [110, 95, 24],
      [260, 150, 32],
      [390, 85, 20],
    ].forEach(([x, y, r]) => {
      ctx.fillStyle = "rgba(127,29,29,0.55)";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (type === "jupiter") {
    const bands = [
      "#b91c1c",
      "#f97316",
      "#fde047",
      "#ea580c",
      "#dc2626",
      "#fdba74",
      "#991b1b",
      "#f59e0b",
    ];
    bands.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(0, i * 32, 512, 34);
    });
    // Great Red Spot
    ctx.fillStyle = "#dc2626";
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(260, 152, 46, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (type === "saturn") {
    const bands = [
      "#f3e8ff",
      "#d8b4fe",
      "#a855f7",
      "#c084fc",
      "#7e22ce",
      "#e9d5ff",
      "#6b21a8",
    ];
    bands.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(0, i * (256 / bands.length), 512, 42);
    });
  } else if (type === "uranus") {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#a5f3fc");
    g.addColorStop(0.45, "#22d3ee");
    g.addColorStop(0.8, "#0891b2");
    g.addColorStop(1, "#155e75");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(0, 70, 512, 18);
    ctx.fillRect(0, 155, 512, 14);
  } else if (type === "neptune") {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#93c5fd");
    g.addColorStop(0.35, "#3b82f6");
    g.addColorStop(0.75, "#1d4ed8");
    g.addColorStop(1, "#1e3a8a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = "rgba(191,219,254,0.35)";
    ctx.fillRect(0, 60, 512, 16);
    ctx.fillRect(0, 140, 512, 22);
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

// Create Stylized Saturn / Uranus Ring Texture
function makeStylizedRingTexture(c1, c2, c3) {
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 512;
  const ctx = cv.getContext("2d");
  const cx = 256,
    cy = 256;
  [
    [118, 142, c1, 0.92],
    [146, 178, c2, 0.78],
    [184, 218, c3, 0.9],
    [222, 240, c1, 0.65],
  ].forEach(([rIn, rOut, col, alpha]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, (rIn + rOut) / 2, 0, Math.PI * 2);
    ctx.strokeStyle = col;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = rOut - rIn;
    ctx.stroke();
  });
  return new THREE.CanvasTexture(cv);
}

// Build a 3D Stylized Space Rocket (like the red/white & blue/white rockets in 20488946.jpg!)
function createStylizedRocket(accentHex = 0xef4444) {
  const rocket = new THREE.Group();

  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.25,
    metalness: 0.15,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    roughness: 0.3,
    metalness: 0.2,
  });
  const windowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.4,
  });

  // Fuselage body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 0.72, 24),
    whiteMat,
  );
  body.rotation.z = -Math.PI / 2;
  rocket.add(body);

  // Colored stripe band
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.205, 0.215, 0.24, 24),
    accentMat,
  );
  band.position.x = -0.12;
  band.rotation.z = -Math.PI / 2;
  rocket.add(band);

  // Pointed Nose Cone
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 24), accentMat);
  nose.position.x = 0.57;
  nose.rotation.z = -Math.PI / 2;
  rocket.add(nose);

  // Porthole Window + Frame
  const portholeFrame = new THREE.Mesh(
    new THREE.TorusGeometry(0.085, 0.02, 12, 24),
    accentMat,
  );
  portholeFrame.position.set(0.15, 0.05, 0.18);
  rocket.add(portholeFrame);

  const portholeGlass = new THREE.Mesh(
    new THREE.CircleGeometry(0.075, 20),
    windowMat,
  );
  portholeGlass.position.set(0.15, 0.05, 0.19);
  rocket.add(portholeGlass);

  // 3 Swept Fins
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.04), accentMat);
    fin.position.set(-0.32, Math.cos(a) * 0.22, Math.sin(a) * 0.22);
    fin.rotation.x = a;
    rocket.add(fin);
  }

  // Twin Booster Nozzles + Glowing Flame Cones
  const flames = [];
  [-0.1, 0.1].forEach((offsetY) => {
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.14, 16),
      darkMat,
    );
    nozzle.position.set(-0.42, offsetY, 0);
    nozzle.rotation.z = -Math.PI / 2;
    rocket.add(nozzle);

    const outerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.42, 16),
      new THREE.MeshBasicMaterial({ color: 0xf97316 }),
    );
    outerFlame.position.set(-0.66, offsetY, 0);
    outerFlame.rotation.z = Math.PI / 2;
    rocket.add(outerFlame);

    const innerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.045, 0.26, 12),
      new THREE.MeshBasicMaterial({ color: 0xfef08a }),
    );
    innerFlame.position.set(-0.58, offsetY, 0);
    innerFlame.rotation.z = Math.PI / 2;
    rocket.add(innerFlame);

    flames.push(outerFlame, innerFlame);
  });

  rocket.userData.flames = flames;
  return rocket;
}

// Create a Streaking 3D Fiery Meteor / Comet (like the blazing meteors in 20488946.jpg!)
function createMeteor() {
  const g = new THREE.Group();
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.11, 0),
    new THREE.MeshStandardMaterial({
      color: 0xd97706,
      emissive: 0xea580c,
      emissiveIntensity: 0.6,
      roughness: 0.5,
    }),
  );
  g.add(rock);

  // Fiery tapered tail
  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.11, 0.85, 12),
    new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.82,
    }),
  );
  tail.position.set(0.42, 0.28, 0);
  tail.rotation.z = -0.98;
  g.add(tail);

  const coreTail = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.5, 10),
    new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.95,
    }),
  );
  coreTail.position.set(0.24, 0.16, 0);
  coreTail.rotation.z = -0.98;
  g.add(coreTail);

  return g;
}

function setup() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x04142e, 0.006);
  camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0x04142e, 0);
  renderer.toneMapping = THREE.NoToneMapping;
  container.appendChild(renderer.domElement);

  // Bright, crisp illustration lighting
  scene.add(new THREE.AmbientLight(0xdbeafe, 2.5));

  const sunLight = new THREE.PointLight(0xffedd5, 85, 80, 1.1);
  sunLight.position.set(-4, 3, 4);
  scene.add(sunLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
  keyLight.position.set(-8, 12, 14);
  scene.add(keyLight);

  solarSystem = new THREE.Group();
  scene.add(solarSystem);

  // =========================================================================
  // 1. GIANT STYLIZED ORANGE-GOLD SUN WITH SPIKY SOLAR RAYS ("SUN")
  // =========================================================================
  sunGroup = new THREE.Group();
  solarSystem.add(sunGroup);

  const sunTex = makeIllustratedPlanetTexture("sun");
  const sunSphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.55, 64, 64),
    new THREE.MeshBasicMaterial({ map: sunTex }),
  );
  sunGroup.add(sunSphere);

  // Glossy cartoon highlight on the Sun
  sunGroup.add(makeGlossSprite(1.55));

  // Spiky Solar Corona Burst Sprite behind the Sun sphere (always frames silhouette!)
  sunSpikes = makeSunSpikyCoronaSprite(4.9);
  sunSpikes.position.set(0, 0, -0.15);
  sunGroup.add(sunSpikes);

  // "SUN" Label positioned cleanly below the Sun with zero planet overlap
  const sunLabel = makeLabelSprite("SUN", "NAKHARAX CORE", "#ffbe0b", 2.55, -0.18);
  sunLabel.position.set(-0.15, -2.18, 0.8);
  sunGroup.add(sunLabel);

  // Iconic "SOLAR SYSTEM" 3D Floating Banner in upper-right (matching 20488946.jpg!)
  const titleBanner = makeLabelSprite("SOLAR SYSTEM", "NAKHARAX UNIVERSE", "#38bdf8", 4.2, 0);
  titleBanner.position.set(4.8, 3.85, -2.5);
  solarSystem.add(titleBanner);

  // =========================================================================
  // 2. ALL 8 LABELED PLANETS ON DASHED CYAN ORBITS (MATCHING 20488946.JPG)
  // =========================================================================
  const planetDefs = [
    {
      id: "mercury",
      label: "MERCURY",
      sub: "",
      missionIdx: -1,
      radius: 2.65,
      size: 0.26,
      speed: 0.24,
      angle: 5.95,
      accent: "#cbd5e1",
    },
    {
      id: "venus",
      label: "VENUS",
      sub: "",
      missionIdx: -1,
      radius: 3.5,
      size: 0.36,
      speed: 0.19,
      angle: 0.52,
      accent: "#fbbf24",
    },
    {
      id: "earth",
      label: "EARTH",
      sub: "★ 01 · XPFIRM",
      missionIdx: 0,
      radius: 4.45,
      size: 0.48,
      speed: 0.16,
      angle: 2.22,
      accent: "#38bdf8",
    },
    {
      id: "mars",
      label: "MARS",
      sub: "",
      missionIdx: -1,
      radius: 5.35,
      size: 0.35,
      speed: 0.13,
      angle: 2.82,
      accent: "#f87171",
    },
    {
      id: "jupiter",
      label: "JUPITER",
      sub: "★ 02 · PROTOCOL",
      missionIdx: 1,
      radius: 6.5,
      size: 0.74,
      speed: 0.1,
      angle: 3.65,
      accent: "#fbbf24",
    },
    {
      id: "saturn",
      label: "SATURN",
      sub: "★ 03 · HERMES AI",
      missionIdx: 2,
      radius: 7.8,
      size: 0.58,
      speed: 0.08,
      angle: 4.95,
      accent: "#e879f9",
      ring: { outer: 1.32, tiltX: 0.45, tiltZ: 0.25, colors: ["#bae6fd", "#c084fc", "#e0f2fe"] },
    },
    {
      id: "uranus",
      label: "URANUS",
      sub: "",
      missionIdx: -1,
      radius: 9.0,
      size: 0.46,
      speed: 0.065,
      angle: 5.58,
      accent: "#22d3ee",
      ring: { outer: 0.92, tiltX: 1.35, tiltZ: 0.15, colors: ["#a5f3fc", "#38bdf8", "#cffafe"] },
    },
    {
      id: "neptune",
      label: "NEPTUNE",
      sub: "",
      missionIdx: -1,
      radius: 10.1,
      size: 0.44,
      speed: 0.05,
      angle: 0.22,
      accent: "#60a5fa",
    },
  ];

  planets = [];

  planetDefs.forEach((cfg) => {
    // Dashed Cyan Orbital Track (matching the dashed blue-cyan lines in 20488946.jpg!)
    const curvePts = [];
    const segs = 180;
    for (let i = 0; i <= segs; i++) {
      const th = (i / segs) * Math.PI * 2;
      curvePts.push(
        new THREE.Vector3(
          Math.cos(th) * cfg.radius,
          0,
          Math.sin(th) * cfg.radius * 0.82,
        ),
      );
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePts);
    const lineMat = new THREE.LineDashedMaterial({
      color: cfg.missionIdx >= 0 ? 0x7dd3fc : 0x38bdf8,
      dashSize: 0.28,
      gapSize: 0.18,
      transparent: true,
      opacity: cfg.missionIdx >= 0 ? 0.72 : 0.42,
    });
    const orbitLine = new THREE.Line(lineGeo, lineMat);
    orbitLine.computeLineDistances();
    solarSystem.add(orbitLine);

    // Planet Holder
    const planetHolder = new THREE.Group();
    solarSystem.add(planetHolder);

    const pTex = makeIllustratedPlanetTexture(cfg.id);
    const planetMesh = new THREE.Mesh(
      new THREE.SphereGeometry(cfg.size, 48, 48),
      new THREE.MeshBasicMaterial({
        map: pTex,
      }),
    );
    planetHolder.add(planetMesh);

    // Glossy Cartoon Specular Highlight Cap
    planetHolder.add(makeGlossSprite(cfg.size));

    // Saturn / Uranus Stylized Rings
    if (cfg.ring) {
      const rTex = makeStylizedRingTexture(
        cfg.ring.colors[0],
        cfg.ring.colors[1],
        cfg.ring.colors[2],
      );
      const ringPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(cfg.ring.outer * 2.1, cfg.ring.outer * 2.1),
        new THREE.MeshBasicMaterial({
          map: rTex,
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false,
        }),
      );
      ringPlane.rotation.set(Math.PI / 2 + cfg.ring.tiltX, 0, cfg.ring.tiltZ);
      planetHolder.add(ringPlane);
    }

    // Target Reticle for the 3 NakharaX Venture Planets
    let reticle = null;
    if (cfg.missionIdx >= 0) {
      reticle = new THREE.Mesh(
        new THREE.TorusGeometry(cfg.size * 1.65, 0.024, 10, 64),
        new THREE.MeshBasicMaterial({
          color: 0xfbbf24,
          transparent: true,
          opacity: cfg.missionIdx === activePlanetIdx ? 0.95 : 0.0,
        }),
      );
      reticle.rotation.x = Math.PI / 2;
      planetHolder.add(reticle);
    }

    // Floating Uppercase Planet Name Label above the planet
    const labelSpr = makeLabelSprite(
      cfg.label,
      cfg.sub,
      cfg.accent,
      cfg.sub ? 3.15 : 2.65,
      -0.34,
    );
    labelSpr.position.set(0, cfg.size + (cfg.sub ? 0.78 : 0.58), 0);
    planetHolder.add(labelSpr);

    planets.push({
      cfg,
      planetHolder,
      planetMesh,
      reticle,
    });
  });

  // =========================================================================
  // 3. TWO 3D STYLIZED ROCKETS WITH THRUSTER FLAMES (MATCHING 20488946.JPG)
  // =========================================================================
  rockets = [];
  const redRocket = createStylizedRocket(0xef4444);
  redRocket.scale.setScalar(0.95);
  solarSystem.add(redRocket);
  rockets.push({
    mesh: redRocket,
    radius: 5.75,
    speed: 0.24,
    angle: 0.85,
    heightOffset: 1.35,
  });

  const blueRocket = createStylizedRocket(0x0284c7);
  blueRocket.scale.setScalar(0.95);
  solarSystem.add(blueRocket);
  rockets.push({
    mesh: blueRocket,
    radius: 6.9,
    speed: -0.2,
    angle: 4.5,
    heightOffset: -0.95,
  });

  // =========================================================================
  // 4. STREAKING FIERY METEORS & 4-POINT TWINKLING STAR SPARKLES
  // =========================================================================
  meteors = [];
  const meteorPositions = [
    [-5.8, 3.4, -2.5],
    [-0.8, 3.8, -3.0],
    [8.4, 2.4, -1.5],
    [-4.6, -2.8, 2.2],
    [3.8, -2.6, 3.0],
    [7.8, -1.5, 1.2],
  ];
  meteorPositions.forEach(([mx, my, mz], idx) => {
    const m = createMeteor();
    m.position.set(mx, my, mz);
    m.scale.setScalar(0.75 + (idx % 3) * 0.15);
    solarSystem.add(m);
    meteors.push({
      mesh: m,
      baseX: mx,
      baseY: my,
      baseZ: mz,
      phase: idx * 1.3,
    });
  });

  // Background Starfield + 4-Point Star Sparkles
  let seed = 9421;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const pts = [];
  for (let i = 0; i < 2000; i++) {
    pts.push(
      (random() - 0.5) * 120,
      (random() - 0.5) * 75,
      -random() * 75 - 10,
    );
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  stars = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xe0f2fe,
      size: 0.06,
      transparent: true,
      opacity: 0.85,
    }),
  );
  scene.add(stars);

  // 4-point star sparkles (like the white cross-stars in 20488946.jpg)
  const spCv = document.createElement("canvas");
  spCv.width = spCv.height = 64;
  const spCtx = spCv.getContext("2d");
  spCtx.fillStyle = "#ffffff";
  spCtx.beginPath();
  spCtx.moveTo(32, 2);
  spCtx.quadraticCurveTo(32, 32, 62, 32);
  spCtx.quadraticCurveTo(32, 32, 32, 62);
  spCtx.quadraticCurveTo(32, 32, 2, 32);
  spCtx.quadraticCurveTo(32, 32, 32, 2);
  spCtx.fill();
  const spTex = new THREE.CanvasTexture(spCv);

  sparkleGroup = new THREE.Group();
  solarSystem.add(sparkleGroup);
  for (let i = 0; i < 28; i++) {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: spTex,
        transparent: true,
        opacity: 0.5 + random() * 0.5,
      }),
    );
    sp.position.set(
      (random() - 0.5) * 22,
      (random() - 0.5) * 10,
      (random() - 0.5) * 14,
    );
    const sSize = 0.22 + random() * 0.28;
    sp.scale.set(sSize, sSize, 1);
    sparkleGroup.add(sp);
  }

  ready = true;
  resize(true);
  renderAt(0);
  window.__sceneReady = true;
  $("#scene-state").textContent = "3D SOLAR SYSTEM / DRAG OR USE ARROW KEYS";

  renderer.domElement.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    fallback("3D unavailable — poster view");
  });
}

function applyCamera() {
  camera.position.set(0, camState.y, camState.z);
  camera.lookAt(0, 0, 0);
  solarSystem.position.set(camState.shipX, camState.shipY, 0);
  solarSystem.scale.setScalar(camState.scale);
}

function resize(immediate = false) {
  if (!ready) return;
  const w = container.clientWidth || window.innerWidth;
  const h = container.clientHeight || window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  const mobile = w < 600;
  const tablet = w >= 600 && w < 1024;
  const film = document.body.classList.contains("film-mode");
  const v = views[activeView];

  const targetYPos = mobile ? v.y + 2.0 : v.y;
  const targetZPos = mobile ? v.z + 4.2 : v.z;
  const targetScale = (mobile ? 0.68 : tablet ? 0.84 : 1) * v.scale;
  const targetShipX = film ? 0 : mobile ? 0 : tablet ? 1.8 : 2.6;
  const targetShipY = film ? 0 : mobile ? -1.1 : 0.3;

  if (immediate || paused || reduced.matches) {
    camState.y = targetYPos;
    camState.z = targetZPos;
    camState.scale = targetScale;
    camState.shipX = targetShipX;
    camState.shipY = targetShipY;
    applyCamera();
  }
  renderAt(clock);
}

function renderAt(t) {
  if (!ready) return;
  clock = t;

  const w = container.clientWidth || window.innerWidth;
  const mobile = w < 600;
  const tablet = w >= 600 && w < 1024;
  const film = document.body.classList.contains("film-mode");
  const v = views[activeView];

  const desiredY = mobile ? v.y + 2.0 : v.y;
  const desiredZ = mobile ? v.z + 4.2 : v.z;
  const desiredScale = (mobile ? 0.68 : tablet ? 0.84 : 1) * v.scale;
  const desiredShipX = film ? 0 : mobile ? 0 : tablet ? 1.8 : 2.6;
  const desiredShipY = film ? 0 : mobile ? -1.1 : 0.3;

  camState.y += (desiredY - camState.y) * 0.09;
  camState.z += (desiredZ - camState.z) * 0.09;
  camState.scale += (desiredScale - camState.scale) * 0.09;
  camState.shipX += (desiredShipX - camState.shipX) * 0.09;
  camState.shipY += (desiredShipY - camState.shipY) * 0.09;
  applyCamera();

  if (!dragging) {
    angle += velAngle;
    pitch = Math.max(-0.5, Math.min(0.5, pitch + velPitch));
    velAngle *= 0.92;
    velPitch *= 0.92;
  }

  const rotX = 0.22 + pitch + targetY * 0.14 + scrollProgress * 0.08;
  const rotY = -0.18 + angle + t * 0.02 + scrollProgress * 0.22;
  solarSystem.rotation.set(rotX, rotY, -0.12 + targetX * 0.04);

  // Rotate Spiky Sun Corona
  if (sunSpikes && sunSpikes.material) {
    sunSpikes.material.rotation = t * 0.18;
  }

  // Orbit all 8 Labeled Planets along their elliptical dashed paths
  planets.forEach((p) => {
    const th = p.cfg.angle + t * p.cfg.speed;
    p.planetHolder.position.set(
      Math.cos(th) * p.cfg.radius,
      0,
      Math.sin(th) * p.cfg.radius * 0.82,
    );
    p.planetMesh.rotation.y = t * 0.55;
    if (p.reticle) {
      const isSelected = p.cfg.missionIdx === activePlanetIdx;
      p.reticle.material.opacity +=
        ((isSelected ? 0.95 : 0.0) - p.reticle.material.opacity) * 0.12;
      p.reticle.rotation.z = t * 0.8;
    }
  });

  // Animate the 2 3D Stylized Space Rockets
  rockets.forEach((r, idx) => {
    const th = r.angle + t * r.speed;
    const x = Math.cos(th) * r.radius;
    const z = Math.sin(th) * r.radius * 0.82;
    const y = r.heightOffset + Math.sin(t * 2.2 + idx) * 0.22;
    r.mesh.position.set(x, y, z);

    // Point rocket along tangent of its flight path
    const dir = r.speed >= 0 ? 1 : -1;
    r.mesh.rotation.y = -th - (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    r.mesh.rotation.z = Math.sin(t * 3 + idx) * 0.08;

    // Flicker rocket thruster flames
    const flicker = 0.88 + Math.sin(t * 28 + idx * 3) * 0.18;
    r.mesh.userData.flames.forEach((fl) => {
      fl.scale.y = flicker;
    });
  });

  // Animate Streaking Meteors
  meteors.forEach((m) => {
    const drift = ((t * 0.65 + m.phase) % 4.0) - 2.0;
    m.mesh.position.x = m.baseX - drift * 1.4;
    m.mesh.position.y = m.baseY - drift * 0.9;
  });

  stars.rotation.z = t * 0.001;

  const telem = $("#telemetry-angles");
  if (telem) {
    const yawDeg = Math.round((((rotY * 180) / Math.PI) % 360 + 360) % 360)
      .toString()
      .padStart(3, "0");
    const pitchDeg = Math.round((rotX * 180) / Math.PI);
    const sign = pitchDeg >= 0 ? "+" : "";
    telem.textContent = `YAW ${yawDeg}° · INCLINATION ${sign}${pitchDeg}°`;
  }

  renderer.render(scene, camera);
}

window.__renderAt = renderAt;

function fallback(label = "POSTER VIEW / 3D UNAVAILABLE") {
  ready = false;
  document.body.classList.add("fallback");
  $("#scene-state").textContent = label;
  window.__sceneReady = false;
  container.removeAttribute("tabindex");
  $$(".scene-tools button,.view-preset button").forEach((b) => (b.disabled = true));
  $("#scene-help").textContent =
    "Static poster view. All company and project content remains available below.";
}

try {
  setup();
} catch (e) {
  console.warn("3D fallback:", e.message);
  fallback();
}

let last = 0;
function loop(now) {
  requestAnimationFrame(loop);
  if (!last) last = now;
  const delta = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (!paused && visible && !document.hidden) renderAt(clock + delta);
}
requestAnimationFrame(loop);

new ResizeObserver(() => resize(false)).observe(container);
new IntersectionObserver(
  (es) => {
    visible = es[0].isIntersecting;
  },
  { threshold: 0.01 },
).observe(container);

container.addEventListener("pointerdown", (e) => {
  if (!ready) return;
  dragging = true;
  px = e.clientX;
  py = e.clientY;
  velAngle = 0;
  velPitch = 0;
  container.setPointerCapture(e.pointerId);
});

container.addEventListener("pointerup", () => (dragging = false));
container.addEventListener("pointercancel", () => (dragging = false));

container.addEventListener("pointermove", (e) => {
  if (dragging) {
    const dx = (e.clientX - px) * 0.008;
    const dy = (e.clientY - py) * 0.005;
    angle += dx;
    pitch = Math.max(-0.5, Math.min(0.5, pitch + dy));
    velAngle = dx * 0.35;
    velPitch = dy * 0.35;
    px = e.clientX;
    py = e.clientY;
  } else if (!reduced.matches) {
    targetX = e.clientX / innerWidth - 0.5;
    targetY = e.clientY / innerHeight - 0.5;
  }
  if (paused) renderAt(clock);
});

function resetScene() {
  angle = pitch = velAngle = velPitch = targetX = targetY = scrollProgress = 0;
  selectView("orbit");
  renderAt(0);
}

$$("button[data-view]").forEach((b) => {
  b.addEventListener("click", () => selectView(b.dataset.view));
});

container.addEventListener("keydown", (e) => {
  if (!ready) return;
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
    e.preventDefault();
    angle += e.key === "ArrowRight" ? 0.18 : -0.18;
    renderAt(clock);
  } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    e.preventDefault();
    pitch = Math.max(-0.5, Math.min(0.5, pitch + (e.key === "ArrowDown" ? 0.1 : -0.1)));
    renderAt(clock);
  } else if (e.key === "Home") {
    e.preventDefault();
    resetScene();
  }
});

window.addEventListener(
  "scroll",
  () => {
    if (reduced.matches || paused || !visible) return;
    scrollProgress = Math.min(scrollY / container.clientHeight, 1);
  },
  { passive: true },
);

function motionState() {
  $("#motion").textContent = paused ? "Resume motion" : "Pause motion";
  $("#motion").setAttribute("aria-pressed", String(paused));
}
motionState();

$("#motion").addEventListener("click", () => {
  paused = !paused;
  motionState();
});

reduced.addEventListener("change", (e) => {
  paused = e.matches;
  if (e.matches) {
    scrollProgress = targetX = targetY = 0;
    renderAt(clock);
  }
  motionState();
});

$("#reset").addEventListener("click", resetScene);

// Mobile Navigation Drawer
const menuToggle = $("#menu-toggle");
const primaryNav = $("#primary-nav");
if (menuToggle && primaryNav) {
  menuToggle.addEventListener("click", () => {
    const open = primaryNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
  });
  $$("#primary-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      primaryNav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

// Atmosphere Theme Switcher (Cosmic Dark / Pearl Light)
$$("[data-theme-set]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const theme = btn.dataset.themeSet;
    document.documentElement.dataset.theme = theme;
    $$("[data-theme-set]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b === btn));
    });
    if (scene && scene.fog) {
      scene.fog.color.setHex(theme === "pearl" ? 0xf3f5fb : 0x04142e);
      if (paused) renderAt(clock);
    }
  });
});

// Language Mode Switcher (EN default, TH)
function setLanguage(mode) {
  const activeMode = mode === "th" ? "th" : "en";
  document.documentElement.dataset.langMode = activeMode;
  document.documentElement.lang = activeMode;
  $$("[data-lang-set]").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.langSet === activeMode));
  });
  try {
    localStorage.setItem("nakharax_lang", activeMode);
  } catch (e) {}
}

const savedLang = (() => {
  try {
    return localStorage.getItem("nakharax_lang");
  } catch (e) {
    return null;
  }
})() || "en";

setLanguage(savedLang);

$$("[data-lang-set]").forEach((btn) => {
  btn.addEventListener("click", () => {
    setLanguage(btn.dataset.langSet);
  });
});

// Ecosystem Missions Data & Synchronized Solar Radar
const missionOrder = ["xpfirm", "protocol", "hermes"];
let currentMissionIdx = 0;

const missions = {
  xpfirm: {
    index: "01 / 03",
    badge: "EARTH ORBIT // ACTIVE DIRECTION",
    coords: [465, 105],
    tag: "01 / TRADER WORKSPACE",
    title: "XpFirm",
    description:
      "A Trader Risk & Discipline Workspace. Designed around preparation, risk awareness, and consistent decision-making — not the promise of returns.",
    th: "พื้นที่ทำงานเพื่อการบริหารความเสี่ยงและวินัยสำหรับเทรดเดอร์ ออกแบบมาเพื่อการเตรียมตัว การประเมินความเสี่ยง และความสม่ำเสมอในการตัดสินใจ ไม่ใช่การสัญญาผลตอบแทน",
    detail:
      "Free Core Forever is the product direction. Business and ecosystem services support the wider vision.",
    focus: "Risk & Discipline",
    model: "Free Core Forever",
    gov: "Transparent Scope",
    link: "https://github.com/nakharax/nakharax-xpfirm",
    label: "View project on GitHub ↗",
    note: "Project direction · not a claim of public launch",
  },
  protocol: {
    index: "02 / 03",
    badge: "JUPITER ORBIT // RESERVED VECTOR",
    coords: [135, 305],
    tag: "02 / DISTINCT INITIATIVE",
    title: "NakharaX Protocol",
    description:
      "A separate initiative within the NakharaX universe. Distinct from XpFirm, with its own identity and development path.",
    th: "อีกหนึ่งภารกิจสำคัญในจักรวาล NakharaX ที่แยกอิสระจาก XpFirm โดยมีเอกลักษณ์และแนวทางการพัฒนาเฉพาะตัว",
    detail:
      "This preview reserves a dedicated orbit. Public scope, documentation, and product claims require approved project material.",
    focus: "Protocol Layer",
    model: "Dedicated Orbit",
    gov: "Approved Material Gate",
    link: "https://github.com/nakharax",
    label: "Explore NakharaX on GitHub ↗",
    note: "Dedicated project destination pending confirmation",
  },
  hermes: {
    index: "03 / 03",
    badge: "SATURN ORBIT // INTERNAL OPS",
    coords: [460, 385],
    tag: "03 / INTERNAL COMPANY OPERATIONS",
    title: "AI Workforce",
    description:
      "Hermes coordinates a specialist AI workforce under human direction. A shared operating layer for focused work, clear responsibilities, and verified delivery.",
    th: "Hermes ประสานงานทีม AI เฉพาะทางภายใต้การนำของมนุษย์ เป็นชั้นปฏิบัติการร่วมที่เน้นความชัดเจนของหน้าที่และผลงานที่ตรวจสอบได้",
    detail:
      "Internal company operations. No customer trading authority. This visual map does not expose internal services or represent live agent status.",
    focus: "Human-Led AI Ops",
    model: "Internal Operations",
    gov: "No Trading Authority",
    link: "#intelligence",
    label: "Our approach to intelligence ↓",
    note: "Conceptual architecture · no live telemetry",
  },
};

function activateMission(key) {
  const m = missions[key];
  if (!m) return;
  currentMissionIdx = missionOrder.indexOf(key);
  activePlanetIdx = currentMissionIdx;

  $$("[data-mission]").forEach((n) => {
    const on = n.dataset.mission === key;
    n.classList.toggle("active", on);
    n.setAttribute("aria-pressed", String(on));
  });

  $("#mission-tag").textContent = m.tag;
  $("#mission-title").replaceChildren(
    document.createTextNode(m.title),
    Object.assign(document.createElement("span"), { textContent: "↗" }),
  );
  $("#mission-description").textContent = m.description;
  if ($("#mission-th")) $("#mission-th").textContent = m.th;
  $("#mission-detail").textContent = m.detail;
  if ($("#mission-meta-focus")) $("#mission-meta-focus").textContent = m.focus;
  if ($("#mission-meta-model")) $("#mission-meta-model").textContent = m.model;
  if ($("#mission-meta-gov")) $("#mission-meta-gov").textContent = m.gov;
  if ($("#mission-orbit-badge")) $("#mission-orbit-badge").textContent = m.badge;
  if ($("#mission-counter")) $("#mission-counter").textContent = m.index;

  $("#mission-link").href = m.link;
  $("#mission-link").textContent = m.label;
  $("#mission-link").target = m.link.startsWith("#") ? "_self" : "_blank";
  $("#mission-note").textContent = m.note;

  const beam = $("#orbit-beam");
  const pulse = $("#orbit-target-pulse");
  if (beam && m.coords) {
    beam.setAttribute("x2", String(m.coords[0]));
    beam.setAttribute("y2", String(m.coords[1]));
  }
  if (pulse && m.coords) {
    pulse.setAttribute("cx", String(m.coords[0]));
    pulse.setAttribute("cy", String(m.coords[1]));
  }
  if (paused) renderAt(clock);
}

$$("[data-mission]").forEach((b) => {
  b.addEventListener("click", () => activateMission(b.dataset.mission));
});

$$("[data-quick-mission]").forEach((chip) => {
  chip.addEventListener("click", () => {
    activateMission(chip.dataset.quickMission);
  });
});

const prevBtn = $("#mission-prev");
const nextBtn = $("#mission-next");
if (prevBtn && nextBtn) {
  prevBtn.addEventListener("click", () => {
    const nextIdx = (currentMissionIdx - 1 + missionOrder.length) % missionOrder.length;
    activateMission(missionOrder[nextIdx]);
  });
  nextBtn.addEventListener("click", () => {
    const nextIdx = (currentMissionIdx + 1) % missionOrder.length;
    activateMission(missionOrder[nextIdx]);
  });
}

// Section 03: Interactive 4-Stage Hermes Governance Pipeline Inspector
const stages = {
  intent: {
    code: "STAGE 01 / HUMAN GOVERNANCE",
    boundary: "ACCOUNTABILITY: HUMAN OPERATOR",
    title: "Human Intent & Explicit Boundaries",
    desc: "Every operation originates from explicit human intent. Leadership and domain operators define the mission objective, ethical guardrails, and strict operational scope before any task enters orchestration.",
    th: "ทุกภารกิจเริ่มต้นจากความตั้งใจของมนุษย์ ผู้ดูแลระบบกำหนดวัตถุประสงค์ ขอบเขตการทำงาน และเกณฑ์ความปลอดภัยอย่างชัดเจนก่อนส่งต่อให้ระบบ",
    humanRole: "Defines objective, scope & risk limits",
    aiRole: "Validates context & readiness",
    gate: "Zero unapproved autonomous action",
  },
  orchestration: {
    code: "STAGE 02 / HERMES ROUTING LAYER",
    boundary: "SCOPE: INTERNAL OPERATIONS ONLY",
    title: "Hermes Orchestration & Role Assignment",
    desc: "Hermes decomposes approved objectives into structured workflows, routing tasks to specialist AI units with explicit context boundaries and zero unauthorized external execution.",
    th: "Hermes แยกย่อยเป้าหมายที่ได้รับอนุมัติออกเป็นขั้นตอนการทำงานที่ชัดเจน และมอบหมายให้ AI เฉพาะทางภายใต้ขอบเขตสิทธิ์ที่กำหนดไว้เท่านั้น",
    humanRole: "Approves workflow decomposition",
    aiRole: "Routes tasks to scoped specialists",
    gate: "Strict role & permission isolation",
  },
  workforce: {
    code: "STAGE 03 / SCOPED EXECUTION",
    boundary: "AUTHORITY: NO CUSTOMER TRADING",
    title: "Specialist AI Workforce Execution",
    desc: "Focused AI specialists accelerate engineering, research, documentation, and synthesis within isolated workspaces — amplifying human capability while never assuming autonomous customer trading authority.",
    th: "ทีม AI เฉพาะทางช่วยเร่งงานวิศวกรรม การค้นคว้า และการสังเคราะห์ข้อมูลในสภาพแวดล้อมที่ปลอดภัย โดยไม่มีสิทธิ์ตัดสินใจเทรดแทนลูกค้าโดยพลการ",
    humanRole: "Monitors execution & exceptions",
    aiRole: "Executes engineering & analysis tasks",
    gate: "No customer trading authority",
  },
  verified: {
    code: "STAGE 04 / QUALITY & AUDIT GATE",
    boundary: "SIGN-OFF: HUMAN JUDGMENT AT THE HELM",
    title: "Verified Work & Accountable Delivery",
    desc: "Outputs pass through deterministic checks and human review before integration. AI provides the leverage; human judgment retains final sign-off and accountability.",
    th: "ผลลัพธ์ทุกชิ้นต้องผ่านการตรวจสอบคุณภาพและการอนุมัติขั้นสุดท้ายโดยมนุษย์เสมอ เพื่อให้มั่นใจว่าผลงานถูกต้องและตรวจสอบได้",
    humanRole: "Final review, sign-off & accountability",
    aiRole: "Runs deterministic verification checks",
    gate: "Mandatory human sign-off required",
  },
};

$$("[data-stage]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.stage;
    const st = stages[key];
    if (!st) return;
    $$("[data-stage]").forEach((b) => {
      const active = b === btn;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", String(active));
    });
    $("#stage-code").textContent = st.code;
    $("#stage-boundary").textContent = st.boundary;
    $("#stage-title").textContent = st.title;
    $("#stage-desc").textContent = st.desc;
    if ($("#stage-th")) $("#stage-th").textContent = st.th;
    if ($("#stage-human-role")) $("#stage-human-role").textContent = st.humanRole;
    if ($("#stage-ai-role")) $("#stage-ai-role").textContent = st.aiRole;
    if ($("#stage-gate")) $("#stage-gate").textContent = st.gate;
  });
});

// Pause the existing 3D scene while the independent launch-film player is open.
const dialog = $("#film");
let beforeFilm = paused;

dialog.addEventListener("nx:film-open", () => {
  beforeFilm = paused;
  paused = true;
  motionState();
});

function restoreSceneAfterFilm() {
  paused = beforeFilm;
  motionState();
}
dialog.addEventListener("cancel", restoreSceneAfterFilm);
dialog.addEventListener("close", restoreSceneAfterFilm);
