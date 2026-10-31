// Promethia Quest - original game code. three.js (MIT) bundled in assets/.
import * as THREE from './assets/three.module.min.js';

const CFG = window.PQ_CONFIG || {};
const QS = new URLSearchParams(location.search);
const TEST = QS.get('test') === '1';
const DEBUG = TEST || QS.get('debug') === '1';
const $ = s => document.querySelector(s);
const ARCHIVE_KEY = 'pq_archive', QUALITY_KEY = 'pq_quality', SOUND_KEY = 'pq_sound';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = () => performance.now() / 1000;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; };
const words = s => (s || '').trim().split(/\s+/).filter(w => /[a-z0-9]/i.test(w)).length;

/* ================= AUDIO ================= */
const Sound = {
  ctx: null, on: localStorage.getItem(SOUND_KEY) !== 'off', master: null, musicGain: null, musicTimer: null, mode: 'calm', step: 0,
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    this.master = this.ctx.createGain(); this.master.gain.value = this.on ? 0.5 : 0; this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.16; this.musicGain.connect(this.master);
    this.startMusic();
  },
  toggle() { this.on = !this.on; localStorage.setItem(SOUND_KEY, this.on ? 'on' : 'off'); if (this.master) this.master.gain.value = this.on ? 0.5 : 0; return this.on; },
  tone(f, d = 0.12, type = 'square', v = 0.25, t0 = 0, slide = 0, dest) {
    const c = this.ctx; if (!c) return; const t = c.currentTime + t0;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(dest || this.master); o.start(t); o.stop(t + d + 0.02);
  },
  noise(d = 0.3, v = 0.3, freq = 800, t0 = 0, q = 1) {
    const c = this.ctx; if (!c) return; const t = c.currentTime + t0;
    const b = c.createBuffer(1, Math.floor(c.sampleRate * d), c.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
    const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.value = v; s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
  },
  sfx(name) {
    if (!this.ctx) return;
    const T = (...a) => this.tone(...a);
    switch (name) {
      case 'step': T(220 + Math.random() * 40, 0.04, 'triangle', 0.06); break;
      case 'bump': T(120, 0.08, 'square', 0.12, 0, -40); break;
      case 'collect': [660, 880, 1320].forEach((f, i) => T(f, 0.12, 'square', 0.15, i * 0.06)); break;
      case 'star': [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => T(f, 0.18, 'triangle', 0.2, i * 0.07)); this.noise(0.6, 0.05, 6000, 0.1); break;
      case 'good': [523, 784].forEach((f, i) => T(f, 0.15, 'square', 0.15, i * 0.08)); break;
      case 'wrong': T(180, 0.25, 'sawtooth', 0.12, 0, -80); T(150, 0.3, 'square', 0.08, 0.1, -60); break;
      case 'crumble': this.noise(0.5, 0.35, 900); T(90, 0.3, 'square', 0.1, 0, -40); break;
      case 'splash': this.noise(0.6, 0.3, 2500); break;
      case 'gate': T(110, 0.5, 'sawtooth', 0.08, 0, 60); this.noise(0.5, 0.15, 400); [392, 523, 659].forEach((f, i) => T(f, 0.2, 'triangle', 0.15, 0.3 + i * 0.08)); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => T(f, 0.22, 'square', 0.16, i * 0.11)); T(1047, 0.6, 'triangle', 0.2, 0.45); [1319, 1568].forEach((f, i) => T(f, 0.4, 'triangle', 0.12, 0.55 + i * 0.1)); break;
      case 'push': this.noise(0.15, 0.2, 500); break;
      case 'place': T(300 + Math.random() * 200, 0.06, 'square', 0.12); this.noise(0.05, 0.1, 3000); break;
      case 'slam': this.noise(0.8, 0.6, 300); T(80, 0.6, 'sine', 0.4, 0, -50); break;
      case 'warn': T(440, 0.12, 'square', 0.08); T(440, 0.12, 'square', 0.08, 0.25); break;
      case 'hit': T(900, 0.3, 'sawtooth', 0.15, 0, -700); this.noise(0.4, 0.3, 1500); break;
      case 'hurt': T(300, 0.3, 'square', 0.15, 0, -200); break;
      case 'fire': T(200, 0.4, 'sawtooth', 0.1, 0, 600); this.noise(0.4, 0.2, 2000); break;
      case 'cheer': for (let i = 0; i < 6; i++) this.noise(0.25, 0.12, 1500 + Math.random() * 2000, i * 0.08); [784, 988, 1175].forEach((f, i) => T(f, 0.2, 'triangle', 0.12, i * 0.1)); break;
      case 'click': T(700, 0.04, 'square', 0.08); break;
      case 'boom': this.noise(1.2, 0.6, 600); T(60, 1, 'sine', 0.5, 0, -30); break;
    }
  },
  setMode(m) { this.mode = m; },
  startMusic() {
    const calm = [0, 2, 4, 7, 9, 12, 9, 7], bossS = [0, 3, 5, 7, 10, 7, 5, 3];
    const tick = () => {
      if (!this.ctx) return;
      const boss = this.mode === 'boss', root = boss ? 147 : 196, sc = boss ? bossS : calm, s = this.step++;
      const st = (n) => root * Math.pow(2, n / 12);
      const beat = boss ? 0.16 : 0.24;
      if (this.mode !== 'off') {
        if (s % 2 === 0) this.tone(st(sc[(s / 2) % 8 | 0] + (Math.floor(s / 16) % 2 ? 5 : 0)), beat * 1.6, 'triangle', 0.5, 0, 0, this.musicGain);
        if (s % 8 === 0) this.tone(st(-12 + (Math.floor(s / 16) % 2 ? 5 : 0)), beat * 6, 'sine', 0.7, 0, 0, this.musicGain);
        if (boss && s % 4 === 2) this.noise(0.05, 0.15, 4000);
        if (!boss && s % 16 === 12 && Math.random() < 0.6) this.tone(st(sc[Math.random() * 8 | 0] + 12), 0.3, 'sine', 0.25, 0, 0, this.musicGain);
      }
      this.musicTimer = setTimeout(tick, beat * 1000);
    };
    tick();
  }
};

/* ================= RENDERER ================= */
const canvas = $('#c');
let quality = localStorage.getItem(QUALITY_KEY) || 'high';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', powerPreference: 'default' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const SKY = new THREE.Color('#8fd3ff');
scene.background = SKY; scene.fog = new THREE.Fog(SKY, 30, 70);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
const hemi = new THREE.HemisphereLight('#dff3ff', '#6b5a3a', 1.1); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1d6', 2.2); sun.position.set(-8, 16, 10);
sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
scene.add(sun); scene.add(sun.target);
function applyQuality() {
  const hi = quality === 'high';
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? 1.5 : 1));
  renderer.shadowMap.enabled = hi; sun.castShadow = hi;
  scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  $('#btnQuality').textContent = hi ? '✨' : '⚡';
  $('#btnQuality').title = hi ? 'Graphics: High (tap for Fast)' : 'Graphics: Fast (tap for High)';
  resize();
}
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); fitCamera();
}
addEventListener('resize', resize);

/* ================= TEXTURES ================= */
function pixTex(draw, size = 16) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function speckle(base, cols, density = 1) {
  return (g, s) => { g.fillStyle = base; g.fillRect(0, 0, s, s); for (let i = 0; i < s * s * 0.5 * density; i++) { g.fillStyle = pick(cols); g.fillRect(Math.random() * s | 0, Math.random() * s | 0, 1, 1); } };
}
const TEX = {
  grassTop: pixTex(speckle('#5fb34a', ['#4f9e3d', '#6fc456', '#58a845', '#7ccf5f'])),
  grassSide: pixTex((g, s) => { speckle('#8a5a36', ['#7a4e2e', '#9a6a42', '#6e4428'])(g, s); g.fillStyle = '#5fb34a'; g.fillRect(0, 0, s, 4); for (let x = 0; x < s; x++) if (Math.random() < 0.5) { g.fillStyle = '#4f9e3d'; g.fillRect(x, 4, 1, 1 + (Math.random() * 2 | 0)); } }),
  dirt: pixTex(speckle('#8a5a36', ['#7a4e2e', '#9a6a42', '#6e4428'])),
  stone: pixTex(speckle('#9aa0a8', ['#8a9098', '#a8aeb6', '#7f858d'])),
  brick: pixTex((g, s) => { g.fillStyle = '#7c8594'; g.fillRect(0, 0, s, s); g.fillStyle = '#5c6474'; for (let y = 0; y < s; y += 4) { g.fillRect(0, y, s, 1); const o = (y / 4) % 2 ? 4 : 0; for (let x = o; x < s; x += 8) g.fillRect(x, y, 1, 4); } for (let i = 0; i < 40; i++) { g.fillStyle = pick(['#8a93a2', '#6f7888']); g.fillRect(Math.random() * s | 0, Math.random() * s | 0, 1, 1); } }),
  plank: pixTex((g, s) => { g.fillStyle = '#b5834c'; g.fillRect(0, 0, s, s); g.fillStyle = '#8f6236'; for (let y = 0; y < s; y += 4) g.fillRect(0, y, s, 1); for (let i = 0; i < 30; i++) { g.fillStyle = pick(['#c4935a', '#a3743f']); g.fillRect(Math.random() * s | 0, Math.random() * s | 0, 2, 1); } }),
  leaves: pixTex(speckle('#3f8f35', ['#2f7a28', '#56a845', '#347f2c', '#2a6a22'], 1.4)),
  log: pixTex((g, s) => { g.fillStyle = '#6e4a2a'; g.fillRect(0, 0, s, s); g.fillStyle = '#5a3a20'; for (let x = 1; x < s; x += 3) g.fillRect(x, 0, 1, s); }),
  crate: pixTex((g, s) => { g.fillStyle = '#c08a4a'; g.fillRect(0, 0, s, s); g.fillStyle = '#7a5228'; g.fillRect(0, 0, s, 2); g.fillRect(0, s - 2, s, 2); g.fillRect(0, 0, 2, s); g.fillRect(s - 2, 0, 2, s); for (let i = 0; i < s; i++) g.fillRect(i, i, 2, 1); }),
  plate: pixTex((g, s) => { g.fillStyle = '#d9a23a'; g.fillRect(0, 0, s, s); g.fillStyle = '#8f6a1e'; g.strokeStyle = '#8f6a1e'; g.lineWidth = 2; g.strokeRect(2, 2, s - 4, s - 4); g.fillRect(6, 6, 4, 4); }),
  pad: pixTex((g, s) => { g.fillStyle = '#2b3d6b'; g.fillRect(0, 0, s, s); g.fillStyle = '#f26b21'; g.fillRect(1, 1, s - 2, 1); g.fillRect(1, s - 2, s - 2, 1); g.fillRect(1, 1, 1, s - 2); g.fillRect(s - 2, 1, 1, s - 2); g.fillStyle = '#ffb27f'; g.fillRect(7, 7, 2, 2); }),
  dark: pixTex(speckle('#3a3550', ['#2c2840', '#48425f', '#25223a'])),
};
const TEXdraw = { brick: (g, s) => { g.fillStyle = '#7c8594'; g.fillRect(0, 0, s, s); g.fillStyle = '#5c6474'; for (let y = 0; y < s; y += 4) { g.fillRect(0, y, s, 1); const o = (y / 4) % 2 ? 4 : 0; for (let x = o; x < s; x += 8) g.fillRect(x, y, 1, 4); } } };
TEX.cracked = pixTex((g, s) => { TEXdraw.brick(g, s); g.fillStyle = '#20242c'; let x = 3, y = 0; for (let i = 0; i < 16; i++) { g.fillRect(x, y, 1, 1); x = Math.max(1, Math.min(14, x + pick([0, 1, -1]))); y++; } x = 12; y = 2; for (let i = 0; i < 9; i++) { g.fillRect(x, y, 1, 1); x -= pick([0, 1]); y++; } g.fillStyle = '#ffd36b'; g.fillRect(7, 6, 2, 2); g.fillRect(9, 9, 1, 1); });

const M = {};
const std = (o) => new THREE.MeshLambertMaterial(o);
M.grass = [std({ map: TEX.grassSide }), std({ map: TEX.grassSide }), std({ map: TEX.grassTop }), std({ map: TEX.dirt }), std({ map: TEX.grassSide }), std({ map: TEX.grassSide })];
M.dirt = std({ map: TEX.dirt }); M.stone = std({ map: TEX.stone }); M.brick = std({ map: TEX.brick }); M.plank = std({ map: TEX.plank });
M.leaves = std({ map: TEX.leaves }); M.log = std({ map: TEX.log }); M.crate = std({ map: TEX.crate }); M.cracked = std({ map: TEX.cracked });
M.plate = std({ map: TEX.plate, emissive: '#5a3a00', emissiveIntensity: 0.4 }); M.pad = std({ map: TEX.pad }); M.dark = std({ map: TEX.dark });
M.ember = new THREE.MeshBasicMaterial({ color: '#ffb02e' }); M.emberCore = new THREE.MeshBasicMaterial({ color: '#fff1a8' });
M.gold = std({ color: '#ffd23f', emissive: '#ff9d00', emissiveIntensity: 0.6 });
M.cloud = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.92 });
M.red = new THREE.MeshBasicMaterial({ color: '#ff2d2d', transparent: true, opacity: 0.55, depthWrite: false });
M.bars = std({ color: '#5a4a3a' });
const BOX = new THREE.BoxGeometry(1, 1, 1);

