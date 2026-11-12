/* =====================================================================
   scene.js — builds the generated parts of the SVG room and drives the
   time-of-day interpolation from scroll progress.
   Exposes window.Scene = { progress, setProgress, timeString }
   ===================================================================== */
(() => {
  const svg = document.getElementById('scene');
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  // deterministic pseudo-random so the skyline is the same every visit
  let seed = 20250811;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const r = (a, b) => a + rnd() * (b - a);

  const WIN = { x: 640, y: 104, w: 620, h: 432, bottom: 536 };

  /* ---------- skyline ---------- */
  function buildSkyline() {
    const far = document.getElementById('skyline-far');
    const near = document.getElementById('skyline-near');

    // far layer: dense, shorter, no windows
    let x = WIN.x - 30;
    while (x < WIN.x + WIN.w + 30) {
      const w = r(22, 60), h = r(70, 190);
      el('rect', { x, y: WIN.bottom - h, width: w, height: h }, far);
      if (rnd() < 0.25) el('rect', { x: x + w / 2 - 3, y: WIN.bottom - h - r(14, 40), width: 6, height: 40 }, far);
      x += w + r(2, 10);
    }

    // near layer: fewer, taller, lit windows, a few landmarks
    x = WIN.x - 20;
    const tallSlots = [1, 5, 9];
    let i = 0;
    while (x < WIN.x + WIN.w + 20) {
      const isTall = tallSlots.includes(i);
      const w = isTall ? r(54, 80) : r(34, 70);
      const h = isTall ? r(260, 360) : r(90, 230);
      const y = WIN.bottom - h;
      el('rect', { x, y, width: w, height: h }, near);
      // crown
      if (isTall) {
        const cx = x + w / 2;
        el('polygon', { points: `${x + 10},${y} ${x + w - 10},${y} ${cx + 8},${y - 36} ${cx - 8},${y - 36}` }, near);
        el('rect', { x: cx - 2, y: y - 90, width: 4, height: 56 }, near);
      } else if (rnd() < 0.3) {
        // water tower
        el('rect', { x: x + w - 20, y: y - 22, width: 14, height: 22 }, near);
        el('polygon', { points: `${x + w - 22},${y - 22} ${x + w - 4},${y - 22} ${x + w - 13},${y - 32}` }, near);
      } else if (rnd() < 0.5) {
        el('rect', { x: x + 6, y: y - 10, width: w - 12, height: 10 }, near);
      }
      // windows
      const cols = Math.max(2, Math.floor((w - 12) / 12));
      const rows = Math.floor((h - 20) / 16);
      for (let c = 0; c < cols; c++) for (let rr = 0; rr < rows; rr++) {
        if (rnd() < 0.5) continue;
        el('rect', {
          x: x + 7 + c * 12, y: y + 12 + rr * 16, width: 6, height: 8,
          class: 'lit', style: `animation-delay:${r(0, 6).toFixed(2)}s`
        }, near);
      }
      x += w + r(4, 14); i++;
    }
  }

  /* ---------- stars ---------- */
  function buildStars() {
    const g = document.getElementById('stars');
    for (let i = 0; i < 70; i++) {
      el('circle', { cx: r(WIN.x, WIN.x + WIN.w), cy: r(WIN.y, WIN.y + 240), r: r(0.8, 2.2), opacity: r(0.4, 1) }, g);
    }
  }

  /* ---------- clouds ---------- */
  function buildClouds() {
    const g = document.getElementById('clouds');
    const cloud = (cx, cy, s, speed) => {
      const grp = el('g', { class: 'cloud', style: `--d:${speed}s; --o:${s}` }, g);
      const p = `M${cx - 60 * s} ${cy} a${26 * s} ${26 * s} 0 0 1 ${50 * s} -${14 * s} a${30 * s} ${30 * s} 0 0 1 ${56 * s} ${4 * s} a${22 * s} ${22 * s} 0 0 1 ${20 * s} ${10 * s} z`;
      el('path', { d: p }, grp);
    };
    cloud(700, 200, 1.0, 90); cloud(900, 160, 0.7, 120); cloud(1100, 230, 1.0, 70); cloud(800, 280, 0.6, 140);
  }

  /* ---------- rain ---------- */
  function buildRain() {
    const g = document.getElementById('rain');
    for (let i = 0; i < 110; i++) {
      const x = r(WIN.x, WIN.x + WIN.w), y = r(WIN.y, WIN.y + WIN.h), len = r(12, 26);
      el('line', {
        x1: x, y1: y, x2: x - 3, y2: y + len,
        style: `--dur:${r(0.7, 1.3).toFixed(2)}s; --delay:${r(-2, 0).toFixed(2)}s`
      }, g);
    }
  }

  /* ---------- mini sudoku on the newspaper ---------- */
  function buildMiniSudoku() {
    const g = document.getElementById('miniSudoku');
    const cell = 10;
    for (let i = 0; i <= 9; i++) {
      el('rect', { x: 0, y: 0, width: 90, height: 90 }, g);
      el('line', { x1: i * cell, y1: 0, x2: i * cell, y2: 90, stroke: '#2b2f4a', 'stroke-width': i % 3 === 0 ? 1.4 : 0.5 }, g);
      el('line', { x1: 0, y1: i * cell, x2: 90, y2: i * cell, stroke: '#2b2f4a', 'stroke-width': i % 3 === 0 ? 1.4 : 0.5 }, g);
    }
    const givens = window.SUDOKU ? window.SUDOKU.puzzle : '';
    for (let i = 0; i < 81; i++) {
      const v = givens[i];
      if (!v || v === '.') continue;
      const t = el('text', { x: (i % 9) * cell + 5, y: Math.floor(i / 9) * cell + 8, 'text-anchor': 'middle' }, g);
      t.textContent = v;
    }
  }

  /* ---------- time-of-day keyframes ---------- */
  // t = scroll progress 0..1. Clock runs 05:50 → 23:40.
  const K = [
    { t: 0.00, v: { skyTop: '#6e5a8e', skyBot: '#f7a072', wall: '#e9dcc9', desk: '#b8763f', deskEdge: '#8f5a2d', sill: '#efe6d5', frame: '#f6f1e7', far: '#8d7ca1', near: '#4f4466', sun: '#ffd37a', sunX: 720, sunY: 470, sunO: 1, moonO: 0, starsO: 0.2, lightsO: 0.55, lampO: 0, shadeO: 0, rainO: 0, cloudO: 0.3, steamO: 1, text: '#1b1a22', panelBg: 'rgba(244,239,228,0.92)', panelInk: '#1b1a22' } },
    { t: 0.11, v: { skyTop: '#7fb2d9', skyBot: '#dcebf2', wall: '#efe7d8', desk: '#bd7d45', deskEdge: '#915d2f', sill: '#f3ece0', frame: '#f8f4ec', far: '#a7b6c7', near: '#5c6a84', sun: '#ffe08a', sunX: 790, sunY: 330, sunO: 1, moonO: 0, starsO: 0, lightsO: 0.1, lampO: 0, shadeO: 0, rainO: 0, cloudO: 0.5, steamO: 1, text: '#1b1a22', panelBg: 'rgba(244,239,228,0.92)', panelInk: '#1b1a22' } },
    { t: 0.22, v: { skyTop: '#6f7f95', skyBot: '#aeb8c6', wall: '#e4e0d8', desk: '#b07343', deskEdge: '#85532b', sill: '#ebe6dd', frame: '#f1ede6', far: '#7f8a9b', near: '#444c5c', sun: '#fff1b0', sunX: 880, sunY: 230, sunO: 0.1, moonO: 0, starsO: 0, lightsO: 0.2, lampO: 0, shadeO: 0.05, rainO: 1, cloudO: 1, steamO: 0.9, text: '#1b1a22', panelBg: 'rgba(244,239,228,0.78)', panelInk: '#1b1a22' } },
    { t: 0.32, v: { skyTop: '#4d92d1', skyBot: '#bfe0f2', wall: '#f4efe4', desk: '#c2824a', deskEdge: '#946031', sill: '#f6f1e7', frame: '#faf7f1', far: '#9db2c6', near: '#4d5b73', sun: '#fff1b0', sunX: 950, sunY: 190, sunO: 1, moonO: 0, starsO: 0, lightsO: 0, lampO: 0, shadeO: 0, rainO: 0, cloudO: 0.5, steamO: 0.6, text: '#1b1a22', panelBg: 'rgba(244,239,228,0.92)', panelInk: '#1b1a22' } },
    { t: 0.44, v: { skyTop: '#8695a8', skyBot: '#c7ced7', wall: '#e8e4dc', desk: '#b07343', deskEdge: '#85532b', sill: '#ebe6dd', frame: '#f1ede6', far: '#8c96a6', near: '#48505f', sun: '#fff1b0', sunX: 1040, sunY: 200, sunO: 0.6, moonO: 0, starsO: 0, lightsO: 0.1, lampO: 0, shadeO: 0.02, rainO: 0, cloudO: 0.6, steamO: 0.2, text: '#1b1a22', panelBg: 'rgba(244,239,228,0.92)', panelInk: '#1b1a22' } },
    { t: 0.55, v: { skyTop: '#59647a', skyBot: '#97a2b3', wall: '#d9d5cf', desk: '#a46a3d', deskEdge: '#7a4b27', sill: '#dfdad2', frame: '#e8e4dd', far: '#6c7789', near: '#343b4a', sun: '#fff1b0', sunX: 1100, sunY: 260, sunO: 0.3, moonO: 0, starsO: 0, lightsO: 0.35, lampO: 0.2, shadeO: 0.08, rainO: 0.3, cloudO: 0.8, steamO: 0.8, text: '#1b1a22', panelBg: 'rgba(244,239,228,0.92)', panelInk: '#1b1a22' } },
    { t: 0.66, v: { skyTop: '#48386f', skyBot: '#f06a4f', wall: '#cfb9ab', desk: '#9c6238', deskEdge: '#704422', sill: '#dccdc0', frame: '#e6d9cc', far: '#5b497a', near: '#2a2440', sun: '#ffb25a', sunX: 1180, sunY: 500, sunO: 0.85, moonO: 0.2, starsO: 0.15, lightsO: 0.7, lampO: 0.45, shadeO: 0.16, rainO: 0.6, cloudO: 0.6, steamO: 0.5, text: '#1b1a22', panelBg: 'rgba(244,239,228,0.92)', panelInk: '#1b1a22' } },
    { t: 0.78, v: { skyTop: '#0f1230', skyBot: '#262a52', wall: '#4a3f4d', desk: '#6e4426', deskEdge: '#4b2d16', sill: '#8d7d74', frame: '#9a8a80', far: '#2a2648', near: '#15132a', sun: '#ffb25a', sunX: 1260, sunY: 600, sunO: 0, moonO: 1, starsO: 1, lightsO: 1, lampO: 1, shadeO: 0.32, rainO: 0.5, cloudO: 0.2, steamO: 1, text: '#f4efe4', panelBg: 'rgba(27,26,34,0.90)', panelInk: '#f4efe4' } },
    { t: 1.00, v: { skyTop: '#080a1e', skyBot: '#141738', wall: '#332c38', desk: '#5a371e', deskEdge: '#3b2311', sill: '#6b5e58', frame: '#776a62', far: '#1c1a34', near: '#0d0c1c', sun: '#ffb25a', sunX: 1260, sunY: 600, sunO: 0, moonO: 1, starsO: 1, lightsO: 0.25, lampO: 0.65, shadeO: 0.46, rainO: 0.2, cloudO: 0.1, steamO: 0.3, text: '#f4efe4', panelBg: 'rgba(27,26,34,0.90)', panelInk: '#f4efe4' } },
  ];

  /* cat positions per keyframe: [x, y, pose] — y is the surface the cat sits on */
  const SILL = 556, DESK = 650;
  const CATS = [
    { t: 0.00, caruso: [720, SILL, 'asleep'],  ddos: [1180, DESK + 30, 'asleep'] },
    { t: 0.11, caruso: [760, SILL, 'sit'],     ddos: [1180, DESK + 30, 'asleep'] },
    { t: 0.30, caruso: [900, SILL, 'lounge'],  ddos: [900, DESK + 12, 'loaf'] },
    { t: 0.44, caruso: [900, SILL, 'lounge'],  ddos: [330, DESK + 20, 'sit'] },
    { t: 0.55, caruso: [740, SILL, 'sit'],     ddos: [1140, SILL, 'sit'] },
    { t: 0.66, caruso: [740, SILL, 'loaf'],    ddos: [1140, SILL, 'sit'] },
    { t: 0.78, caruso: [720, SILL, 'asleep'],  ddos: [1200, DESK + 10, 'loaf'] },
    { t: 1.00, caruso: [720, SILL, 'asleep'],  ddos: [1200, DESK + 10, 'asleep'] },
  ];

  /* ---------- interpolation helpers ---------- */
  const parseColor = (s) => {
    if (s[0] === '#') {
      const n = parseInt(s.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
    }
    const m = s.match(/rgba?\(([^)]+)\)/);
    const p = m[1].split(',').map(Number);
    return [p[0], p[1], p[2], p[3] ?? 1];
  };
  const fmtColor = (c) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${c[3].toFixed(3)})`;
  const lerp = (a, b, u) => a + (b - a) * u;
  const ease = (u) => u * u * (3 - 2 * u); // smoothstep between keyframes
  const mix = (a, b, u) => {
    if (typeof a === 'number') return lerp(a, b, u);
    const ca = parseColor(a), cb = parseColor(b);
    return fmtColor(ca.map((v, i) => lerp(v, cb[i], u)));
  };

  const cssName = {
    skyTop: '--sky-top', skyBot: '--sky-bot', wall: '--wall', desk: '--desk', deskEdge: '--desk-edge', sill: '--sill', frame: '--frame',
    far: '--far', near: '--near', sun: '--sun', sunO: '--sun-o', moonO: '--moon-o', starsO: '--stars-o', lightsO: '--lights-o',
    lampO: '--lamp-o', shadeO: '--shade-o', rainO: '--rain-o', cloudO: '--cloud-o', steamO: '--steam-o',
    text: '--text-on-wall', panelBg: '--panel-bg', panelInk: '--panel-ink'
  };

  const root = document.documentElement;
  const sun = document.getElementById('sun'), sunGlow = document.getElementById('sunGlow'), moon = document.getElementById('moon');
  const caruso = document.getElementById('caruso'), ddos = document.getElementById('ddos');

  function segment(frames, t) {
    let i = 0;
    while (i < frames.length - 2 && t > frames[i + 1].t) i++;
    const a = frames[i], b = frames[i + 1];
    const u = ease(Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))));
    return [a, b, u];
  }

  function applyScene(t) {
    const [a, b, u] = segment(K, t);
    for (const k in a.v) {
      if (k === 'sunX' || k === 'sunY') continue;
      // panel/text colours flip in a short window instead of blending across the whole dusk
      if (k === 'text' || k === 'panelBg' || k === 'panelInk') {
        const NIGHT_AT = 0.735, W = 0.015;
        const nu = ease(Math.min(1, Math.max(0, (t - NIGHT_AT) / W)));
        root.style.setProperty(cssName[k], mix(K[0].v[k], K[K.length - 1].v[k], nu));
        continue;
      }
      const val = mix(a.v[k], b.v[k], u);
      root.style.setProperty(cssName[k], typeof val === 'number' ? val.toFixed(3) : val);
    }
    const sx = lerp(a.v.sunX, b.v.sunX, u), sy = lerp(a.v.sunY, b.v.sunY, u);
    sun.setAttribute('cx', sx); sun.setAttribute('cy', sy);
    sunGlow.setAttribute('cx', sx); sunGlow.setAttribute('cy', sy);
    moon.setAttribute('transform', `translate(${lerp(1200, 760, t)} ${lerp(260, 170, t)})`);

    // cats
    const [ca, cb, cu] = segment(CATS, t);
    placeCat(caruso, ca.caruso, cb.caruso, cu);
    placeCat(ddos, ca.ddos, cb.ddos, cu);
  }

  function placeCat(node, from, to, u) {
    const moving = from[0] !== to[0] || from[1] !== to[1];
    const x = lerp(from[0], to[0], u);
    const hop = moving ? Math.sin(u * Math.PI) * 70 : 0;
    const y = lerp(from[1], to[1], u) - hop;
    // squash & stretch: stretch on take-off, squash on landing
    let sx = 1, sy = 1;
    if (moving && u > 0 && u < 1) {
      const s = Math.sin(u * Math.PI * 2) * 0.10;
      sy = 1 + s; sx = 1 - s * 0.7;
    }
    // face the direction of travel (poses are drawn facing right-ish)
    const dir = node.dataset.dir || 1;
    node.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(sx * dir).toFixed(3)} ${sy.toFixed(3)})`);
    const pose = moving ? (u < 0.5 ? from[2] : to[2]) : to[2];
    if (node.dataset.pose !== pose) {
      node.dataset.pose = pose;
      node.querySelectorAll('.pose').forEach(p => p.classList.toggle('active', p.dataset.pose === pose));
    }
    node.classList.toggle('on-sill', Math.abs(to[1] - SILL) < 1);
  }

  // tails rotate around their base: set transform-origin from each path's M x y
  document.querySelectorAll('.caruso-tail, .ddos-tail').forEach(p => {
    const m = p.getAttribute('d').match(/M\s*(-?[\d.]+)\s+(-?[\d.]+)/);
    if (!m) return;
    const bb = p.getBBox(), sw = 9; // half stroke width
    const ox = ((+m[1] - (bb.x - sw)) / (bb.width + sw * 2)) * 100;
    const oy = ((+m[2] - (bb.y - sw)) / (bb.height + sw * 2)) * 100;
    p.style.transformOrigin = `${ox.toFixed(1)}% ${oy.toFixed(1)}%`;
  });

  /* ---------- scroll → progress with light smoothing ---------- */
  let target = 0, current = -1;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let forced = null; // ?p= test hook
  function onScroll() {
    if (forced !== null) { target = forced; return; }
    const max = document.documentElement.scrollHeight - innerHeight;
    target = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  }
  function tick() {
    if (current < 0) current = target;
    const next = reduced ? target : current + (target - current) * 0.085;
    if (Math.abs(next - current) > 0.00005 || current === target) {
      current = next;
      applyScene(current);
      Scene.progress = current;
      Scene.onChange.forEach(fn => fn(current));
    }
    requestAnimationFrame(tick);
  }

  const START = 5 * 60 + 50, END = 23 * 60 + 40;
  const Scene = {
    progress: 0,
    onChange: [],
    timeString(t = Scene.progress) {
      const m = Math.round(lerp(START, END, t));
      return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    }
  };
  Scene.force = (v) => { forced = v; onScroll(); current = target; applyScene(current); Scene.onChange.forEach(fn => fn(current)); };
  window.Scene = Scene;

  buildSkyline(); buildStars(); buildClouds(); buildRain();
  window.addEventListener('DOMContentLoaded', buildMiniSudoku);
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll(); applyScene(target); requestAnimationFrame(tick);

  // ?p=0.5 pins the scene to a point in the day (screenshots / sharing)
  const p = parseFloat(new URLSearchParams(location.search).get('p'));
  if (!Number.isNaN(p)) { forced = p; document.documentElement.classList.add('no-anim'); onScroll(); current = target; applyScene(current); }
})();