function emojiTex(ch, size = 128, bg) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.beginPath(); g.roundRect ? g.roundRect(4, 4, size - 8, size - 8, 22) : g.rect(4, 4, size - 8, size - 8); g.fill(); g.lineWidth = 6; g.strokeStyle = '#1a2a4f'; g.stroke(); }
  g.font = `${size * 0.66}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#1a2a4f'; g.fillText(ch, size / 2, size / 2 + size * 0.05);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function sprite(ch, scale = 1, bg) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(ch, 128, bg), depthWrite: false })); s.scale.set(scale, scale, 1); return s; }

/* ================= WORLD ================= */
let world = new THREE.Group(); scene.add(world);
const decor = new THREE.Group(); scene.add(decor);
let L = null;           // current level runtime
let grid = [];          // grid[z][x] = {t, ...}
let GW = 0, GH = 0;
const wx = x => x - (GW - 1) / 2, wz = z => z - (GH - 1) / 2;
const cell = (x, z) => (grid[z] && grid[z][x]) || null;
const anims = [];       // {t, dur, fn(k), done}
function tween(dur, fn, done) { const a = { t: 0, dur, fn, done }; anims.push(a); return a; }
const ease = k => 1 - Math.pow(1 - k, 3);

function batchBlocks(list) { // list of {m, x, y, z, s}
  const groups = new Map();
  list.forEach(b => { if (!groups.has(b.m)) groups.set(b.m, []); groups.get(b.m).push(b); });
  const dummy = new THREE.Object3D();
  groups.forEach((arr, m) => {
    const im = new THREE.InstancedMesh(BOX, M[m], arr.length);
    arr.forEach((b, i) => { dummy.position.set(b.x, b.y, b.z); dummy.scale.setScalar(b.s || 1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    im.castShadow = true; im.receiveShadow = true; world.add(im);
  });
}
function mesh(m, x, y, z, sx = 1, sy = 1, sz = 1, parent = world) {
  const o = new THREE.Mesh(BOX, typeof m === 'string' ? M[m] : m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = o.receiveShadow = true; parent.add(o); return o;
}
function tree(x, z, list, h = 3) {
  for (let y = 0; y < h; y++) list.push({ m: 'log', x, y: y + 0.5, z });
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (let dy = 0; dy < 2; dy++) if (!(dy === 1 && Math.abs(dx) + Math.abs(dz) === 2)) list.push({ m: 'leaves', x: x + dx, y: h + dy + 0.5, z: z + dz });
  list.push({ m: 'leaves', x, y: h + 2.5, z });
}
let torchFire = null, torchLight = null;
function buildDecor() {
  decor.clear();
  // clouds
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group(); const n = 3 + (Math.random() * 3 | 0);
    for (let j = 0; j < n; j++) { const c = new THREE.Mesh(BOX, M.cloud); c.scale.set(rnd(2, 4), 1, rnd(1.5, 3)); c.position.set(j * 1.8 - n, rnd(-0.3, 0.3), rnd(-0.8, 0.8)); g.add(c); }
    g.position.set(rnd(-40, 40), rnd(8, 16), rnd(-40, -5)); g.userData.v = rnd(0.2, 0.6); decor.add(g);
  }
  // distant floating islands
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group(); const r = rnd(1.5, 3) | 0;
    for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) if (x * x + z * z <= r * r + 1) { const top = new THREE.Mesh(BOX, M.grass); top.position.set(x, 0, z); g.add(top); for (let d = 1; d < r + 1 - Math.abs(x) * 0.5; d++) { const b = new THREE.Mesh(BOX, M.dirt); b.position.set(x, -d, z); g.add(b); } }
    g.position.set(rnd(-35, 35), rnd(-8, 4), rnd(-45, -20)); g.userData.bob = Math.random() * 6; decor.add(g);
  }
  // the Great Torch of Promethia on a far fort
  const fort = new THREE.Group();
  for (let x = -3; x <= 3; x++) for (let z = -2; z <= 2; z++) { const b = new THREE.Mesh(BOX, M.brick); b.position.set(x, 0, z); fort.add(b); if (Math.abs(x) === 3 || Math.abs(z) === 2) { for (let y = 1; y < 4; y++) { if (y === 3 && (x + z) % 2) continue; const w = new THREE.Mesh(BOX, M.brick); w.position.set(x, y, z); fort.add(w); } } }
  for (let y = 1; y < 7; y++) { const p = new THREE.Mesh(BOX, M.stone); p.position.set(0, y, 0); p.scale.set(0.8, 1, 0.8); fort.add(p); }
  const bowl = new THREE.Mesh(BOX, M.dark); bowl.position.set(0, 7.2, 0); bowl.scale.set(2, 0.6, 2); fort.add(bowl);
  torchFire = new THREE.Group(); torchFire.position.set(0, 8, 0); torchFire.visible = false; fort.add(torchFire);
  [['#ff7a1a', 1.6, 0], ['#ffb02e', 1.1, 0.5], ['#fff1a8', 0.6, 0.9]].forEach(([c, s, y]) => { const f = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: c })); f.scale.set(s, s * 1.3, s); f.position.y = y; torchFire.add(f); });
  torchLight = new THREE.PointLight('#ff8a2a', 0, 40); torchLight.position.set(0, 8.5, 0); fort.add(torchLight);
  fort.position.set(0, -2, -32); decor.add(fort); decor.userData.fort = fort;
}

function buildLevel(def) {
  scene.remove(world); world.traverse(o => { if (o.geometry && o.geometry !== BOX) o.geometry.dispose(); }); world = new THREE.Group(); scene.add(world);
  const map = def.map; GH = map.length; GW = map[0].length; grid = [];
  const list = [];
  for (let z = 0; z < GH; z++) {
    grid[z] = [];
    for (let x = 0; x < GW; x++) {
      const t = map[z][x] || ' '; const c = { t, x, z }; grid[z][x] = c;
      const X = wx(x), Z = wz(z);
      if (t === ' ') continue;
      const floorM = def.floor === 'stone' ? 'stone' : def.floor === 'plank' ? 'plank' : def.floor === 'dark' ? 'dark' : 'grass';
      if (t !== 'z') list.push({ m: floorM, x: X, y: -0.5, z: Z });
      list.push({ m: 'dirt', x: X, y: -1.5, z: Z });
      if (Math.random() < 0.5) list.push({ m: 'dirt', x: X, y: -2.5, z: Z });
      if (t === '#') { list.push({ m: 'brick', x: X, y: 0.5, z: Z }); if (z === 0) list.push({ m: 'brick', x: X, y: 1.5, z: Z }); }
    }
  }
  // grassy rim + trees around the island
  const occ = new Set(); for (let z = 0; z < GH; z++) for (let x = 0; x < GW; x++) occ.add(x + ',' + z);
  for (let z = -3; z < GH + 2; z++) for (let x = -3; x < GW + 3; x++) {
    if (occ.has(x + ',' + z)) continue; const d = Math.max(-x, x - GW + 1, -z, z - GH + 1); if (d > 3 || (d === 3 && Math.random() < 0.6)) continue;
    if (z >= GH && d > 1) continue; // keep the front clear for the camera
    list.push({ m: 'grass', x: wx(x), y: -0.5, z: wz(z) }); list.push({ m: 'dirt', x: wx(x), y: -1.5, z: wz(z) });
    for (let k = 2; k < 5 - d; k++) list.push({ m: 'dirt', x: wx(x), y: -k - 0.5, z: wz(z) });
    if (z < GH - 1 && (x < -1 || x > GW) && Math.random() < 0.3) tree(wx(x), wz(z), list, 2 + (Math.random() * 2 | 0));
  }
  batchBlocks(list);
  // shadow camera bounds
  const ext = Math.max(GW, GH) / 2 + 4; Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 50 }); sun.shadow.camera.updateProjectionMatrix();
  sun.target.position.set(0, 0, 0);
  scene.background = new THREE.Color(def.sky || '#8fd3ff'); scene.fog.color = scene.background;
}

/* special tile objects */
function addEmber(c) {
  const g = new THREE.Group(); const a = new THREE.Mesh(BOX, M.ember); a.scale.setScalar(0.38); g.add(a); const b = new THREE.Mesh(BOX, M.emberCore); b.scale.setScalar(0.2); g.add(b);
  const fl = sprite('🔥', 0.55); fl.position.y = 0.35; g.add(fl); g.position.set(wx(c.x), 0.55, wz(c.z)); world.add(g); c.obj = g; c.ember = true; g.userData.spin = 1;
}
function addStar(c) {
  const s = sprite('⭐', 0.8); s.position.set(wx(c.x), 0.7, wz(c.z)); world.add(s); c.star = s;
}
function addBush(c) { const b = mesh('leaves', wx(c.x), 0.45, wz(c.z), 0.98, 0.9, 0.98); b.material = M.leaves.clone(); b.material.transparent = true; b.material.opacity = 0.9; c.bush = b; }
function addCracked(c) { c.crackObj = mesh('cracked', wx(c.x), 0.5, wz(c.z)); }
function addGate(c) {
  const g = new THREE.Group(); g.position.set(wx(c.x), 0, wz(c.z));
  for (let i = -1; i <= 1; i++) { const b = new THREE.Mesh(BOX, M.bars); b.scale.set(0.14, 1.8, 0.14); b.position.set(i * 0.3, 0.9, 0); b.castShadow = true; g.add(b); }
  const top = new THREE.Mesh(BOX, M.bars); top.scale.set(1, 0.16, 0.2); top.position.y = 1.75; g.add(top);
  const vertical = c.x === 0 || c.x === GW - 1; if (vertical) g.rotation.y = Math.PI / 2;
  [-0.6, 0.6].forEach(o => { const p = mesh('brick', 0, 1, 0, 0.25, 2, 0.4, g); p.position.set(o, 1, 0); });
  world.add(g); c.gate = g; c.open = false;
  const arrow = sprite('⬇️', 0.7); arrow.position.set(wx(c.x), 2.6, wz(c.z)); arrow.visible = false; world.add(arrow); c.arrow = arrow;
}
function openGate(silent) {
  for (const row of grid) for (const c of row) if (c.t === 'E' && !c.open) {
    c.open = true; if (!silent) Sound.sfx('gate');
    const g = c.gate; tween(0.8, k => { g.children.forEach((b, i) => { if (i < 4) b.position.y = (i < 3 ? 0.9 : 1.75) - 1.9 * ease(k); }); });
    c.arrow.visible = true;
  }
}

/* ================= PLAYER ================= */
const HEROES = [
  { id: 'blaze', name: 'Blaze', shirt: '#f26b21', pants: '#1a2a4f', hair: '#3a2414', skin: '#e9b48a' },
  { id: 'nova', name: 'Nova', shirt: '#1a2a4f', pants: '#2c2c3a', hair: '#ffd23f', skin: '#c98f65' },
  { id: 'jade', name: 'Jade', shirt: '#2fa86b', pants: '#5a3a20', hair: '#111111', skin: '#f1c9a5' },
  { id: 'ruby', name: 'Ruby', shirt: '#d63b5a', pants: '#3a2a5a', hair: '#7a3a10', skin: '#8d5a3b' },
];
const player = { g: new THREE.Group(), x: 0, z: 0, moving: false, queue: [], face: 0, parts: {}, hero: HEROES[0], walkT: 0 };
function buildPlayer(h) {
  const P = player.g; P.clear(); player.hero = h;
  const m = c => new THREE.MeshLambertMaterial({ color: c });
  const add = (mat, x, y, z, sx, sy, sz, par = P) => { const o = new THREE.Mesh(BOX, mat); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; par.add(o); return o; };
  const legL = new THREE.Group(); legL.position.set(-0.1, 0.36, 0); P.add(legL); add(m(h.pants), 0, -0.18, 0, 0.18, 0.36, 0.2, legL);
  const legR = new THREE.Group(); legR.position.set(0.1, 0.36, 0); P.add(legR); add(m(h.pants), 0, -0.18, 0, 0.18, 0.36, 0.2, legR);
  add(m(h.shirt), 0, 0.58, 0, 0.42, 0.46, 0.24);
  add(m('#ffd23f'), 0, 0.5, 0.125, 0.42, 0.06, 0.02);
  const armL = new THREE.Group(); armL.position.set(-0.28, 0.78, 0); P.add(armL); add(m(h.shirt), 0, -0.2, 0, 0.14, 0.42, 0.18, armL); add(m(h.skin), 0, -0.44, 0, 0.13, 0.08, 0.16, armL);
  const armR = new THREE.Group(); armR.position.set(0.28, 0.78, 0); P.add(armR); add(m(h.shirt), 0, -0.2, 0, 0.14, 0.42, 0.18, armR); add(m(h.skin), 0, -0.44, 0, 0.13, 0.08, 0.16, armR);
  const head = new THREE.Group(); head.position.set(0, 1.0, 0); P.add(head);
  add(m(h.skin), 0, 0, 0, 0.4, 0.4, 0.4, head); add(m(h.hair), 0, 0.17, -0.02, 0.42, 0.1, 0.44, head); add(m(h.hair), 0, 0.05, -0.19, 0.42, 0.3, 0.06, head);
  add(m('#ffffff'), -0.09, 0.02, 0.201, 0.1, 0.08, 0.01, head); add(m('#ffffff'), 0.09, 0.02, 0.201, 0.1, 0.08, 0.01, head);
  add(m('#1a2a4f'), -0.08, 0.02, 0.206, 0.05, 0.07, 0.01, head); add(m('#1a2a4f'), 0.1, 0.02, 0.206, 0.05, 0.07, 0.01, head);
  add(m('#a5410c'), 0, -0.1, 0.201, 0.12, 0.03, 0.01, head);
  player.parts = { legL, legR, armL, armR, head };
  scene.add(P);
}
// Promo the flame buddy (3D)
const promo3d = new THREE.Group();
{ [['#ff7a1a', 0.32, 0], ['#ffb02e', 0.22, 0.1], ['#fff1a8', 0.12, 0.17]].forEach(([c, s, y]) => { const f = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: c })); f.scale.set(s, s * 1.25, s); f.position.y = y; promo3d.add(f); });
  const e1 = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: '#1a2a4f' })); e1.scale.set(0.05, 0.07, 0.02); e1.position.set(-0.06, 0.04, 0.17); promo3d.add(e1); const e2 = e1.clone(); e2.position.x = 0.06; promo3d.add(e2); }
const promoLight = new THREE.PointLight('#ff9a3a', 1.5, 5); promo3d.add(promoLight); scene.add(promo3d);

function placePlayer(x, z) { player.x = x; player.z = z; player.g.position.set(wx(x), 0, wz(z)); player.queue = []; player.moving = false; player.g.visible = true; }
function isSolid(c) {
  if (!c) return true; const t = c.t;
  if (t === ' ' || t === '#' || t === 'x' || t === 'w') return true;
  if (t === 'E') return !c.open;
  if (c.crate) return true;
  if (L && L.def.solid && L.def.solid(c)) return true;
  return false;
}
function isTrigger(c) { return !!(c && (c.trigger || (L && L.def.trigger && L.def.trigger(c)))); }
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function tryStep(dx, dz) {
  if (player.moving || !L || L.locked) return false;
  const nx = player.x + dx, nz = player.z + dz, c = cell(nx, nz);
  player.face = Math.atan2(dx, dz);
  if (c && c.t === 'x') { breakCrack(c); return false; }
  if (c && c.crate) {
    const b = cell(nx + dx, nz + dz);
    if (b && !isSolid(b) && !isTrigger(b) && b.t !== 'E' && !b.star) { moveCrate(c, b); }
    else { bump(); return false; }
  } else if (isSolid(c)) { bump(); if (L.def.onBump) L.def.onBump(c); return false; }
  player.moving = true; const fx = wx(player.x), fz = wz(player.z); player.x = nx; player.z = nz;
  Sound.sfx('step'); L.rec.steps++;
  tween(0.15, k => { player.g.position.x = fx + (wx(nx) - fx) * k; player.g.position.z = fz + (wz(nz) - fz) * k; player.g.position.y = Math.sin(k * Math.PI) * 0.12; }, () => { player.moving = false; arrive(c); });
  return true;
}
function bump() { Sound.sfx('bump'); const g = player.g; const ox = g.position.x, oz = g.position.z; const dx = Math.sin(player.face) * 0.15, dz = Math.cos(player.face) * 0.15; tween(0.16, k => { const s = Math.sin(k * Math.PI); g.position.x = ox + dx * s; g.position.z = oz + dz * s; }); player.queue = []; }
function arrive(c) {
  if (c.ember) { c.ember = false; world.remove(c.obj); burst(c.obj.position, '#ffb02e', 14); Sound.sfx('collect'); S.embers++; L.rec.embers++; hud(); if (L.onEmber) L.onEmber(); }
  if (c.star) { const p = c.star.position.clone(); world.remove(c.star); c.star = null; burst(p, '#ffd23f', 30); Sound.sfx('star'); S.stars++; L.rec.stars++; L.rec.explore++; hud(); showBanner('⭐ Secret star!', 1100); }
  if (c.bush && !c.bushSeen) { c.bushSeen = true; L.rec.explore++; burst(c.bush.position, '#56a845', 8); }
  if (c.t === 'E' && c.open) { completeLevel(); return; }
  if (L.def.onEnter) L.def.onEnter(c);
}
function breakCrack(c) {
  Sound.sfx('crumble'); burst(c.crackObj.position, '#7c8594', 20); world.remove(c.crackObj); c.t = '.'; L.rec.explore++;
  addStar(c); shake(0.15);
}
function moveCrate(c, b) {
  const o = c.crate; c.crate = null; b.crate = o; Sound.sfx('push'); const fx = o.position.x, fz = o.position.z;
  tween(0.15, k => { o.position.x = fx + (wx(b.x) - fx) * k; o.position.z = fz + (wz(b.z) - fz) * k; }, () => L.def.onCrate && L.def.onCrate());
}

/* path finding for tap-to-walk */
function findPath(tx, tz) {
  const key = (x, z) => x + ',' + z; const start = key(player.x, player.z), goal = key(tx, tz);
  const prev = new Map([[start, null]]); const q = [[player.x, player.z]];
  while (q.length) {
    const [x, z] = q.shift(); if (key(x, z) === goal) break;
    for (const [dx, dz] of Object.values(DIRS)) {
      const nx = x + dx, nz = z + dz, k = key(nx, nz); if (prev.has(k)) continue; const c = cell(nx, nz);
      if (!c || isSolid(c)) continue; if (k !== goal && (isTrigger(c) || (c.t === 'E'))) continue;
      prev.set(k, [x, z]); q.push([nx, nz]);
    }
  }
  if (!prev.has(goal)) return null;
  const path = []; let cur = [tx, tz]; while (cur && key(cur[0], cur[1]) !== start) { path.unshift(cur); cur = prev.get(key(cur[0], cur[1])); }
  return path;
}

/* particles */
const parts = []; const PGEO = new THREE.BoxGeometry(0.12, 0.12, 0.12);
function burst(pos, color, n = 12, speed = 3) {
  const mat = new THREE.MeshBasicMaterial({ color });
  for (let i = 0; i < n; i++) { const p = new THREE.Mesh(PGEO, mat); p.position.copy(pos); p.userData = { v: new THREE.Vector3(rnd(-1, 1) * speed, rnd(1, 2.5) * speed, rnd(-1, 1) * speed), life: rnd(0.6, 1.1) }; scene.add(p); parts.push(p); }
}
function confetti(n = 60) { const cols = ['#f26b21', '#ffd23f', '#1a2a4f', '#2fa86b', '#ff4f8b', '#4fc3ff']; for (let i = 0; i < n / 6; i++) burst(new THREE.Vector3(player.g.position.x + rnd(-2, 2), 2, player.g.position.z + rnd(-2, 2)), pick(cols), 6, 2.2); }
let shakeAmt = 0; function shake(a) { shakeAmt = Math.max(shakeAmt, a); }

/* camera */
const camTarget = new THREE.Vector3(); let camDist = 12;
function fitCamera() {
  if (!GW) return; const asp = camera.aspect, fov = THREE.MathUtils.degToRad(camera.fov);
  const halfW = GW / 2 + 0.8, halfH = GH / 2 + 1.2 + ((L && L.def.camZ) ? 1.5 : 0);
  const dW = halfW / (Math.tan(fov / 2) * asp), dH = halfH * 1.25 / Math.tan(fov / 2);
  camDist = Math.max(dW, dH, 8) * (asp < 0.8 ? 1.0 : 1.05);
  camTarget.set(0, 0, 0.6 + (asp < 0.8 ? 0.6 : 0) + ((L && L.def.camZ) || 0));
}
function updateCamera(dt) {
  const dir = new THREE.Vector3(0, 0.78, 0.62).normalize();
  const want = camTarget.clone().addScaledVector(dir, camDist);
  camera.position.lerp(want, Math.min(1, dt * 4));
  if (shakeAmt > 0) { camera.position.x += rnd(-1, 1) * shakeAmt; camera.position.y += rnd(-1, 1) * shakeAmt; shakeAmt = Math.max(0, shakeAmt - dt * 1.5); }
  camera.lookAt(camTarget);
}

/* ================= STATE + UI ================= */
const S = { student: null, hero: null, startedAt: null, idx: 0, embers: 0, stars: 0, levels: [], build: null, speech: null, boss: null, promoTaps: 0 };
let promoTimer = null;
function say(text, ms) { const p = $('#promo'); p.classList.remove('hidden'); $('#promoText').innerHTML = text; clearTimeout(promoTimer); if (ms) promoTimer = setTimeout(() => L && L.goalText && ($('#promoText').innerHTML = L.goalText), ms); }
function hud() {
  $('#embers').textContent = S.embers; $('#stars').textContent = S.stars;
  const pr = $('#progress'); pr.innerHTML = LEVELS.map((l, i) => `<i class="${i < S.idx ? 'done' : i === S.idx ? 'now' : ''}" title="${l.name}"></i>`).join('');
}
function showBanner(t, ms = 1400) { $('#bannerText').innerHTML = t; $('#banner').classList.remove('hidden'); const b = $('#bannerText'); b.style.animation = 'none'; b.offsetHeight; b.style.animation = ''; return new Promise(r => setTimeout(() => { $('#banner').classList.add('hidden'); r(); }, ms)); }
function modal(html, bind) {
  return new Promise(res => { $('#modalCard').innerHTML = html; $('#modal').classList.remove('hidden'); if (L) L.locked = true; bind($('#modalCard'), v => { $('#modal').classList.add('hidden'); if (L) L.locked = false; res(v); }); });
}
function fade(on) { $('#fade').classList.toggle('on', on); return sleep(380); }
function show(id, on = true) { $(id).classList.toggle('hidden', !on); }

/* ================= LEVEL FLOW ================= */
function newRec(def) { return { id: def.id, name: def.name, skill: def.skill, t0: now(), time: 0, attempts: 1, fails: 0, hints: 0, stars: 0, explore: 0, embers: 0, steps: 0, completed: false, skipped: false, firstTry: true, extra: {} }; }
async function startLevel(i) {
  S.idx = i; const def = LEVELS[i];
  await fade(true);
  ['#btnHint', '#btnSkip', '#btnReset', '#btnAct', '#buildBar', '#hearts'].forEach(s => show(s, false));
  L = { def, rec: newRec(def), locked: true, hintIdx: 0, goalText: def.goal, t: 0 };
  buildLevel(def);
  for (const row of grid) for (const c of row) {
    if (c.t === 'S') { c.t = '.'; L.start = [c.x, c.z]; }
    if (c.t === 'o') { c.t = '.'; addEmber(c); }
    if (c.t === '*') { c.t = '.'; addStar(c); }
    if (c.t === 'b') { addBush(c); }
    if (c.t === 'x') addCracked(c);
    if (c.t === 'E') addGate(c);
  }
  if (def.setup) def.setup(L);
  if (L.start) placePlayer(L.start[0], L.start[1]); else player.g.visible = false;
  Sound.setMode(def.music || 'calm');
  $('#lvlName').textContent = `${i + 1}. ${def.emoji} ${def.name}`; $('#lvlGoal').textContent = def.skillLabel || '';
  hud(); fitCamera(); camera.position.copy(camTarget.clone().add(new THREE.Vector3(0, camDist * 1.3, camDist * 0.3)));
  show('#hud'); show('#actions'); show('#dpad', isTouch && !def.noWalk);
  await fade(false);
  await showBanner(`<div style="font-size:.5em">Level ${i + 1}</div>${def.emoji} ${def.name}`, 1500);
  say(def.intro || def.goal);
  L.locked = false; L.rec.t0 = now();
  if (def.start) def.start(L);
}
function failLevel(msg) {
  if (!L) return; L.rec.fails++; L.rec.attempts++; L.rec.firstTry = false; Sound.sfx('wrong'); shake(0.12);
  say(msg || pick(['Oops! Try again. You can do it! 💪', 'Almost! Have another go 🔥', 'Nice try! Mistakes help us learn 🙂']), 3500);
}
async function completeLevel() {
  if (!L || L.done) return; L.done = true; L.locked = true; L.rec.completed = !L.rec.skipped; L.rec.time = Math.round(now() - L.rec.t0);
  if (L.rec.hints) L.rec.firstTry = false;
  if (L.def.cleanup) L.def.cleanup(L);
  S.levels[S.idx] = L.rec;
  if (!L.rec.skipped) { Sound.sfx('win'); confetti(70); await showBanner(pick(['Level clear! 🎉', 'Awesome! 🔥', 'You did it! ⭐', 'Brilliant! 🏆']), 1500); }
  if (S.idx + 1 < LEVELS.length) startLevel(S.idx + 1); else finishGame();
}
function getHints() { const h = L.def.hints; return (typeof h === 'function' ? h(L) : h) || []; }
function giveHint() {
  const h = getHints(); if (!h.length) return; L.rec.hints++; L.rec.firstTry = false; Sound.sfx('click');
  say('💡 ' + h[Math.min(L.hintIdx, h.length - 1)], 7000); L.hintIdx++;
}
async function skipLevel() {
  const ok = await modal(`<h2>Skip this level?</h2><p class="story-text">That's OK! You can move on.</p><button class="btn" data-v="0" style="background:#ddd;color:#1a2a4f">Keep trying</button> <button class="btn primary" data-v="1">Skip →</button>`, (el, done) => el.querySelectorAll('button').forEach(b => b.onclick = () => done(b.dataset.v === '1')));
  if (ok) { L.rec.skipped = true; completeLevel(); }
}
function checkHelpers() {
  if (!L || L.done) return; const t = now() - L.rec.t0, f = L.rec.fails;
  if (getHints().length && (t > (CFG.HINT_AFTER_SEC || 45) || f >= (CFG.HINT_AFTER_FAILS || 2))) show('#btnHint', true);
  if (!L.def.noSkip && (t > (CFG.SKIP_AFTER_SEC || 150) || f >= (CFG.SKIP_AFTER_FAILS || 4))) show('#btnSkip', true);
}

/* ================= INPUT ================= */
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const keys = new Set(); const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  Sound.init();
  if (KEYMAP[e.code]) { keys.add(KEYMAP[e.code]); player.queue = []; e.preventDefault(); }
  if (e.code === 'KeyR' && L && L.def.reset && !L.locked) L.def.reset(L, true);
  if (DEBUG && e.code === 'KeyN' && L) completeLevel();
});
addEventListener('keyup', e => { if (KEYMAP[e.code]) keys.delete(KEYMAP[e.code]); });
document.querySelectorAll('#dpad button').forEach(b => {
  const d = b.dataset.d; b.addEventListener('pointerdown', e => { e.preventDefault(); Sound.init(); keys.add(d); player.queue = []; });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => keys.delete(d)));
});
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let marker = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 20), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false })); marker.rotation.x = -Math.PI / 2; marker.visible = false; scene.add(marker);
canvas.addEventListener('pointerdown', e => {
  Sound.init(); if (!L || L.locked) return;
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  if (L.def.onPointer && L.def.onPointer(L, ray)) return;
  const p = new THREE.Vector3(); if (!ray.ray.intersectPlane(plane, p)) return;
  const gx = Math.round(p.x + (GW - 1) / 2), gz = Math.round(p.z + (GH - 1) / 2); const c = cell(gx, gz); if (!c) return;
  marker.position.set(wx(gx), 0.03, wz(gz)); marker.visible = true; marker.userData.t = 0.6;
  const dx = gx - player.x, dz = gz - player.z;
  if (Math.abs(dx) + Math.abs(dz) === 1) { player.queue = [[gx, gz]]; return; }
  if (c.t === 'x' || c.crate) { // walk next to it
    for (const [ax, az] of Object.values(DIRS)) { const n = cell(gx + ax, gz + az); if (n && !isSolid(n)) { const pth = findPath(gx + ax, gz + az); if (pth) { player.queue = pth.concat([[gx, gz]]); return; } } }
  }
  const path = findPath(gx, gz); if (path) player.queue = path; else Sound.sfx('bump');
});
$('#promo').style.pointerEvents = 'auto';
$('#promo').addEventListener('click', () => { S.promoTaps++; if (L) { if (S.promoTaps <= 3) L.rec.explore += 0; say(pick(['You\'re doing great! 🔥', 'I believe in you!', 'Look around. Secrets hide in cracked walls! 👀', 'Take your time. Think, then try!']), 2500); } Sound.sfx('click'); });
$('#btnHint').onclick = () => giveHint();
$('#btnSkip').onclick = () => skipLevel();
$('#btnReset').onclick = () => L && L.def.reset && L.def.reset(L, true);
$('#btnSound').onclick = () => { Sound.init(); const on = Sound.toggle(); $('#btnSound').textContent = on ? '🔊' : '🔇'; };
$('#btnSound').textContent = Sound.on ? '🔊' : '🔇';
$('#btnQuality').onclick = () => { quality = quality === 'high' ? 'low' : 'high'; localStorage.setItem(QUALITY_KEY, quality); applyQuality(); say(quality === 'high' ? 'Graphics: Pretty ✨' : 'Graphics: Fast ⚡', 1500); };

/* ================= MAIN LOOP ================= */
let last = performance.now(), fpsAcc = 0, fpsN = 0, lowAuto = false;
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  // auto-drop quality on slow PCs
  fpsAcc += dt; fpsN++; if (fpsAcc > 3) { const fps = fpsN / fpsAcc; if (fps < 24 && quality === 'high' && !lowAuto) { lowAuto = true; quality = 'low'; applyQuality(); } fpsAcc = 0; fpsN = 0; }
  for (let i = anims.length - 1; i >= 0; i--) { const a = anims[i]; a.t += dt; const k = Math.min(1, a.t / a.dur); a.fn(k); if (k >= 1) { anims.splice(i, 1); a.done && a.done(); } }
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i], u = p.userData; u.life -= dt; u.v.y -= 9 * dt; p.position.addScaledVector(u.v, dt); p.rotation.x += dt * 5; if (u.life <= 0 || p.position.y < -3) { scene.remove(p); parts.splice(i, 1); } }
  if (L && !L.locked && !L.def.noWalk && !player.moving && player.g.visible) {
    let moved = false;
    for (const d of ['up', 'down', 'left', 'right']) if (keys.has(d)) { tryStep(...DIRS[d]); moved = true; break; }
    if (!moved && player.queue.length) { const [nx, nz] = player.queue.shift(); if (!tryStep(nx - player.x, nz - player.z)) player.queue = []; }
  }
  // player anim
  const P = player.parts; if (P.legL) {
    player.walkT += dt * (player.moving ? 14 : 0); const s = player.moving ? Math.sin(player.walkT) * 0.6 : 0;
    P.legL.rotation.x = s; P.legR.rotation.x = -s; P.armL.rotation.x = -s; P.armR.rotation.x = s; P.head.position.y = 1.0 + Math.sin(t / 400) * 0.015;
    const cur = player.g.rotation.y; let d = player.face - cur; d = Math.atan2(Math.sin(d), Math.cos(d)); player.g.rotation.y = cur + d * Math.min(1, dt * 14);
  }
  // promo buddy follows
  if (player.g.visible) { const tp = player.g.position.clone().add(new THREE.Vector3(-0.6, 1.5 + Math.sin(t / 300) * 0.12, 0.3)); promo3d.position.lerp(tp, Math.min(1, dt * 5)); promo3d.visible = true; } else promo3d.visible = false;
  promo3d.rotation.y = Math.sin(t / 700) * 0.4; promoLight.intensity = quality === 'high' ? 1.2 + Math.sin(t / 90) * 0.2 : 0;
  // world spinners
  world.children.forEach(o => { if (o.userData.spin) { o.rotation.y += dt * 2; o.position.y = 0.55 + Math.sin(t / 300 + o.position.x) * 0.08; } });
  decor.children.forEach(o => { if (o.userData.v) { o.position.x += o.userData.v * dt; if (o.position.x > 45) o.position.x = -45; } if (o.userData.bob !== undefined) o.position.y += Math.sin(t / 1000 + o.userData.bob) * 0.003; });
  if (torchFire && torchFire.visible) { torchFire.children.forEach((f, i) => { f.rotation.y += dt * (1 + i); f.scale.y = (1.6 - i * 0.5) * 1.3 * (1 + Math.sin(t / 80 + i) * 0.08); }); }
  if (marker.visible) { marker.userData.t -= dt; marker.material.opacity = Math.max(0, marker.userData.t); if (marker.userData.t <= 0) marker.visible = false; }
  for (const row of grid) for (const c of row) if (c.arrow && c.arrow.visible) c.arrow.position.y = 2.5 + Math.sin(t / 200) * 0.15;
  if (L && L.def.update && !L.done) L.def.update(L, dt, t);
  if (L && !L.done && Math.floor(t / 1000) !== Math.floor((t - dt * 1000) / 1000)) checkHelpers();
  updateCamera(dt);
  renderer.render(scene, camera);
}

/* ================= LEVEL HELPERS ================= */
function addPad(c, color) {
  const p = mesh(color ? new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.15 }) : 'pad', wx(c.x), 0.04, wz(c.z), 0.86, 0.08, 0.86); c.padObj = p; c.trigger = true; return p;
}
function cubeStack(n, color = '#f26b21', size = 0.2) {
  const g = new THREE.Group(); const mat = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.25 });
  for (let i = 0; i < n; i++) { const b = new THREE.Mesh(BOX, mat); b.scale.setScalar(size * 0.92); b.position.y = i * size + size / 2; b.castShadow = true; g.add(b); }
  return g;
}
function numSprite(n, s = 0.55) { return sprite(String(n), s, '#fff6ec'); }
function blockyPerson(shirt, skin = '#e0b088', hair = '#333') {
  const g = new THREE.Group(); const m = c => new THREE.MeshLambertMaterial({ color: c });
  mesh(m('#2a3550'), -0.1, 0.18, 0, 0.18, 0.36, 0.2, g); mesh(m('#2a3550'), 0.1, 0.18, 0, 0.18, 0.36, 0.2, g);
  mesh(m(shirt), 0, 0.58, 0, 0.42, 0.46, 0.24, g); mesh(m(shirt), -0.28, 0.6, 0, 0.14, 0.42, 0.18, g); mesh(m(shirt), 0.28, 0.6, 0, 0.14, 0.42, 0.18, g);
  mesh(m(skin), 0, 1.0, 0, 0.4, 0.4, 0.4, g); mesh(m(hair), 0, 1.18, -0.02, 0.42, 0.1, 0.44, g); return g;
}
function bangSprite(x, z, y = 2.2) { const s = sprite('❗', 0.8); s.position.set(x, y, z); s.userData.bang = y; world.add(s); return s; }
function bob(t) { world.children.forEach(o => { if (o.userData.bang) o.position.y = o.userData.bang + Math.sin(t / 220) * 0.15; }); }
function backToStart(delay = 700) { L.locked = true; player.queue = []; setTimeout(() => { burst(player.g.position.clone().setY(0.5), '#ffffff', 10); placePlayer(L.start[0], L.start[1]); L.locked = false; }, delay); }

/* ================= LEVELS ================= */
const LEVELS = [
{
  id: 'L1', name: 'Ember Gate', emoji: '🔥', skill: 'tutorial', skillLabel: 'Warm-up',
  map: ['###########', '#S...o..#*#', '#.......#b#', '#..o......#', '#......o..E', '###########'],
  intro: 'Hi, I\'m Promo! 🔥 Walk with ⬅️⬆️⬇️➡️ / W A S D, or tap the ground.',
  goal: 'Grab the 3 glowing 🔥 embers!', hints: ['Look for the glowing orange blocks 🔥. Walk into them!'], noSkip: true,
  setup(L) { L.moved = false; L.onEmber = () => { const n = L.rec.embers; if (n >= 3) { openGate(); say('The gate is open! 🎉 Walk to the gate ➡️'); } else say(`Nice! 🔥 ${n} of 3`, 0); }; },
  onEnter(c) { if (!L.moved) { L.moved = true; say('Great walking! 👍 Now grab the 3 glowing 🔥 embers!'); } },
  update: (L, dt, t) => bob(t),
},
{
  id: 'L2', name: 'Color Stones', emoji: '🟧', skill: 'logic', skillLabel: 'Patterns',
  map: ['############', '#..zzzzz..x#', '#S.zzzzz...#', '#..zzzzz...E', '#..zzzzz.o.#', '############'],
  intro: 'Cross the river! Step 🟧 then 🟦 then 🟧… like the pattern up top ⬆️',
  goal: 'Follow the color pattern: 🟧 🟦 🟧 🟦 …',
  hints: ['Look at the colors floating above the wall ⬆️', 'Never step on the same color twice in a row!', 'Plan your path with your eyes first 👀, then walk.'],
  setup(L) {
    openGate(true); L.last = null;
    const path = { '3,1': 'O', '4,1': 'B', '4,2': 'O', '5,2': 'B', '5,3': 'O', '6,3': 'B', '7,3': 'O' };
    const fill = ['B', 'O', 'O', 'B', 'B', 'O', 'O', 'O', 'B', 'B', 'O', 'B', 'B'];
    let fi = 0; L.stones = [];
    const water = new THREE.Mesh(BOX, new THREE.MeshLambertMaterial({ color: '#2f8fe0', transparent: true, opacity: 0.8 })); water.scale.set(5, 0.1, 4); water.position.set(wx(5), -0.35, (wz(1) + wz(4)) / 2); world.add(water); L.water = water;
    for (const row of grid) for (const c of row) if (c.t === 'z') {
      c.col = path[c.x + ',' + c.z] || fill[fi++ % fill.length];
      const m = new THREE.MeshLambertMaterial({ color: c.col === 'O' ? '#f26b21' : '#3b82f6', emissive: c.col === 'O' ? '#f26b21' : '#3b82f6', emissiveIntensity: 0.1 });
      c.stone = mesh(m, wx(c.x), -0.15, wz(c.z), 0.86, 0.3, 0.86); L.stones.push(c);
    }
    ['O', 'B', 'O', 'B', 'O', 'B'].forEach((k, i) => { const b = mesh(new THREE.MeshLambertMaterial({ color: k === 'O' ? '#f26b21' : '#3b82f6', emissive: k === 'O' ? '#f26b21' : '#3b82f6', emissiveIntensity: 0.4 }), wx(3 + i * 0.9), 2.7, wz(0), 0.6, 0.6, 0.6); b.userData.float = i; L['ban' + i] = b; });
    const st = sprite('➡️', 0.6); st.position.set(wx(8.6), 2.7, wz(0)); world.add(st);
  },
  trigger: c => c.t === 'z',
  onEnter(c) {
    if (c.t !== 'z') { L.last = null; L.stones.forEach(s => s.stone.material.emissiveIntensity = 0.1); return; }
    const want = L.last == null ? 'O' : (L.last === 'O' ? 'B' : 'O');
    if (c.col === want) { L.last = c.col; c.stone.material.emissiveIntensity = 0.6; Sound.tone(c.col === 'O' ? 660 : 880, 0.1, 'triangle', 0.15); }
    else {
      L.locked = true; const s = c.stone; Sound.sfx('crumble');
      tween(0.5, k => { s.position.y = -0.15 - k * 1.5; s.rotation.z = k; player.g.position.y = -k * 0.8; }, () => { Sound.sfx('splash'); burst(new THREE.Vector3(s.position.x, 0, s.position.z), '#7cc4ff', 20); });
      failLevel('Splash! 💦 That stone broke the pattern. Try again!');
      setTimeout(() => { s.position.y = -0.15; s.rotation.z = 0; L.last = null; L.stones.forEach(q => q.stone.material.emissiveIntensity = 0.1); backToStart(0); }, 1100);
    }
  },
  update(L, dt, t) { for (let i = 0; i < 6; i++) { const b = L['ban' + i]; if (b) { b.position.y = 2.7 + Math.sin(t / 300 + i * 0.7) * 0.1; b.rotation.y += dt; } } },
},
{
  id: 'L3', name: 'Gearbot\'s Guess', emoji: '🤖', skill: 'ai', skillLabel: 'Basics of AI',
  map: ['###########', '#....G....#', '#.........#', '#.1.2.3.4.#', '#.........#', '#x...S..o.#', '#####E#####'],
  intro: 'Gearbot learns from examples, like an AI! 🤖 Look at the board ⬆️ and walk onto the pad that comes NEXT.',
  goal: 'Walk onto the pad that comes next ❓',
  hints: L => [L.round === 1 ? 'What color is each fruit? Match the new fruit the same way 🍋' : 'Count the blocks in each tower 🧱. How many more each time?', 'Gearbot finds the rule in the examples, then uses it. You can too!'],
  rounds: [
    { type: 'num', seq: [2, 4, 6], ans: 8, opts: [5, 8, 10, 7] },
    { type: 'sort', ex: [['🍎', '#e53935'], ['🍌', '#fdd835'], ['🥦', '#43a047']], q: '🍋', ans: '#fdd835', opts: ['#e53935', '#43a047', '#fdd835', '#3b82f6'] },
    { type: 'num', seq: [1, 3, 5], ans: 7, opts: [6, 9, 7, 8] },
  ],
  solid: c => c.t === 'G',
  setup(L) {
    L.round = 0; L.pads = []; L.disp = new THREE.Group(); world.add(L.disp);
    for (const row of grid) for (const c of row) {
      if (/[1-4]/.test(c.t)) { c.pad = +c.t; addPad(c); L.pads.push(c); }
      if (c.t === 'G') { const g = new THREE.Group(); const m = col => new THREE.MeshLambertMaterial({ color: col });
        mesh(m('#9aa7bd'), 0, 0.45, 0, 0.7, 0.7, 0.5, g); mesh(m('#1a2a4f'), 0, 0.5, 0.26, 0.5, 0.3, 0.02, g); mesh(new THREE.MeshBasicMaterial({ color: '#4fc3ff' }), -0.12, 0.52, 0.28, 0.1, 0.1, 0.02, g); mesh(new THREE.MeshBasicMaterial({ color: '#4fc3ff' }), 0.12, 0.52, 0.28, 0.1, 0.1, 0.02, g);
        mesh(m('#555'), 0, 0.95, 0, 0.06, 0.3, 0.06, g); mesh(M.gold, 0, 1.12, 0, 0.14, 0.14, 0.14, g); mesh(m('#7c8aa3'), -0.45, 0.45, 0, 0.16, 0.5, 0.16, g); mesh(m('#7c8aa3'), 0.45, 0.45, 0, 0.16, 0.5, 0.16, g);
        g.position.set(wx(c.x), 0, wz(c.z)); world.add(g); L.bot = g; }
    }
    LEVELS[2].showRound(L);
  },
  showRound(L) {
    const R = this.rounds[L.round]; L.disp.clear(); const z = wz(0) + 0.2; let y = 1.6;
    const board = mesh(M.dark, 0, 3.0, wz(0) - 0.1, 7.2, 2.0, 0.2, L.disp); y = 2.2;
    if (R.type === 'num') {
      R.seq.forEach((n, i) => { const s = cubeStack(n, '#f26b21', 0.16); s.position.set(-2.4 + i * 1.6, y, z); L.disp.add(s); const ns = numSprite(n, 0.45); ns.position.set(-2.4 + i * 1.6 + 0.45, y + 0.25, z + 0.1); L.disp.add(ns); });
      const q = sprite('❓', 0.8); q.position.set(2.4, y + 0.6, z); L.disp.add(q);
    } else {
      R.ex.forEach(([e, col], i) => { const s = sprite(e, 0.6); s.position.set(-2.6 + i * 1.6, y + 0.9, z); L.disp.add(s); const b = mesh(new THREE.MeshLambertMaterial({ color: col }), -2.6 + i * 1.6, y + 0.2, z, 0.4, 0.4, 0.4, L.disp); });
      const s = sprite(R.q, 0.6); s.position.set(2.4, y + 0.9, z); L.disp.add(s); const q = sprite('❓', 0.55); q.position.set(2.4, y + 0.2, z); L.disp.add(q);
    }
    const opts = shuffle(R.opts);
    L.pads.forEach((c, i) => {
      c.opt = opts[i]; if (c.show) world.remove(c.show); const g = new THREE.Group(); g.position.set(wx(c.x), 0.4, wz(c.z));
      if (R.type === 'num') { const s = cubeStack(c.opt, '#ffd23f', 0.12); g.add(s); const n = numSprite(c.opt, 0.4); n.position.y = c.opt * 0.12 + 0.3; g.add(n); }
      else { const b = new THREE.Mesh(BOX, new THREE.MeshLambertMaterial({ color: c.opt, emissive: c.opt, emissiveIntensity: 0.3 })); b.scale.setScalar(0.45); b.position.y = 0.3; b.castShadow = true; g.add(b); }
      world.add(g); c.show = g; c.padObj.material = M.pad;
    });
    say(L.round === 1 ? 'New example! 🍎🍌🥦 Where does the 🍋 go?' : (L.round === 2 ? 'Last one! What comes next? ❓' : this.intro));
  },
  onEnter(c) {
    if (!c.pad) return; const R = this.rounds[L.round];
    if (c.opt === R.ans) {
      Sound.sfx('good'); burst(c.padObj.position.clone().setY(0.5), '#ffd23f', 16); L.rec.extra['r' + L.round] = L.rec.extra['r' + L.round] || 'ok';
      tween(0.8, k => { L.bot.rotation.y = k * Math.PI * 2; L.bot.position.y = Math.sin(k * Math.PI) * 0.5; });
      L.round++;
      if (L.round >= this.rounds.length) { L.disp.clear(); openGate(); say('Gearbot learned the rules! 🤖🎉 The gate is open ⬇️'); L.pads.forEach(p => { p.trigger = false; p.pad = 0; }); }
      else { L.locked = true; setTimeout(() => { this.showRound(L); backToStart(0); }, 900); }
    } else {
      L.rec.extra['r' + L.round] = 'miss'; const p = c.padObj; p.material = new THREE.MeshLambertMaterial({ color: '#ff4040' });
      failLevel('Gearbot says: Hmm, not quite! 🤖 Look at the board again.'); backToStart(800); setTimeout(() => p.material = M.pad, 900);
    }
  },
  update(L, dt, t) { bob(t); if (L.bot && !anims.length) L.bot.rotation.y = Math.sin(t / 800) * 0.3; },
},
{
  id: 'L4', name: 'Crate Crush', emoji: '📦', skill: 'logic', skillLabel: 'Planning',
  map: ['##########', '#S...#...#', '#.C..#.o.#', '#..C...PP#', '#....#...#', '#x...#...#', '#######E##'],
  intro: 'Push the 📦 crates onto the 🟨 yellow plates to open the gate!',
  goal: 'Push both 📦 onto the 🟨 plates. Stuck? Press ↺ Reset',
  hints: ['Walk into a crate to push it ➡️', 'You can only push, never pull. Think before you push!', 'Get behind a crate and line it up with the plates 🟨'],
  setup(L) {
    L.crates0 = []; L.plates = [];
    for (const row of grid) for (const c of row) {
      if (c.t === 'C') { c.t = '.'; L.crates0.push([c.x, c.z]); }
      if (c.t === 'P') { c.t = '.'; c.plate = mesh('plate', wx(c.x), 0.02, wz(c.z), 0.9, 0.05, 0.9); L.plates.push(c); }
    }
    this.placeCrates(L); show('#btnReset', true);
  },
  placeCrates(L) {
    for (const row of grid) for (const c of row) if (c.crate) { world.remove(c.crate); c.crate = null; }
    L.crates0.forEach(([x, z]) => { const c = cell(x, z); c.crate = mesh('crate', wx(x), 0.45, wz(z), 0.9, 0.9, 0.9); });
  },
  reset(L, byUser) {
    if (L.solved) return; this.placeCrates(L); placePlayer(L.start[0], L.start[1]); L.plates.forEach(p => p.plate.material = M.plate);
    if (byUser) { L.rec.fails++; L.rec.attempts++; L.rec.firstTry = false; L.rec.extra.resets = (L.rec.extra.resets || 0) + 1; Sound.sfx('click'); say('Fresh start! 🔄 You\'ve got this.', 2500); }
  },
  onCrate() {
    let n = 0; L.plates.forEach(p => { if (p.crate) { n++; p.plate.material = M.gold; } else p.plate.material = M.plate; });
    if (n === L.plates.length && !L.solved) { L.solved = true; openGate(); show('#btnReset', false); say('Both plates pressed! 🎉 Walk to the gate ⬇️'); return; }
    if (n === 1) { Sound.sfx('good'); say('One down! 🙌 One more crate.', 2500); }
    // gentle stuck check: crate in a corner but not on a plate
    for (const row of grid) for (const c of row) if (c.crate && !c.plate) {
      const s = (dx, dz) => isSolid(cell(c.x + dx, c.z + dz)) && !(cell(c.x + dx, c.z + dz) || {}).crate;
      if ((s(0, -1) || s(0, 1)) && (s(-1, 0) || s(1, 0))) { say('Hmm, that crate looks stuck. Press ↺ Reset to try again!', 4000); const b = $('#btnReset'); b.style.transform = 'scale(1.15)'; setTimeout(() => b.style.transform = '', 600); }
    }
  },
  onEnter() { }, update: (L, dt, t) => bob(t),
},
{
  id: 'L5', name: 'Story Stones', emoji: '📖', skill: 'story', skillLabel: 'Storytelling',
  map: ['###########', '#....T....#', '#.........#', '#..1.2.3..#', '#b........#', '#*#.S...x.#', '#####E#####'],
  intro: 'Tell the story in order! 📖 Walk onto what happens FIRST, then NEXT, then LAST.',
  goal: 'Step on the pictures in story order: 1️⃣ ➡️ 2️⃣ ➡️ 3️⃣',
  hints: ['What happens at the start? What happens at the end?', 'Small things often grow into big things 🌱', 'Tell the story out loud in your head, then walk.'],
  stories: [['🌱', '🌳', '🍎'], ['🥚', '🐣', '🐔'], ['☁️', '🌧️', '🌈']],
  solid: c => c.t === 'T',
  setup(L) {
    L.round = 0; L.next = 0; L.pads = []; L.badges = [];
    for (const row of grid) for (const c of row) {
      if (/[1-3]/.test(c.t)) { addPad(c); L.pads.push(c); }
      if (c.t === 'T') { mesh('log', wx(c.x), 0.4, wz(c.z), 0.6, 0.8, 0.6); const o = sprite('🦉', 1.1); o.position.set(wx(c.x), 1.35, wz(c.z)); world.add(o); L.owl = o; }
    }
    const b = sprite('📖', 0.9); b.position.set(wx(5) + 2, 2.5, wz(0)); world.add(b);
    ['1️⃣', '➡️', '2️⃣', '➡️', '3️⃣'].forEach((e, i) => { const s = sprite(e, 0.5); s.position.set(wx(5) - 1.6 + i * 0.8, 2.6, wz(0)); world.add(s); });
    this.showRound(L);
  },
  showRound(L) {
    const st = this.stories[L.round]; const order = shuffle([0, 1, 2]); L.next = 0;
    L.badges.forEach(b => world.remove(b)); L.badges = [];
    L.pads.forEach((c, i) => { c.item = order[i]; c.doneStep = false; if (c.card) world.remove(c.card); c.card = sprite(st[c.item], 0.95, '#fff6ec'); c.card.position.set(wx(c.x), 1.0, wz(c.z)); world.add(c.card); c.padObj.material = M.pad; });
  },
  onEnter(c) {
    if (c.item === undefined || c.doneStep || !c.trigger) return;
    if (c.item === L.next) {
      c.doneStep = true; L.next++; Sound.tone(440 + L.next * 160, 0.15, 'triangle', 0.2); c.padObj.material = M.gold;
      const b = sprite(['1️⃣', '2️⃣', '3️⃣'][L.next - 1], 0.5); b.position.set(wx(c.x), 1.75, wz(c.z)); world.add(b); L.badges.push(b);
      if (L.next === 3) {
        Sound.sfx('good'); L.round++; tween(0.6, k => L.owl.position.y = 1.35 + Math.sin(k * Math.PI) * 0.6); Sound.tone(392, 0.2, 'sine', 0.2, 0.1); Sound.tone(330, 0.3, 'sine', 0.2, 0.3);
        if (L.round >= this.stories.length) { L.pads.forEach(p => p.trigger = false); openGate(); say('What a great storyteller! 🦉📖 The gate is open ⬇️'); }
        else { say('Hoo-hoo! 🦉 Great story! Here comes another one…', 2500); L.locked = true; setTimeout(() => { this.showRound(L); backToStart(0); }, 1200); }
      }
    } else {
      L.rec.extra['miss' + L.round] = 1; failLevel('Hmm, that part comes at a different time. Try again! 🦉');
      L.locked = true; setTimeout(() => { this.showRound(L); backToStart(0); }, 900);
    }
  },
  update(L, dt, t) { bob(t); if (L.owl) L.owl.material.rotation = Math.sin(t / 500) * 0.1; },
},
{
  id: 'L6', name: 'Speaker\'s Stage', emoji: '🎤', skill: 'speaking', skillLabel: 'Public Speaking',
  map: ['###########', '#..sssss..#', '#..ssMss..#', '#.........#', '#.c.c.c.c.#', '#x...S...o#', '#####E#####'],
  floor: 'grass',
  intro: 'The crowd is waiting! 🎤 Walk onto the glowing microphone on the stage.',
  goal: 'Walk onto the 🎤 on the stage', noSkip: false,
  hints: ['Walk up to the stage ⬆️ and step on the glowing 🎤'],
  solid: c => c.t === 'c',
  trigger: c => c.t === 'M' && !L.spoke,
  setup(L) {
    L.crowd = []; L.spoke = false;
    for (const row of grid) for (const c of row) {
      if (c.t === 's' || c.t === 'M') mesh('plank', wx(c.x), 0.06, wz(c.z), 1, 0.12, 1);
      if (c.t === 'M') { const g = new THREE.Group(); g.position.set(wx(c.x), 0.12, wz(c.z)); mesh(new THREE.MeshLambertMaterial({ color: '#333' }), 0, 0.5, -0.35, 0.06, 1, 0.06, g); mesh(new THREE.MeshLambertMaterial({ color: '#888', emissive: '#f26b21', emissiveIntensity: 0.5 }), 0, 1.05, -0.35, 0.16, 0.2, 0.16, g); world.add(g); L.ring = mesh(new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.6 }), wx(c.x), 0.14, wz(c.z), 0.9, 0.02, 0.9); L.bang = bangSprite(wx(c.x), wz(c.z), 2.0); }
      if (c.t === 'c') { const p = blockyPerson(pick(['#e53935', '#43a047', '#3b82f6', '#8e24aa', '#fdd835', '#00acc1']), pick(['#e0b088', '#c98f65', '#8d5a3b', '#f1c9a5']), pick(['#222', '#5a3a20', '#ffd23f'])); p.position.set(wx(c.x), 0, wz(c.z)); p.rotation.y = Math.PI; world.add(p); L.crowd.push(p); }
    }
    // curtains
    [1.5, 9.5].forEach(x => mesh(new THREE.MeshLambertMaterial({ color: '#b3202f' }), wx(x), 1.2, wz(1), 0.4, 2.4, 0.4));
    mesh(new THREE.MeshLambertMaterial({ color: '#b3202f' }), wx(5), 2.4, wz(1), 8.4, 0.3, 0.4);
  },
  async onEnter(c) {
    if (c.t !== 'M' || L.spoke) return; L.locked = true; player.face = Math.PI; L.rec.extra.wrongPicks = 0;
    const cards = [['👀', 'Look at people', 1], ['🗣️', 'Speak loud and clear', 1], ['😊', 'Smile', 1], ['🙈', 'Hide your face', 0], ['📱', 'Look at your phone', 0], ['🤫', 'Whisper', 0]];
    await modal(`<h2>🎤 Make the crowd cheer!</h2><p class="story-text">Pick <b>3</b> things good speakers do.</p><div class="choices">${shuffle(cards).map(([e, t, g]) => `<button class="choice" data-g="${g}"><span class="em">${e}</span>${t}</button>`).join('')}</div><p id="spTip" class="small"></p>`, (el, done) => {
      let good = 0; el.querySelectorAll('.choice').forEach(b => b.onclick = () => {
        if (b.disabled) return; b.disabled = true;
        if (b.dataset.g === '1') { b.classList.add('sel'); good++; Sound.sfx('good'); L.crowd.forEach((p, i) => tween(0.3, k => p.position.y = Math.sin(k * Math.PI) * 0.3)); if (good === 3) setTimeout(() => done(), 500); }
        else { b.style.opacity = 0.4; b.innerHTML += ' ❌'; L.rec.extra.wrongPicks++; L.rec.fails++; L.rec.firstTry = false; Sound.sfx('wrong'); el.querySelector('#spTip').textContent = 'The crowd looks bored 😴. Try another!'; }
      });
    });
    const ideas = ['Hi everyone! I am happy to be here.', 'Hello friends! Let me tell you a story.', 'Good morning! Today I will show you something cool.'];
    const res = await modal(`<h2>👋 Say hello to the crowd!</h2><p class="story-text">Type one line you would say.</p><input type="text" id="spLine" maxlength="120" placeholder="Hello everyone! ..."><div id="spIdeas" class="choices hidden" style="margin-top:10px">${ideas.map(i => `<button class="choice" style="min-width:100%">${i}</button>`).join('')}</div><button class="btn" id="spHelp" style="background:#ddd;color:#1a2a4f">💡 Show ideas</button> <button class="btn primary" id="spGo">Speak 🎤</button>`, (el, done) => {
      let picked = false; const inp = el.querySelector('#spLine'); setTimeout(() => inp.focus(), 50);
      el.querySelector('#spHelp').onclick = () => { el.querySelector('#spIdeas').classList.remove('hidden'); };
      el.querySelectorAll('#spIdeas .choice').forEach(b => b.onclick = () => { inp.value = b.textContent; picked = true; });
      el.querySelector('#spGo').onclick = () => { if (!words(inp.value)) { inp.style.borderColor = '#f26b21'; inp.placeholder = 'Type a few words, or tap 💡 Show ideas'; return; } done({ line: inp.value.trim(), picked: picked && ideas.includes(inp.value.trim()) }); };
    });
    S.speech = { line: res.line, words: words(res.line), pickedIdea: res.picked, wrongPicks: L.rec.extra.wrongPicks };
    L.spoke = true; world.remove(L.bang); L.ring.visible = false; Sound.sfx('cheer'); confetti(50);
    L.crowd.forEach((p, i) => tween(1.4, k => { p.position.y = Math.abs(Math.sin(k * Math.PI * 4 + i)) * 0.4; }));
    openGate(); say('The crowd loves you! 👏👏 Walk to the gate ⬇️'); L.locked = false;
  },
  update(L, dt, t) { bob(t); if (L.ring) L.ring.material.opacity = 0.35 + Math.sin(t / 200) * 0.25; },
},
{
  id: 'L7', name: 'Builder\'s Plot', emoji: '🧱', skill: 'creativity', skillLabel: 'Creativity',
  map: ['..........', '.pppppppp.', '.pppppppp.', '.pppppppp.', '.pppppppp.', '.pppppppp.', '..........'],
  intro: 'Free build! 🧱 Build a gift for Promo\'s fort. Anything you like! Tap to place blocks.',
  goal: 'Build anything! Then press ✅ Done', noWalk: true, noSkip: true,
  mats: [['brick', '#7c8594', '🧱'], ['plank', '#b5834c', '🪵'], ['leaves', '#3f8f35', '🌿'], ['gold', '#ffd23f', '✨'], ['glass', '#9be3ff', '💎'], ['navy', '#1a2a4f', '🟦'], ['orange', '#f26b21', '🔥']],
  setup(L) {
    L.start = [0, 3]; L.blocks = new Map(); L.history = []; L.placed = 0; L.mat = 'brick'; L.erase = false;
    if (!M.glass) { M.glass = new THREE.MeshLambertMaterial({ color: '#9be3ff', transparent: true, opacity: 0.6 }); M.navy = std({ color: '#1a2a4f' }); M.orange = std({ color: '#f26b21', emissive: '#f26b21', emissiveIntensity: 0.3 }); }
    for (const row of grid) for (const c of row) if (c.t === 'p') mesh('dirt', wx(c.x), 0.01, wz(c.z), 0.98, 0.04, 0.98);
    const bar = $('#buildBar'); bar.innerHTML = this.mats.map(([m, col, e]) => `<button data-m="${m}" style="background:${col}" class="${m === 'brick' ? 'sel' : ''}">${e}</button>`).join('') + `<button class="txt" data-x="erase">🧽</button><button class="txt" data-x="undo">↶</button><button class="txt done" data-x="done">✅ Done</button>`;
    bar.querySelectorAll('button').forEach(b => b.onclick = () => { Sound.sfx('click'); const x = b.dataset.x;
      if (b.dataset.m) { L.mat = b.dataset.m; L.erase = false; bar.querySelectorAll('button').forEach(q => q.classList.remove('sel')); b.classList.add('sel'); }
      else if (x === 'erase') { L.erase = !L.erase; bar.querySelectorAll('button').forEach(q => q.classList.remove('sel')); b.classList.toggle('sel', L.erase); }
      else if (x === 'undo') { const k = L.history.pop(); if (k && L.blocks.has(k)) { world.remove(L.blocks.get(k).o); L.blocks.delete(k); } }
      else if (x === 'done') this.finish(L);
    });
    show('#buildBar', true); L.rec.t0 = now();
  },
  key: (x, y, z) => x + ',' + y + ',' + z,
  place(L, x, y, z) {
    const c = cell(x, z); if (!c || c.t !== 'p' || y < 0 || y > 6) return; const k = this.key(x, y, z); if (L.blocks.has(k)) return;
    if (L.blocks.size >= 120) { say('Wow, that\'s a lot of blocks! Press ✅ Done when ready.', 2500); return; }
    const o = mesh(L.mat, wx(x), y + 0.5, wz(z)); o.userData.cell = [x, y, z]; o.scale.setScalar(0.01); tween(0.15, kk => o.scale.setScalar(0.01 + kk * 0.99));
    L.blocks.set(k, { o, m: L.mat, x, y, z }); L.history.push(k); L.placed++; Sound.sfx('place'); burst(o.position, '#ffffff', 4, 1.5);
    if (L.blocks.size === 5) say('Looking good! 🤩 Keep building, or press ✅ Done.', 3000);
  },
  onPointer(L, ray) {
    const objs = [...L.blocks.values()].map(b => b.o); const hit = ray.intersectObjects(objs, false)[0];
    if (hit) {
      const [x, y, z] = hit.object.userData.cell;
      if (L.erase) { const k = this.key(x, y, z); world.remove(hit.object); L.blocks.delete(k); Sound.sfx('bump'); return true; }
      const n = hit.face.normal; this.place(L, x + Math.round(n.x), y + Math.round(n.y), z + Math.round(n.z)); return true;
    }
    const p = new THREE.Vector3(); if (ray.ray.intersectPlane(plane, p) && !L.erase) { this.place(L, Math.round(p.x + (GW - 1) / 2), 0, Math.round(p.z + (GH - 1) / 2)); }
    return true;
  },
  async finish(L) {
    if (L.blocks.size < 5) { say(`Place at least 5 blocks first! (${L.blocks.size}/5) 🧱`, 2500); return; }
    show('#buildBar', false);
    const types = [['🏰', 'Fort'], ['🗼', 'Tower'], ['🐉', 'Creature'], ['🏠', 'Home'], ['🚀', 'Machine'], ['✨', 'Something new']];
    const res = await modal(`<h2>What did you build? 🧱</h2><div class="choices">${types.map(([e, t]) => `<button class="choice" data-t="${t}"><span class="em">${e}</span>${t}</button>`).join('')}</div><input type="text" id="bName" maxlength="40" placeholder="Give it a name (optional)"><input type="text" id="bWhy" maxlength="140" placeholder="Why will Promo love it? (one line)"><button class="btn primary" id="bGo" disabled>Finish ✅</button>`, (el, done) => {
      let type = null; el.querySelectorAll('.choice').forEach(b => b.onclick = () => { type = b.dataset.t; el.querySelectorAll('.choice').forEach(q => q.classList.remove('sel')); b.classList.add('sel'); el.querySelector('#bGo').disabled = false; Sound.sfx('click'); });
      el.querySelector('#bGo').onclick = () => done({ type, name: el.querySelector('#bName').value.trim(), why: el.querySelector('#bWhy').value.trim() });
    });
    const bl = [...L.blocks.values()]; const mats = new Set(bl.map(b => b.m)); const foot = new Set(bl.map(b => b.x + ',' + b.z));
    S.build = { blocks: bl.length, placedTotal: L.placed, materials: mats.size, height: Math.max(...bl.map(b => b.y + 1)), footprint: foot.size, type: res.type, name: res.name, why: res.why, whyWords: words(res.why), buildSec: Math.round(now() - L.rec.t0) };
    L.rec.extra = { ...S.build };
    say(`Promo LOVES it! 😍 "${(res.name || res.type).replace(/[<>&]/g, '')}"`, 3000); confetti(60); Sound.sfx('cheer');
    tween(1.5, k => { bl.forEach((b, i) => b.o.position.y = b.y + 0.5 + Math.abs(Math.sin(k * Math.PI * 2 + i * 0.3)) * 0.15); });
    await sleep(1600); completeLevel();
  },
  update(L, dt, t) { },
},
{
  id: 'L8', name: 'Shadow Golem', emoji: '👹', skill: 'boss', skillLabel: 'Final Boss!', music: 'boss', floor: 'stone', camZ: -1.2, sky: '#3d3a63',
  map: ['###########', '#.........#', '#.........#', '#.........#', '#.........#', '#.........#', '#....S....#', '###########'],
  intro: 'The Shadow Golem! 😱 Grab glowing 🔥 embers to throw fire at it. Dodge the RED tiles!',
  goal: 'Grab 🔥 to attack. Step OFF red tiles!',
  hints: ['When tiles turn RED, quickly step onto a normal tile!', 'Grab the glowing 🔥 ember. You throw it at the golem automatically!', 'Stay in the middle so you can move any way.'],
  setup(L) {
    L.hearts = 3; L.hits = 0; L.need = 3; L.atkT = 3.5; L.warn = null; L.inv = 0; L.redObjs = [];
    const g = new THREE.Group(); const dm = M.dark, eye = new THREE.MeshBasicMaterial({ color: '#c04dff' });
    mesh(dm, -0.8, 1, 0, 0.9, 2, 0.9, g); mesh(dm, 0.8, 1, 0, 0.9, 2, 0.9, g); const body = mesh(dm, 0, 3, 0, 3, 2.4, 1.6, g);
    const head = new THREE.Group(); head.position.set(0, 4.9, 0); g.add(head); mesh(dm, 0, 0, 0, 1.6, 1.4, 1.4, head); mesh(eye, -0.38, 0.1, 0.71, 0.36, 0.24, 0.05, head); mesh(eye, 0.38, 0.1, 0.71, 0.36, 0.24, 0.05, head);
    const aL = new THREE.Group(); aL.position.set(-1.9, 3.9, 0); g.add(aL); mesh(dm, 0, -1.1, 0, 0.8, 2.4, 0.8, aL);
    const aR = new THREE.Group(); aR.position.set(1.9, 3.9, 0); g.add(aR); mesh(dm, 0, -1.1, 0, 0.8, 2.4, 0.8, aR);
    [[-1, 3.6], [0.7, 2.4], [0.2, 3.9]].forEach(([x, y]) => mesh(new THREE.MeshBasicMaterial({ color: '#7a2fbf' }), x, y, 0.81, 0.3, 0.3, 0.02, g));
    g.position.set(0, 0, wz(0) - 1.3); g.scale.setScalar(1); world.add(g); L.golem = { g, head, aL, aR, body };
    L.golemLight = new THREE.PointLight('#b04dff', 3, 8); L.golemLight.position.set(0, 4, wz(0)); world.add(L.golemLight);
    L.onEmber = () => this.fireball(L);
    show('#hearts', true); this.hearts(L); this.spawnOrb(L);
  },
  hearts(L) { $('#hearts').textContent = '❤️'.repeat(L.hearts) + '🖤'.repeat(3 - L.hearts) + `  👹 ${'💥'.repeat(L.hits)}${'⬜'.repeat(L.need - L.hits)}`; },
  floorCells() { const a = []; for (const row of grid) for (const c of row) if (c.t === '.') a.push(c); return a; },
  spawnOrb(L) {
    if (L.won) return; const cs = this.floorCells().filter(c => !c.ember && Math.abs(c.x - player.x) + Math.abs(c.z - player.z) >= 3 && !(L.warn && L.warn.has(c)));
    const c = pick(cs); addEmber(c); burst(c.obj.position, '#ffb02e', 10);
  },
  fireball(L) {
    Sound.sfx('fire'); const f = new THREE.Mesh(BOX, M.ember); f.scale.setScalar(0.5); world.add(f); const a = player.g.position.clone().setY(1), b = new THREE.Vector3(0, 4.2, wz(0) - 1.4);
    const pl = new THREE.PointLight('#ff8a2a', 3, 6); f.add(pl);
    tween(0.7, k => { f.position.lerpVectors(a, b, k); f.position.y += Math.sin(k * Math.PI) * 2.5; f.rotation.x += 0.3; }, () => {
      world.remove(f); burst(b, '#ff7a1a', 30, 4); Sound.sfx('hit'); shake(0.3); L.hits++; this.hearts(L);
      L.golem.body.material = new THREE.MeshBasicMaterial({ color: '#ffffff' }); setTimeout(() => L.golem.body.material = M.dark, 150);
      if (L.hits >= L.need) this.win(L); else { say(L.hits === 1 ? 'HIT! 🔥💥 2 more!' : 'HIT! 🔥💥 One more! The golem is angry!', 2500); setTimeout(() => this.spawnOrb(L), 900); }
    });
  },
  clearRed(L) { L.redObjs.forEach(o => world.remove(o)); L.redObjs = []; L.warn = null; },
  attack(L) {
    const cs = this.floorCells(); const pats = [
      c => c.z % 2 === (L.hits % 2), c => c.x % 2 === 1, c => (c.x + c.z) % 2 === 0,
      c => Math.abs(c.x - player.x) <= 1 && Math.abs(c.z - player.z) <= 1, c => c.z === player.z || c.x === player.x];
    const f = L.hits === 0 ? pick([pats[3], pats[4], pats[0]]) : pick(pats);
    L.warn = new Set(cs.filter(f)); L.warnT = L.hits >= 2 ? 1.7 : 2.2;
    L.warn.forEach(c => { const o = mesh(M.red, wx(c.x), 0.03, wz(c.z), 0.94, 0.04, 0.94); o.castShadow = false; L.redObjs.push(o); });
    Sound.sfx('warn'); say('⚠️ RED tiles! Step off them!', 1800);
  },
  slam(L) {
    Sound.sfx('slam'); shake(0.4); L.redObjs.forEach(o => { burst(o.position, '#5a4a7a', 2, 2); });
    const pc = cell(player.x, player.z);
    if (L.warn.has(pc) && L.inv <= 0) {
      L.hearts--; L.inv = 1.2; Sound.sfx('hurt'); this.hearts(L); tween(0.6, k => player.g.visible = Math.floor(k * 8) % 2 === 0, () => player.g.visible = true);
      if (L.hearts <= 0) { this.clearRed(L); this.lose(L); return; }
      say('Ouch! 💔 Watch for red tiles!', 2000);
    }
    this.clearRed(L); L.atkT = L.hits >= 2 ? 2.2 : 3.0;
  },
  async lose(L) {
    L.locked = true; L.paused = true; failLevel(); player.queue = [];
    await modal(`<h2>💥 The golem got you!</h2><p class="story-text">Heroes never give up! Try again? 💪</p><button class="btn primary">Try again 🔥</button>`, (el, done) => el.querySelector('button').onclick = done);
    for (const row of grid) for (const c of row) if (c.ember) { world.remove(c.obj); c.ember = false; }
    L.hearts = 3; L.hits = 0; this.hearts(L); placePlayer(L.start[0], L.start[1]); L.atkT = 3.5; L.paused = false; L.locked = false; this.spawnOrb(L);
  },
  async win(L) {
    L.won = true; L.locked = true; this.clearRed(L); Sound.sfx('boom'); shake(0.6);
    const G = L.golem.g; G.traverse(o => { if (o.isMesh) burst(o.getWorldPosition(new THREE.Vector3()), pick(['#3a3550', '#7a2fbf', '#c04dff']), 6, 4); });
    tween(1, k => { G.scale.setScalar(1 - k); G.rotation.z = k * 0.5; }, () => world.remove(G)); L.golemLight.intensity = 0;
    await showBanner('👹💥 Golem defeated!', 1600);
    const sky0 = new THREE.Color('#3d3a63'), sky1 = new THREE.Color('#ffb36b');
    tween(1.5, k => { scene.background.copy(sky0).lerp(sky1, k); scene.fog.color.copy(scene.background); });
    camTarget.set(0, 4, -26); camDist = 16; torchFire.visible = true; tween(1.2, k => { torchLight.intensity = 6 * k; torchFire.scale.setScalar(k); });
    Sound.sfx('win'); setTimeout(() => Sound.sfx('cheer'), 600);
    for (let i = 0; i < 5; i++) setTimeout(() => burst(new THREE.Vector3(rnd(-4, 4), rnd(6, 10), -30), pick(['#f26b21', '#ffd23f', '#ff4f8b', '#4fc3ff']), 24, 4), 300 + i * 350);
    await showBanner('🔥 The Great Torch is lit! 🔥', 2600);
    const hows = [['👀', 'I watched the red tiles'], ['🏃', 'I kept moving'], ['🔥', 'I grabbed embers fast'], ['🤔', 'I made a plan']];
    const res = await modal(`<h2>You saved Promethia! 🏆</h2><p class="story-text">How did you beat the golem?</p><div class="choices">${hows.map(([e, t]) => `<button class="choice" data-t="${t}"><span class="em">${e}</span>${t}</button>`).join('')}</div><input type="text" id="hLine" maxlength="140" placeholder="Tell a friend in one line (optional)"><button class="btn primary" id="hGo" disabled>See my badge 🏅</button>`, (el, done) => {
      let how = null; el.querySelectorAll('.choice').forEach(b => b.onclick = () => { how = b.dataset.t; el.querySelectorAll('.choice').forEach(q => q.classList.remove('sel')); b.classList.add('sel'); el.querySelector('#hGo').disabled = false; Sound.sfx('click'); });
      el.querySelector('#hGo').onclick = () => done({ how, line: el.querySelector('#hLine').value.trim() });
    });
    S.boss = { how: res.how, line: res.line, lineWords: words(res.line), heartsLeft: L.hearts };
    completeLevel();
  },
  update(L, dt, t) {
    if (L.won || L.paused || L.locked && !L.warn) { return; }
    const G = L.golem; G.head.rotation.y = Math.sin(t / 600) * 0.3; G.g.position.y = Math.sin(t / 400) * 0.05;
    L.inv -= dt;
    if (L.warn) { L.warnT -= dt; const k = Math.max(0, L.warnT); G.aL.rotation.x = G.aR.rotation.x = -Math.min(1, (2.2 - k)) * 2.2; L.redObjs.forEach(o => o.material.opacity = 0.35 + Math.abs(Math.sin(t / (k < 0.8 ? 60 : 140))) * 0.45); if (L.warnT <= 0) { G.aL.rotation.x = G.aR.rotation.x = 0; this.slam(L); } }
    else { L.atkT -= dt; if (L.atkT <= 0) this.attack(L); }
  },
},
];

/* ================= SCORING ================= */
const TOTAL_STARS = 6;
function computeScores() {
  const lv = S.levels.filter(Boolean); const byId = Object.fromEntries(lv.map(l => [l.id, l]));
  // Problem-solving (35): puzzle levels, full marks for solving, small deductions per extra try / hint
  const puzzles = ['L2', 'L3', 'L4', 'L5', 'L6', 'L8'];
  const ps = puzzles.map(id => { const l = byId[id]; if (!l || !l.completed) return 0; return Math.max(0.4, 1 - 0.1 * l.fails - 0.12 * l.hints); });
  const problem = 35 * ps.reduce((a, b) => a + b, 0) / puzzles.length;
  // Persistence (20): finishing levels + coming back after a failure
  const done = lv.filter(l => l.completed).length; const failed = lv.filter(l => l.fails > 0); const recovered = failed.filter(l => l.completed).length;
  const persistence = 10 * done / LEVELS.length + 10 * (failed.length ? recovered / failed.length : 1);
  // Curiosity (15): secret stars + exploring (cracked walls, bushes)
  const explore = lv.reduce((a, l) => a + l.explore, 0) - S.stars; // bushes + cracks
  const curiosity = 12 * Math.min(1, S.stars / TOTAL_STARS) + Math.min(3, explore + (S.promoTaps > 0 ? 1 : 0));
  // Creativity (20): free build
  const b = S.build || {};
  const creativity = b.blocks ? (7 * Math.min(1, b.blocks / 25) + 5 * Math.min(1, b.materials / 5) + 4 * Math.min(1, b.height / 5) + 2 * Math.min(1, b.footprint / 10) + (b.name ? 2 : 0)) : 0;
  // Communication (10): typed lines
  const sp = S.speech || {}, bo = S.boss || {};
  const communication = (sp.words ? (sp.pickedIdea ? 2 : (sp.words >= 4 ? 4 : 2)) : 0) + (b.whyWords >= 4 ? 3 : b.whyWords ? 1.5 : 0) + (bo.how ? 1 : 0) + (bo.lineWords >= 3 ? 2 : bo.lineWords ? 1 : 0);
  const r = v => Math.round(v * 10) / 10;
  const sc = { problem: r(problem), persistence: r(persistence), curiosity: r(curiosity), creativity: r(creativity), communication: r(communication) };
  sc.total = Math.round(sc.problem + sc.persistence + sc.curiosity + sc.creativity + sc.communication);
  const firstTry = puzzles.filter(id => byId[id] && byId[id].completed && byId[id].firstTry).length;
  return { sc, firstTry, puzzles: puzzles.length };
}
function titleFor(total) { return total >= 80 ? 'Legendary Torchbearer' : total >= 65 ? 'Torchbearer' : total >= 50 ? 'Flame Keeper' : 'Brave Spark'; }
function badgesFor() {
  const b = []; const lv = S.levels.filter(Boolean);
  if (S.levels[7] && S.levels[7].completed) b.push('👹 Golem Slayer');
  if (S.stars >= 4) b.push('⭐ Star Seeker'); else if (S.stars >= 1) b.push('🔍 Explorer');
  if (lv.some(l => l.fails > 0 && l.completed)) b.push('💪 Never Give Up');
  if (S.build && S.build.blocks >= 15) b.push('🧱 Master Builder');
  if (S.speech && S.speech.wrongPicks === 0) b.push('🎤 Star Speaker');
  if (S.levels[2] && S.levels[2].firstTry) b.push('🤖 AI Whisperer');
  if (S.levels[4] && S.levels[4].firstTry) b.push('📖 Storyteller');
  if (S.embers >= 10) b.push('🔥 Ember Collector');
  return b;
}

/* ================= SAVING ================= */
function getArchive() { try { return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]'); } catch (e) { return []; } }
function setArchive(a) { try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(a)); } catch (e) { } }
function levelLine(l) { return l ? `${l.time}s, tries ${l.attempts}, fails ${l.fails}, hints ${l.hints}, stars ${l.stars}, explore ${l.explore}, ${l.skipped ? 'SKIPPED' : l.completed ? 'done' : 'not done'}${l.firstTry ? ', first-try' : ''}` : 'not reached'; }
async function submitRecord(rec) {
  const url = CFG.SUBMIT_URL; if (!url) throw new Error('no url');
  const body = {
    _subject: `${rec.test ? 'TEST - ' : ''}Promethia Quest: ${rec.name} (G${rec.grade}${rec.section}) ${rec.scores.total}/100 ${rec.title}`,
    _template: 'table', _captcha: 'false',
    attempt_id: rec.id, student: rec.name, grade: rec.grade, section: rec.section, lab_pc: rec.pc, test: rec.test ? 'YES' : 'no',
    total_score: rec.scores.total, title: rec.title, problem_solving_35: rec.scores.problem, persistence_20: rec.scores.persistence, curiosity_15: rec.scores.curiosity, creativity_20: rec.scores.creativity, communication_10: rec.scores.communication,
    total_minutes: (rec.totalSec / 60).toFixed(1), first_try_puzzles: `${rec.firstTry}/${rec.puzzles}`, stars: `${rec.stars}/${TOTAL_STARS}`, embers: rec.embers, hero: rec.hero, badges: rec.badges.join(', '),
    ...Object.fromEntries(LEVELS.map((d, i) => [`L${i + 1}_${d.name.replace(/[^A-Za-z]/g, '')}`, levelLine(rec.levels[i])])),
    build: rec.build ? `${rec.build.blocks} blocks, ${rec.build.materials} materials, height ${rec.build.height}, type ${rec.build.type}, name "${rec.build.name}"` : '',
    build_why: rec.build ? rec.build.why : '', speech_line: rec.speech ? rec.speech.line : '', speech_wrong_picks: rec.speech ? rec.speech.wrongPicks : '',
    boss_how: rec.boss ? rec.boss.how : '', boss_line: rec.boss ? rec.boss.line : '', finished_at: rec.finishedAt, device: `${innerWidth}x${innerHeight}`,
  };
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
    const j = await r.json().catch(() => ({})); if (!r.ok || j.success === 'false' || j.success === false) throw new Error(j.message || ('HTTP ' + r.status)); return j;
  } finally { clearTimeout(to); }
}
async function retryUnsent() {
  if (TEST) return; const a = getArchive(); let changed = false;
  for (const r of a) if (!r.sent && !r.test) { try { await submitRecord(r); r.sent = true; r.sentAt = new Date().toISOString(); changed = true; } catch (e) { break; } }
  if (changed) setArchive(a);
}
window.PQ_submitRecord = submitRecord;

/* ================= FINISH ================= */
async function finishGame() {
  L.locked = true; ['#hud', '#actions', '#dpad', '#promo', '#buildBar'].forEach(s => show(s, false));
  const { sc, firstTry, puzzles } = computeScores(); const title = titleFor(sc.total);
  const rec = {
    id: 'PQ-' + Date.now().toString(36).toUpperCase(), test: TEST, name: S.student.name, grade: S.student.grade, section: S.student.section, pc: S.student.pc, hero: S.hero.name,
    startedAt: S.startedAt, finishedAt: new Date().toISOString(), totalSec: Math.round((Date.now() - new Date(S.startedAt).getTime()) / 1000),
    levels: S.levels.map(l => l && ({ id: l.id, name: l.name, skill: l.skill, time: l.time, attempts: l.attempts, fails: l.fails, hints: l.hints, stars: l.stars, explore: l.explore, embers: l.embers, completed: l.completed, skipped: l.skipped, firstTry: l.firstTry })),
    build: S.build, speech: S.speech, boss: S.boss, stars: S.stars, embers: S.embers, scores: sc, firstTry, puzzles, title, badges: badgesFor(), sent: false,
  };
  const a = getArchive(); a.push(rec); setArchive(a);
  // results screen
  $('#badgeTitle').textContent = title; $('#resName').textContent = `${rec.name}, you are a`;
  $('#resLine').textContent = `🏆 ${title}! 🏆`;
  $('#resBadges').innerHTML = rec.badges.map(b => `<span>${b}</span>`).join('');
  $('#resStats').innerHTML = `<div>⭐ ${rec.stars}/${TOTAL_STARS}<small>secret stars</small></div><div>🔥 ${rec.embers}<small>embers</small></div><div>⏱️ ${Math.round(rec.totalSec / 60)}m<small>time</small></div>`;
  show('#results'); Sound.sfx('win');
  $('#saveStatus').className = 'save'; $('#saveStatus').textContent = 'Saving… ⏳';
  let ok = false;
  for (let i = 0; i < 2 && !ok; i++) { try { await submitRecord(rec); ok = true; } catch (e) { console.warn('submit failed', e.message); await sleep(1500); } }
  const a2 = getArchive(); const me = a2.find(r => r.id === rec.id); if (me) { me.sent = ok; if (ok) me.sentAt = new Date().toISOString(); setArchive(a2); }
  $('#saveStatus').className = 'save ok'; $('#saveStatus').textContent = ok ? 'Saved ✓' : 'Saved on this PC ✓ (email will retry later)';
  window.__pqDone = { ok, id: rec.id }; show('#btnNext');
}
$('#btnNext').onclick = () => {
  Object.keys(localStorage).forEach(k => { if (k !== ARCHIVE_KEY && k !== QUALITY_KEY && k !== SOUND_KEY) localStorage.removeItem(k); });
  try { sessionStorage.clear(); } catch (e) { }
  location.replace(location.pathname + location.search);
};

/* ================= START FLOW ================= */
const STORY = [
  ['🏰🔥', 'Long ago, the <b>Great Torch</b> of Promethia lit up the sky.'],
  ['👹🌑', 'But the <b>Shadow Golem</b> blew it out! Now the fort is dark.'],
  ['🦸🔥', 'You are a young hero. With <b>Promo</b>, collect the fire and <b>relight the torch!</b>'],
];
$('#startForm').addEventListener('submit', async e => {
  e.preventDefault(); Sound.init();
  S.student = { name: $('#fName').value.trim(), grade: $('#fGrade').value, section: $('#fSection').value.trim().toUpperCase(), pc: $('#fPC').value.trim() };
  if (!S.student.name) return;
  show('#start', false); show('#story');
  let i = 0; const step = () => { $('#storyArt').textContent = STORY[i][0]; $('#storyText').innerHTML = STORY[i][1]; Sound.sfx('click'); };
  step(); $('#storyNext').onclick = () => { i++; if (i < STORY.length) step(); else { show('#story', false); pickHero(); } };
});
function pickHero() {
  show('#heroPick'); const box = $('#heroes');
  box.innerHTML = HEROES.map(h => `<button class="choice" data-id="${h.id}"><div class="sw" style="background:linear-gradient(${h.hair} 0 25%,${h.skin} 25% 50%,${h.shirt} 50% 80%,${h.pants} 80%)"></div>${h.name}</button>`).join('');
  box.querySelectorAll('.choice').forEach(b => b.onclick = () => { box.querySelectorAll('.choice').forEach(q => q.classList.remove('sel')); b.classList.add('sel'); S.hero = HEROES.find(h => h.id === b.dataset.id); $('#heroGo').disabled = false; Sound.sfx('click'); });
  $('#heroGo').onclick = () => { show('#heroPick', false); buildPlayer(S.hero); S.startedAt = new Date().toISOString(); startLevel(DEBUG && QS.get('level') ? Math.max(0, Math.min(LEVELS.length - 1, (+QS.get('level')) - 1)) : 0); };
}

/* ================= BOOT ================= */
// title-screen backdrop
buildDecor();
L = null; buildLevel({ map: ['.........', '.........', '.........', '.........', '.........'] }); GW = 9; GH = 5; fitCamera();
buildPlayer(HEROES[0]); placePlayer(4, 2); player.face = 0;
applyQuality(); requestAnimationFrame(loop);
retryUnsent();
if (DEBUG) {
  window.PQ = { S, LEVELS, get L() { return L; }, win: () => completeLevel(), start: i => startLevel(i), cell, player, tryStep, get grid() { return grid; }, computeScores, findPath, go: (x, z) => { const p = findPath(x, z); if (p) player.queue = p; return !!p; } };
}
