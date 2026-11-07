(() => {
  'use strict';

  const PLACES = window.VAN_PLACES || [];
  const BASE = window.VAN_I18N;
  const TXT = window.VAN_LIVING_I18N;
  const G = window.VAN_GEO;
  const LANGS = ['en', 'zh'];
  const LANG_KEY = 'van-lang';
  const FAV_KEY = 'van-fav';
  const INTRO_KEY = 'van-living-intro';
  const SEASON_KEY = 'van-season';
  const INK = '#2d2a32';
  const TAU = Math.PI * 2;
  const FONT = "Fredoka, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', sans-serif";
  const EMOJI_FONT = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => innerWidth <= 820;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const QS = new URLSearchParams(location.search);

  /* ================= language ================= */
  function detectLang() {
    const u = QS.get('lang');
    if (LANGS.includes(u)) return u;
    try { const s = localStorage.getItem(LANG_KEY); if (LANGS.includes(s)) return s; } catch (e) { /* ignore */ }
    return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  }
  let lang = detectLang();
  const tx = (k) => { const v = TXT[lang][k]; return v === undefined ? TXT.en[k] : v; };
  const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (o[k] === undefined ? '' : o[k]));
  const placeText = (p, f) => (lang === 'zh' && BASE.places.zh[p.id] && BASE.places.zh[p.id][f]) || p[f];
  const nameOf = (p) => (lang === 'zh' ? p.zh : p.name);
  const subOf = (p) => (lang === 'zh' ? p.name : p.zh);
  const typeLabel = (p) => tx(p.type === 'food' ? 'food' : 'sight');

  /* ================= colour helpers ================= */
  const hex2rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const colorMemo = new Map();
  function shade(c, t) {
    const key = c + '|' + t;
    let v = colorMemo.get(key);
    if (!v) {
      const A = hex2rgb(c); const target = t < 0 ? 0 : 255; const a = Math.abs(t);
      v = `rgb(${A.map((x) => Math.round(x + (target - x) * a)).join(',')})`;
      colorMemo.set(key, v);
    }
    return v;
  }
  const mix = (a, b, t) => { const A = hex2rgb(a); const B = hex2rgb(b); return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(',')})`; };

  /* ================= seasons ================= */
  const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
  const SEASON_ICON = { spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️', auto: '🔄' };
  let season = 'summer'; let autoSeason = false; let autoSeasonClock = 0;
  (() => {
    let s = QS.get('season');
    if (!s) { try { s = localStorage.getItem(SEASON_KEY); } catch (e) { /* ignore */ } }
    if (SEASONS.includes(s)) season = s; else if (s === 'auto') autoSeason = true;
  })();
  const GROUND = { spring: '#a9dc8a', summer: '#9fd67f', autumn: '#c3d57b', winter: '#d3e6cf' };
  const SNOW_AMT = { spring: 0.75, summer: 0.3, autumn: 0.55, winter: 1 };

  /* ================= districts ================= */
  const DIST = {
    dt:    { c: '#e8503a' }, park: { c: '#3fb68b' }, west: { c: '#ffc93c' }, north: { c: '#7ccbf5' },
    rich:  { c: '#ff9ebb' }, sky: { c: '#8f7be0' }, isl: { c: '#ff9a4d' }, val: { c: '#9bbf5a' },
  };
  const ORDER = ['dt', 'park', 'west', 'north', 'rich', 'sky', 'isl', 'val'];

  // which little neighbourhood a place belongs to (people only wander inside their own)
  const GRP_OF = {};
  const GROUPS = {
    squamish: ['shannon', 'gondola', 'chief', 'brew'], whistler: ['whistler', 'peak2peak', 'fondue'],
    victoria: ['innerharbour', 'empress', 'parliament', 'rbcm', 'craigdarroch', 'wharf', 'vicchina', 'tea', 'fishwharf', 'butchart'],
    nanaimo: ['nanaimo', 'nanaimobar'], hope: ['hope', 'hopepie', 'othello'], langley: ['langley', 'berries', 'valleyfarm'], harrison: ['harrison', 'bridalveil'],
  };
  const DEFAULT_GRP = { dt: 'dt', park: 'dt', west: 'west', north: 'north', rich: 'rich', sky: 'sea2sky', isl: 'victoria', val: 'langley' };
  PLACES.forEach((p) => {
    for (const k of Object.keys(GROUPS)) if (GROUPS[k].includes(p.id)) { GRP_OF[p.id] = k; return; }
    GRP_OF[p.id] = DEFAULT_GRP[p.d];
  });

  const KIND = {
    rmstation: { k: 'station' }, canadaplace: { k: 'sails' }, gastown: { k: 'clock' }, scienceworld: { k: 'dome', c: '#cfd8e3' },
    chinatown: { k: 'paifang', roof: '#e8503a' }, stanley: { k: 'totem' }, aquarium: { k: 'hall', roof: '#3a8fc7', wall: '#e6f1fb', gable: true },
    lionsgate: { k: 'bridge' }, englishbay: { k: 'inukshuk' }, granville: { k: 'hall', roof: '#ff9a4d', wall: '#fff1d6', gable: true, big: true },
    kits: { k: 'beach' }, qe: { k: 'dome', c: '#9be3c4', pink: true }, vandusen: { k: 'garden' }, moa: { k: 'hall', roof: '#8a8f98', wall: '#d8d4cc', flat: true, big: true },
    capilano: { k: 'bridge2' }, grouse: { k: 'lodge', cable: true }, cypress: { k: 'lodge' }, seymour: { k: 'lodge' }, lynn: { k: 'bridge2' }, deepcove: { k: 'dock', c: '#e8503a' },
    steveston: { k: 'dock', c: '#3a6fc7' }, buddhist: { k: 'hall', roof: '#e8a02e', wall: '#e8503a', chinese: true, big: true },
    horseshoe: { k: 'dock', c: '#ffffff', ferry: true }, britannia: { k: 'mine' }, shannon: { k: 'falls' }, gondola: { k: 'lodge', cable: true }, chief: { k: 'rock' },
    brandywine: { k: 'falls' }, garibaldi: { k: 'rock', lake: true }, whistler: { k: 'village' }, peak2peak: { k: 'lodge', cable: true },
    innerharbour: { k: 'dock', c: '#e8503a', ferry: true }, empress: { k: 'hall', roof: '#4fae9a', wall: '#d9c7a1', gable: true, ivy: true, big: true },
    parliament: { k: 'capitol' }, rbcm: { k: 'hall', roof: '#7d8a96', wall: '#f3e3c2', gable: true }, butchart: { k: 'garden' },
    craigdarroch: { k: 'castle' }, wharf: { k: 'dock', c: '#ff9ebb', houses: true }, vicchina: { k: 'paifang', roof: '#c8553d' }, nanaimo: { k: 'dock', c: '#3fb68b' },
    langley: { k: 'fort' }, bridalveil: { k: 'falls' }, harrison: { k: 'spa' }, hope: { k: 'village', hope: true }, othello: { k: 'arch' },
  };
  const WALLS = ['#fff1d6', '#ffe9c9', '#fde2e4', '#e3f4ec', '#e6f1fb', '#fff6c9'];

  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  /* ================= geography (world px) ================= */
  const WORLD = { x0: -2250, y0: -2650, x1: 3100, y1: 2700 };
  const POLY = {
    main: G.px(G.MAIN, true), island: G.px(G.ISLAND, true), olympic: G.px(G.US_OLYMPIC, true),
    islets: G.ISLETS.map((p) => G.px(p, true)), isletLand: G.ISLET_LAND.map((p) => G.px(p, true, 1)),
    water: Object.entries(G.WATER).map(([k, v]) => ({ k, pts: G.px(v, true) })),
  };
  const RIVER = {
    fraser: G.px(G.RIVERS.fraser, false, 2), north: G.px(G.RIVERS.north, false, 2), canyon: G.px(G.RIVERS.canyon, false, 2),
  };
  const km = (x, y) => G.P(x, y);
  const kmPoly = (pts, closed) => G.px(pts, closed, 1);
  const bbox = (poly) => poly.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])], [1e9, 1e9, -1e9, -1e9]);
  [POLY.main, POLY.island, POLY.olympic, ...POLY.islets, ...POLY.isletLand, ...POLY.water.map((w) => w.pts)].forEach((pl) => { pl.bb = bbox(pl); });
  const inP = (pl, x, y) => (x >= pl.bb[0] && x <= pl.bb[2] && y >= pl.bb[1] && y <= pl.bb[3] && G.inPoly(pl, x, y));
  // land mask: the exact polygons are rasterised once so every later land test is a pixel lookup
  const MS = 6;
  const MW = Math.ceil((WORLD.x1 - WORLD.x0) / MS); const MH = Math.ceil((WORLD.y1 - WORLD.y0) / MS);
  const maskData = (() => {
    const c = document.createElement('canvas'); c.width = MW; c.height = MH; const q = c.getContext('2d', { willReadFrequently: true });
    q.fillStyle = '#000'; q.fillRect(0, 0, MW, MH);
    const path = (pl) => { q.beginPath(); pl.forEach((p, i) => { const x = (p[0] - WORLD.x0) / MS; const y = (p[1] - WORLD.y0) / MS; if (i) q.lineTo(x, y); else q.moveTo(x, y); }); q.closePath(); };
    q.fillStyle = '#fff'; [POLY.main, POLY.island, POLY.olympic, ...POLY.islets].forEach((pl) => { path(pl); q.fill(); });
    q.fillStyle = '#000'; POLY.water.forEach((w) => { path(w.pts); q.fill(); });
    q.fillStyle = '#fff'; POLY.isletLand.forEach((pl) => { path(pl); q.fill(); });
    return q.getImageData(0, 0, MW, MH).data;
  })();
  function isLand(x, y) {
    const i = Math.floor((x - WORLD.x0) / MS); const j = Math.floor((y - WORLD.y0) / MS);
    if (i < 0 || j < 0 || i >= MW || j >= MH) return false;
    return maskData[(j * MW + i) * 4] > 127;
  }
  const segDist = (px, py, s) => {
    const dx = s[2] - s[0]; const dy = s[3] - s[1]; const L2 = dx * dx + dy * dy || 1;
    const t = clamp(((px - s[0]) * dx + (py - s[1]) * dy) / L2, 0, 1); return Math.hypot(px - (s[0] + dx * t), py - (s[1] + dy * t));
  };
  const polyDist = (line, x, y) => { let m = 1e9; for (let i = 1; i < line.length; i++) m = Math.min(m, segDist(x, y, [line[i - 1][0], line[i - 1][1], line[i][0], line[i][1]])); return m; };
  const nearRiver = (x, y, m) => Object.values(RIVER).some((r) => polyDist(r, x, y) < 18 + m);
  const nearWaterPoly = (x, y, m) => !isLand(x, y) || [[m, 0], [-m, 0], [0, m], [0, -m]].some(([a, b]) => !isLand(x + a, y + b));
  const blocked = (x, y, m) => nearWaterPoly(x, y, m) || nearRiver(x, y, m);

  // zones used for scenery: mountains vs valley vs lowland
  const Z = {
    coast: kmPoly([[-32, -12], [-8, -9], [30, -8], [40, -4], [60, 3], [85, 3], [100, -1], [128, -3], [135, -140], [-32, -140]], true),
    cascade: kmPoly([[65, 38], [150, 38], [150, 160], [65, 160]], true),
    islMtn: kmPoly([[-195, -145], [-185, -110], [-165, -68], [-140, -40], [-110, -12], [-90, 8], [-75, 22], [-62, 40], [-55, 62], [-50, 80], [-48, 92], [-70, 98], [-100, 86], [-195, 52]], true),
    valley: kmPoly([[25, 6], [40, 5], [60, 10], [85, 10], [97, 4], [112, 2], [117, 5], [110, 12], [85, 20], [62, 28], [45, 29], [26, 29]], true),
    delta: kmPoly([[-3, 22], [8, 18], [20, 26], [22, 29], [-2, 29]], true),
    sea2sky: null,
  };
  Object.values(Z).forEach((pl) => { if (pl) pl.bb = bbox(pl); });
  const isMtn = (x, y) => isLand(x, y) && (inP(Z.coast, x, y) || inP(Z.cascade, x, y) || inP(Z.islMtn, x, y) || inP(POLY.olympic, x, y));
  const isFarm = (x, y) => isLand(x, y) && (inP(Z.valley, x, y) || inP(Z.delta, x, y));

  /* ================= places -> world positions ================= */
  const buildings = [];
  const bById = new Map();
  const PINNED = new Set(['rmstation', 'canadaplace', 'stanley', 'gondola', 'whistler', 'hope', 'empress', 'nanaimo', 'langley', 'steveston', 'capilano', 'granville']);
  const VICT = km(-18.2, 96); // Victoria anchor; the harbour cluster is laid out by hand around it
  const OVERRIDE = (() => {
    const o = {}; const v = VICT;
    const at = (id, dx, dy) => { o[id] = [v[0] + dx, v[1] + dy]; };
    at('innerharbour', 0, 6); at('empress', 96, -34); at('parliament', -88, 30); at('rbcm', -42, -56); at('craigdarroch', 214, -66);
    at('wharf', -150, 106); at('vicchina', 40, -140); at('tea', 140, 36); at('fishwharf', -112, 30);
    return o;
  })();
  PLACES.forEach((p, idx) => {
    const kind = KIND[p.id] || { k: 'shop' };
    const [x, y] = OVERRIDE[p.id] || G.PLL(p.lat, p.lng);
    const b = { p, id: p.id, dist: p.d, grp: GRP_OF[p.id], x, y, x0: x, y0: y, kind, idx, hit: null };
    const k = kind.k;
    if (k === 'shop') { b.h = 24 + ((idx * 37) % 5) * 5; b.w = 50; b.hh = b.h + 22; }
    else if (k === 'dome') { b.w = 70; b.hh = 70; } else if (k === 'sails') { b.w = 100; b.hh = 66; } else if (k === 'clock') { b.w = 50; b.hh = 88; }
    else if (k === 'station') { b.w = 100; b.hh = 62; } else if (k === 'bridge') { b.w = 112; b.hh = 80; } else if (k === 'bridge2') { b.w = 100; b.hh = 56; }
    else if (k === 'lodge') { b.w = 70; b.hh = 62; } else if (k === 'village') { b.w = 100; b.hh = 70; } else if (k === 'castle') { b.w = 76; b.hh = 80; }
    else if (k === 'capitol') { b.w = 92; b.hh = 82; } else if (k === 'rock') { b.w = 80; b.hh = 86; } else if (k === 'falls') { b.w = 62; b.hh = 80; }
    else if (k === 'paifang') { b.w = 72; b.hh = 56; } else if (k === 'totem') { b.w = 64; b.hh = 82; } else if (k === 'inukshuk') { b.w = 52; b.hh = 56; }
    else { b.w = kind.big ? 84 : 70; b.hh = kind.big ? 62 : 54; }
    b.wall = kind.wall || WALLS[idx % WALLS.length];
    buildings.push(b); bById.set(p.id, b);
  });
  // nudge crowded buildings apart (they stay close to where they really are)
  const WATERKIND = new Set(['bridge', 'dock', 'sails', 'beach']);
  for (let it = 0; it < 1200; it++) {
    for (let i = 0; i < buildings.length; i++) for (let j = i + 1; j < buildings.length; j++) {
      const a = buildings[i]; const b = buildings[j];
      const sxx = (a.w + b.w) / 2 + 26; const syy = Math.max(60, (a.hh + b.hh) / 2);
      let dx = b.x - a.x; let dy = b.y - a.y; const m = Math.hypot(dx / sxx, dy / syy);
      if (m >= 1) continue;
      if (m < 1e-6) { dx = 1; dy = 0.3; }
      const L = Math.hypot(dx / sxx, dy / syy) || 1; const k = (1 - m) * 0.5;
      const mx = (dx / sxx / L) * sxx * k; const my = (dy / syy / L) * syy * k;
      const pa = PINNED.has(a.id) || OVERRIDE[a.id]; const pb = PINNED.has(b.id) || OVERRIDE[b.id];
      if (!pa) { a.x -= pb ? mx * 2 : mx; a.y -= pb ? my * 2 : my; }
      if (!pb) { b.x += pa ? mx * 2 : mx; b.y += pa ? my * 2 : my; }
    }
    for (const a of buildings) {
      if (PINNED.has(a.id) || OVERRIDE[a.id]) continue;
      a.x += (a.x0 - a.x) * 0.004; a.y += (a.y0 - a.y) * 0.004;
      if (!WATERKIND.has(a.kind.k) && !isLand(a.x, a.y + 6)) { a.x += (a.x0 - a.x) * 0.35; a.y += (a.y0 - a.y) * 0.35; }
    }
  }
  buildings.forEach((b) => { b.x = Math.round(b.x); b.y = Math.round(b.y); });
  ORDER.forEach((k) => { DIST[k].count = buildings.filter((b) => b.dist === k).length; });
  const doorOf = (b) => [b.x, b.y + 16];
  const groupMembers = (g) => buildings.filter((b) => b.grp === g);

  /* ================= projected lines ================= */
  function mkLine(pts) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, cum, len: cum[cum.length - 1] };
  }
  function posAt(L, s) {
    s = clamp(s, 0, L.len); let lo = 0; let hi = L.cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L.cum[m] <= s) lo = m; else hi = m; }
    const a = L.pts[lo]; const b = L.pts[hi]; const t = (s - L.cum[lo]) / ((L.cum[hi] - L.cum[lo]) || 1);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, b[0] - a[0], b[1] - a[1]];
  }
  function nearestS(L, x, y) {
    let best = 1e9; let bs = 0;
    for (let i = 0; i < L.pts.length; i++) { const d = Math.hypot(L.pts[i][0] - x, L.pts[i][1] - y); if (d < best) { best = d; bs = L.cum[i]; } }
    return bs;
  }
  const HW = {}; Object.keys(G.HWY).forEach((k) => { HW[k] = mkLine(G.px(G.HWY[k], false, 1)); });
  const RL = {}; Object.keys(G.RAIL).forEach((k) => { RL[k] = mkLine(G.px(G.RAIL[k], false, 1)); });
  const FY = {}; Object.keys(G.FERRY).forEach((k) => { FY[k] = mkLine(G.px(G.FERRY[k], false, 1)); });
  const roadCells = new Set();
  const rcKey = (x, y) => Math.round(x / 26) * 100003 + Math.round(y / 26);
  [...Object.values(HW), ...Object.values(RL)].forEach((L) => {
    for (let s = 0; s <= L.len; s += 10) {
      const [x, y] = posAt(L, s);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) roadCells.add(rcKey(x + a * 26, y + b * 26));
    }
  });
  const onRoad = (x, y) => roadCells.has(rcKey(x, y));
  const nearBuilding = (x, y, r) => buildings.some((b) => Math.abs(b.x - x) < r + b.w / 2 && Math.abs(b.y - 10 - y) < (r + b.hh / 2) * 0.8);

  /* ================= land paths (grid A*) ================= */
  const CELL = 22;
  const walkMemo = new Map();
  function walkAt(cx, cy) {
    const k = cx * 100003 + cy; let v = walkMemo.get(k);
    if (v === undefined) { const x = cx * CELL; const y = cy * CELL; v = isLand(x, y) && !nearRiver(x, y, -5); walkMemo.set(k, v); }
    return v;
  }
  const walkXY = (x, y) => walkAt(Math.round(x / CELL), Math.round(y / CELL));
  function clearLine(x0, y0, x1, y1) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 9);
    for (let i = 1; i < n; i++) if (!walkXY(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n)) return false;
    return true;
  }
  function snapCell(x, y) {
    const cx = Math.round(x / CELL); const cy = Math.round(y / CELL);
    if (walkAt(cx, cy)) return [cx, cy];
    for (let r = 1; r <= 7; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
      if (Math.max(Math.abs(a), Math.abs(b)) !== r) continue;
      if (walkAt(cx + a, cy + b)) return [cx + a, cy + b];
    }
    return null;
  }
  function findPath(x0, y0, x1, y1) {
    if (clearLine(x0, y0, x1, y1)) return [[x1, y1]];
    const s = snapCell(x0, y0); const e = snapCell(x1, y1);
    if (!s || !e) return [[x1, y1]];
    const lox = Math.min(s[0], e[0]) - 40; const hix = Math.max(s[0], e[0]) + 40; const loy = Math.min(s[1], e[1]) - 40; const hiy = Math.max(s[1], e[1]) + 40;
    const key = (cx, cy) => cx * 100003 + cy;
    const gs = new Map(); const from = new Map(); const heap = [];
    const hpush = (n) => { heap.push(n); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const hpop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1; const r = l + 1; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    gs.set(key(s[0], s[1]), 0); hpush([0, s[0], s[1]]);
    let found = false; let guard = 0;
    while (heap.length && guard++ < 9000) {
      const [, cx, cy] = hpop(); const cg = gs.get(key(cx, cy));
      if (cx === e[0] && cy === e[1]) { found = true; break; }
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        if (!a && !b) continue; const nx = cx + a; const ny = cy + b;
        if (nx < lox || nx > hix || ny < loy || ny > hiy || !walkAt(nx, ny)) continue;
        if (a && b && (!walkAt(cx + a, cy) || !walkAt(cx, cy + b))) continue;
        const ng = cg + (a && b ? 1.41 : 1); const nk = key(nx, ny);
        if (gs.has(nk) && gs.get(nk) <= ng) continue;
        gs.set(nk, ng); from.set(nk, [cx, cy]); hpush([ng + Math.hypot(e[0] - nx, e[1] - ny), nx, ny]);
      }
    }
    if (!found) return [[x1, y1]];
    const cells = []; let cur = [e[0], e[1]];
    while (cur) { cells.push(cur); cur = from.get(key(cur[0], cur[1])); }
    cells.reverse();
    let pts = cells.map((c) => [c[0] * CELL, c[1] * CELL]);
    pts[0] = [x0, y0];
    // string-pull
    const out = []; let i = 0;
    while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !clearLine(pts[i][0], pts[i][1], pts[j][0], pts[j][1])) j--; out.push(pts[j]); i = j; }
    out.push([x1, y1]);
    return out;
  }

  /* ================= scenery ================= */
  const statics = [];
  const hashN = (x, y) => { const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return v - Math.floor(v); };
  const TOWNS = (() => {
    const t = [];
    const add = (lat, lng, r, d, kind) => { const [x, y] = G.PLL(lat, lng); t.push({ x, y, r, d, kind }); };
    const m = km(0, 0); t.push({ x: m[0], y: m[1], r: 960, d: 1, kind: 'metro' });
    add(48.4284, -123.3656, 340, 1, 'city'); add(49.7016, -123.1558, 230, 0.9, 'town'); add(50.1163, -122.9574, 200, 1, 'ski');
    add(49.3832, -121.4420, 190, 0.9, 'town'); add(49.1659, -123.9401, 170, 0.9, 'town'); add(49.1042, -122.6604, 150, 0.8, 'town');
    add(49.0504, -122.3045, 150, 0.8, 'town'); add(49.1579, -121.9515, 140, 0.8, 'town'); add(48.7787, -123.7079, 120, 0.8, 'town');
    add(49.1913, -122.8490, 220, 0.9, 'town'); add(49.2004, -122.9110, 90, 0.8, 'town'); add(48.5009, -123.4189, 100, 0.7, 'town');
    return t;
  })();
  const urban = (x, y) => { let v = 0; for (const t of TOWNS) { const d = Math.hypot(x - t.x, y - t.y); if (d < t.r) v = Math.max(v, (1 - d / t.r) * t.d + 0.15); } return v; };
  const townAt = (x, y) => { let best = null; let bv = 0; for (const t of TOWNS) { const d = Math.hypot(x - t.x, y - t.y); const v = d < t.r ? 1 - d / t.r : 0; if (v > bv) { bv = v; best = t; } } return best; };

  const HOUSE_COL = ['#fde2e4', '#fff1d6', '#e3f4ec', '#e6f1fb', '#fff6c9', '#f0e4ff', '#ffe3cc'];
  const ROOF_COL = ['#c8553d', '#7d8a96', '#4a6fa5', '#8a5a3c', '#5c8a6a', '#a64d4d'];
  const metroC = km(0, 0);
  const TOWER_C = km(-0.7, -0.6);
  // houses & towers
  for (let gx = WORLD.x0; gx < WORLD.x1; gx += 54) for (let gy = WORLD.y0; gy < WORLD.y1; gy += 54) {
    const x = gx + (hashN(gx, gy) - 0.5) * 38; const y = gy + (hashN(gy, gx) - 0.5) * 38;
    const u = urban(x, y); if (u <= 0.12 || hashN(x * 1.7, y) > 0.35 + u * 0.6) continue;
    if (!isLand(x, y) || nearRiver(x, y, 10) || onRoad(x, y) || nearWaterPoly(x, y, 14) || nearBuilding(x, y, 44) || isMtn(x, y)) continue;
    const town = townAt(x, y);
    const downtown = Math.hypot(x - TOWER_C[0], y - TOWER_C[1]) < 190;
    if (downtown) continue;
    const kind = town && town.kind === 'ski' ? 'chalet' : (u > 0.7 && hashN(y, x) > 0.82 ? 'mid' : 'house');
    const h = { x, y, kind, c: HOUSE_COL[Math.floor(hashN(x, y * 3) * 7)], rc: ROOF_COL[Math.floor(hashN(y, x * 5) * 6)], s: 0.85 + hashN(x * 3, y) * 0.35, k: hashN(y * 9, x) };
    statics.push({ x, y, m: 60, lod: 0.15, f: (X, Y, k) => drawHouse(h, X, Y, k) });
  }
  const TOWERS = [];
  [[TOWER_C, 190, 36], [km(5.3, 6.8), 70, 40], [km(-2.5, 13.2), 60, 40], [km(-0.2, -2.0), 40, 40]].forEach(([c, r, sp]) => {
    for (let gx = c[0] - r; gx < c[0] + r; gx += sp) for (let gy = c[1] - r; gy < c[1] + r; gy += sp * 0.8) {
      const x = gx + (hashN(gx, gy) - 0.5) * 14; const y = gy + (hashN(gy, gx) - 0.5) * 12;
      if (Math.hypot(x - c[0], y - c[1]) > r || !isLand(x, y) || nearWaterPoly(x, y, 12) || nearBuilding(x, y, 56) || hashN(x, y * 2) > 0.8) continue;
      const t = { x, y, w: 22 + hashN(x, y) * 14, h: 70 + hashN(y, x * 2) * (c === TOWER_C ? 120 : 60), c: pick(['#8ecfe0', '#a9d8ea', '#7fb9d6', '#b8dfe6', '#9cc6e0']), k: hashN(x * 5, y) };
      TOWERS.push(t); statics.push({ x, y, m: 90 + t.h, lod: 0.12, f: (X, Y, k) => drawTowerBlock(t, X, Y, k) });
    }
  });

  // trees (street, parks, forests)
  const PARKS = [['stanley', 190], ['qe', 110], ['vandusen', 110], ['butchart', 90], ['kits', 60], ['langley', 80]];
  const parkAt = (x, y) => PARKS.some(([id, r]) => { const b = bById.get(id); return b && Math.hypot(b.x - x, (b.y - y) * 1.3) < r; });
  const trees = [];
  function addTree(x, y, type) {
    const t = { x, y, type, s: 0.8 + hashN(x, y) * 0.55, c: hashN(y, x * 3) };
    trees.push(t); statics.push({ x, y, m: 50, lod: 0.2, f: (X, Y, k) => drawTreeN(t, X, Y, k) });
  }
  for (let gx = WORLD.x0; gx < WORLD.x1; gx += 38) for (let gy = WORLD.y0; gy < WORLD.y1; gy += 34) {
    const x = gx + (hashN(gx, gy * 2) - 0.5) * 30; const y = gy + (hashN(gy, gx * 2) - 0.5) * 28;
    const u = urban(x, y); const mtn = isMtn(x, y); const farm = isFarm(x, y);
    let p = 0; let type = 'dec';
    if (parkAt(x, y)) { p = 0.9; type = hashN(x, y) < 0.6 ? 'con' : 'dec'; }
    else if (mtn) { p = 0.5; type = 'con'; }
    else if (farm) p = 0.06;
    else if (u > 0.1) p = 0.16 + u * 0.1; else p = 0.45;
    if (hashN(x * 7, y * 3) > p) continue;
    if (!isLand(x, y) || nearRiver(x, y, 8) || onRoad(x, y) || nearWaterPoly(x, y, 8) || nearBuilding(x, y, 36)) continue;
    if (Math.hypot(x - TOWER_C[0], y - TOWER_C[1]) < 150 && !parkAt(x, y)) continue;
    if (!mtn && type === 'dec' && hashN(x * 3, y * 9) < 0.55 && u > 0.1) type = 'cherry';
    addTree(x, y, type);
  }
  // cherry-blossom avenues around the blossom spots
  ['qe', 'vandusen', 'kits', 'stanley', 'chinatown'].forEach((id) => {
    const b = bById.get(id); if (!b) return;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU; const x = b.x + Math.cos(a) * (70 + (i % 3) * 14); const y = b.y + Math.sin(a) * 40 + 20;
      if (isLand(x, y) && !nearWaterPoly(x, y, 10) && !nearBuilding(x, y, 30)) addTree(x, y, 'cherry');
    }
  });

  /* ---- mountains ---- */
  const BIGM = [];
  const bigAt = (id, dx, dy, w, h, o) => { const b = bById.get(id); if (b) BIGM.push(Object.assign({ x: b.x + dx, y: b.y + dy, w, h, anchor: id }, o)); };
  bigAt('cypress', -60, -70, 250, 215, { name: 'Cypress', runs: 3, ski: true });
  bigAt('grouse', 10, -90, 270, 235, { name: 'Grouse', runs: 4, ski: true });
  bigAt('seymour', 70, -70, 250, 205, { name: 'Seymour', runs: 3, ski: true });
  bigAt('whistler', -150, -150, 340, 270, { name: 'Whistler', runs: 5, ski: true });
  bigAt('whistler', 210, -170, 320, 260, { name: 'Blackcomb', runs: 5, ski: true });
  bigAt('gondola', 120, -110, 260, 220, { name: 'Habrich', runs: 0 });
  bigAt('garibaldi', 40, -80, 280, 240, { name: 'Black Tusk', runs: 0, tusk: true });
  (() => { const [x, y] = G.PLL(48.7771, -121.8132); BIGM.push({ x, y, w: 560, h: 440, name: 'Baker', runs: 0, baker: true }); })();
  (() => { const [x, y] = G.PLL(49.2183, -122.4930); BIGM.push({ x, y, w: 210, h: 160, name: 'Golden Ears', runs: 0 }); })();
  (() => { const [x, y] = G.PLL(49.2514, -125.3033); BIGM.push({ x, y, w: 300, h: 230, name: 'Arrowsmith', runs: 0 }); })();
  BIGM.forEach((m, i) => {
    m.id = i; m.runsPts = [];
    for (let r = 0; r < m.runs; r++) { // a ski run is a zig-zag from near the summit to the base
      const side = r % 2 ? 1 : -1; const off = (r - (m.runs - 1) / 2) * 0.2;
      m.runsPts.push([[off * m.w * 0.25, -m.h * 0.82], [off * m.w * 0.5 + side * 8, -m.h * 0.55], [off * m.w * 0.78 - side * 10, -m.h * 0.3], [off * m.w * 0.95 + side * 6, -6]]);
    }
    m.skiers = [];
    if (m.ski) for (let s = 0; s < 3; s++) m.skiers.push({ run: s % m.runs, t: (s * 0.37 + hashN(i, s)) % 1, v: 0.09 + hashN(s, i) * 0.04 });
    statics.push({ x: m.x, y: m.y, m: m.h + 60, wide: m.w, f: (X, Y, k) => drawBigMountain(m, X, Y, k) });
  });
  const nearBig = (x, y) => BIGM.some((m) => Math.abs(m.x - x) < m.w * 0.55 + 40 && y < m.y + 40 && y > m.y - 70);
  const PEAKS = [];
  for (let gx = WORLD.x0; gx < WORLD.x1; gx += 108) for (let gy = WORLD.y0; gy < WORLD.y1; gy += 76) {
    const x = gx + (hashN(gx * 3, gy) - 0.5) * 80; const y = gy + (hashN(gy * 3, gx) - 0.5) * 54;
    if (!isMtn(x, y) || nearWaterPoly(x, y, 24) || nearRiver(x, y, 20) || onRoad(x, y) || nearBuilding(x, y, 60) || nearBig(x, y)) continue;
    if (hashN(x, y * 5) > 0.82) continue;
    const e = { x, y, w: 90 + hashN(x, y) * 80, h: 60 + hashN(y, x) * 85, k: hashN(x * 2, y * 2) };
    // peaks get taller towards the middle of the ranges (deeper inland)
    PEAKS.push(e); statics.push({ x, y, m: e.h + 40, wide: e.w, f: (X, Y, k) => drawPeak(e, X, Y, k) });
  }
  // POI scenery objects (buildings, lamps etc.)
  buildings.forEach((b) => statics.push({ x: b.x, y: b.y + 6, m: 150, wide: b.w, f: () => drawBuilding(b), b }));

  // teleport portal, beside the Rocky Mountaineer station
  const PORTAL = (() => {
    const s = bById.get('rmstation') || buildings[0];
    for (let r = 70; r < 420; r += 20) for (let a = 0; a < 20; a++) {
      const ang = Math.PI * 0.5 + (a / 20) * TAU; const x = Math.round(s.x + Math.cos(ang) * r * 1.3); const y = Math.round(s.y + Math.sin(ang) * r * 0.8);
      if (isLand(x, y + 8) && !nearWaterPoly(x, y, 18) && !onRoad(x, y) && !nearRiver(x, y, 14) && !nearBuilding(x, y, 52)) return { x, y };
    }
    return { x: s.x - 150, y: s.y + 60 };
  })();
  if (window.TELE) statics.push({ x: PORTAL.x, y: PORTAL.y, m: 110, wide: 90, f: (X, Y, k) => window.TELE.draw(g, X, Y, k, time, env.n) });

  // cables (gondolas)
  const CABLES = [];
  const cableAt = (id, a, b, name) => { const bl = bById.get(id); if (bl) CABLES.push({ id, name, a: [bl.x + a[0], bl.y + a[1], a[2]], b: [bl.x + b[0], bl.y + b[1], b[2]], cabins: [0, 0.5].map((t, i) => ({ t, d: i ? -1 : 1 })), v: 0.045 }); };
  cableAt('gondola', [8, 6, 14], [150, -128, 190]);
  cableAt('peak2peak', [-170, -26, 150], [170, -34, 170]);
  cableAt('grouse', [0, 4, 14], [28, -128, 150]);
  cableAt('whistler', [-60, 0, 14], [-170, -120, 150]);

  /* ---- fields in the valley and the delta ---- */
  const FIELDS = [];
  for (let gx = WORLD.x0; gx < WORLD.x1; gx += 52) for (let gy = WORLD.y0; gy < WORLD.y1; gy += 40) {
    const x = gx + 4; const y = gy + 4;
    if (!isFarm(x, y) || nearWaterPoly(x, y, 26) || nearRiver(x, y, 16) || onRoad(x, y) || nearBuilding(x, y, 40) || urban(x, y) > 0.35) continue;
    FIELDS.push({ x, y, w: 48, h: 36, v: Math.floor(hashN(x, y) * 4), orient: hashN(y, x) > 0.5 });
  }

  /* ================= vehicles / boats / trains data ================= */
  const CARCOL = ['#e8503a', '#3a8fc7', '#ffc93c', '#ffffff', '#3fb68b', '#8f7be0', '#2b2b3a', '#ff9a4d'];
  const cars = [];
  [['sea2sky', 5], ['hwy1', 7], ['hwy99s', 3], ['isl17', 2], ['island1', 3]].forEach(([k, n]) => {
    for (let i = 0; i < n; i++) cars.push({ L: HW[k], s: hashN(i, k.length) * HW[k].len, dir: i % 2 ? -1 : 1, v: 26 + hashN(k.length, i) * 16, col: CARCOL[(i * 3 + k.length) % 8], bus: i === 1 && k === 'hwy1' });
  });

  // trains (Rocky Mountaineer): two routes, each makes a round trip with stops
  const stopS = (L, id) => { const b = bById.get(id); return b ? nearestS(L, b.x, b.y + 10) : L.len * 0.5; };
  const TRAINS = [
    { id: 'coastal', L: RL.whistler, s: 0, dir: 1, v: 46, cars: 7, state: 'run', wait: 0, stops: [stopS(RL.whistler, 'gondola'), RL.whistler.len - 6], from: 0 },
    { id: 'rockies', L: RL.east, s: RL.east.len * 0.35, dir: 1, v: 52, cars: 8, state: 'run', wait: 0, stops: [stopS(RL.east, 'hope'), RL.east.len - 6], from: 0 },
  ];
  TRAINS.forEach((t) => { t.stops.sort((a, b) => a - b); });

  const SHIPS = [];
  SHIPS.push({ id: 'hb', L: FY.hb, s: 0, dir: 1, v: 34, wait: 3, kind: 'ferry', name: 'Horseshoe Bay ⇄ Nanaimo' });
  SHIPS.push({ id: 'tsa', L: FY.tsa, s: FY.tsa.len * 0.55, dir: -1, v: 34, wait: 0, kind: 'ferry', name: 'Tsawwassen ⇄ Swartz Bay' });
  // anchored cargo ships in English Bay and a cruise ship at Canada Place
  const eb = bById.get('englishbay');
  const waterNear = (x, y, minR, maxR) => {
    for (let r = minR; r <= maxR; r += 8) for (let a = 0; a < 16; a++) {
      const px_ = x + Math.cos((a / 16) * TAU) * r; const py_ = y + Math.sin((a / 16) * TAU) * r * 0.8;
      if (!isLand(px_, py_) && !nearWaterPoly(px_, py_, -1)) {
        let ok = true; for (let q = 1; q <= 4; q++) if (isLand(x + (px_ - x) * (1 + q * 0.05), y + (py_ - y) * (1 + q * 0.05))) ok = false;
        if (ok) return [px_, py_];
      }
    }
    return null;
  };
  const SPOTS = {};
  ['englishbay', 'kits', 'deepcove', 'innerharbour', 'gondola', 'steveston', 'harrison', 'wharf', 'nanaimo'].forEach((id) => {
    const b = bById.get(id); if (!b) return; const w = waterNear(b.x, b.y + 10, 40, 360); if (w) SPOTS[id] = w;
  });
  const PADDLERS = [];
  Object.entries(SPOTS).forEach(([id, w], i) => {
    const n = id === 'englishbay' || id === 'kits' ? 4 : 2;
    for (let k = 0; k < n; k++) PADDLERS.push({ cx: w[0] + (k - 1) * 18, cy: w[1] + (k % 2) * 14, rx: 24 + k * 9, ry: 8 + k * 3, a: hashN(i, k) * TAU, v: 0.25 + hashN(k, i) * 0.2, type: (i + k) % 3 === 0 ? 'kayak' : (i + k) % 3 === 1 ? 'sup' : 'kayak', col: pick(['#e8503a', '#ffc93c', '#3fb68b', '#ff9ebb', '#8f7be0']), sex: (i + k) % 2 ? 'f' : 'm' });
  });
  const SAILS = [];
  if (SPOTS.englishbay) for (let i = 0; i < 4; i++) SAILS.push({ x: SPOTS.englishbay[0] - 90 + i * 70, y: SPOTS.englishbay[1] + 70 + (i % 2) * 40, ph: i * 1.7, col: ['#ffffff', '#ffe9a8', '#ffd0d8', '#d4ecff'][i] });
  const cargo = SPOTS.englishbay ? [{ x: SPOTS.englishbay[0] - 60, y: SPOTS.englishbay[1] + 150 }, { x: SPOTS.englishbay[0] + 150, y: SPOTS.englishbay[1] + 190 }] : [];
  const WHALES = [{ x: 0, y: 0, ph: 0 }];
  (() => { const [x, y] = G.P(-30, 20); WHALES[0].x = x; WHALES[0].y = y; })();
  // seaplane between Vancouver harbour and Victoria
  const PLANE = { s: 0, v: 85, dir: 1, wait: 6, L: mkLine([G.P(-1.6, -1.5), G.P(-12, 4), G.P(-26, 24), G.P(-30, 54), G.P(-22, 88), G.P(-20.5, 94)]) };

  /* ================= people ================= */
  const SKIN = ['#ffdcb8', '#f3c79a', '#d9a273', '#a8734a', '#7a4e32'];
  const HAIR = ['#3b2a20', '#5a3d2b', '#2b2b3a', '#8a5a3c', '#c98f4e', '#1c1c24', '#d9b46a'];
  const M_TOP = ['#3a4a5e', '#6b7a8f', '#2f6f73', '#8c3a3a', '#e8a02e', '#4b6f3c', '#7a5ea8', '#d8d4cc'];
  const M_BOT = ['#2b2b3a', '#4a5568', '#8a7a5a', '#3a6fc7', '#5c6670'];
  const F_TOP = ['#2b2b3a', '#e8503a', '#3a8fc7', '#8f7be0', '#3fb68b', '#ff9ebb', '#ffc93c', '#ffffff'];
  const F_SHELL = ['#1f6f78', '#e8503a', '#2b2b3a', '#3a5fa8', '#c9a227', '#7a3fa0'];
  const people = [];
  const SPAWN = { dt: 9, west: 5, north: 5, rich: 5, squamish: 3, whistler: 4, sea2sky: 2, victoria: 5, nanaimo: 1, hope: 2, langley: 2, harrison: 1 };
  const personName = (p) => (p.owner ? tx('emperorName') : tx('names')[p.nameIdx % 20] + (p.nameIdx >= 20 ? '²' : ''));
  const targetName = (p) => (p.to !== undefined ? nameOf(buildings[p.to].p) : '');
  function goPlace(p, b) {
    p.to = buildings.indexOf(b); p.target = 'place';
    p.path = findPath(p.x, p.y, b.x + (Math.random() - 0.5) * 18, b.y + 16 + Math.random() * 6);
  }
  function wander(p) {
    const b = pick(groupMembers(p.grp));
    for (let i = 0; i < 8; i++) {
      const x = b.x + (Math.random() - 0.5) * 170; const y = b.y + 18 + (Math.random() - 0.4) * 70;
      if (walkXY(x, y) && !nearWaterPoly(x, y, 6)) { p.target = 'spot'; p.to = undefined; p.path = findPath(p.x, p.y, x, y); return; }
    }
    p.target = 'spot'; p.to = undefined; p.path = []; p.wait = 3;
  }
  let pid = 0;
  function addPerson(grp, opts) {
    const mem = groupMembers(grp); const b = pick(mem);
    const sex = pid % 2 ? 'f' : 'm'; const i = pid++;
    const p = Object.assign({
      id: i, nameIdx: i, grp, sex, outfit: Math.floor(rnd() * 3), skin: SKIN[Math.floor(rnd() * 5)], hair: HAIR[Math.floor(rnd() * 7)],
      top: sex === 'm' ? M_TOP[Math.floor(rnd() * 8)] : F_TOP[Math.floor(rnd() * 8)], shell: F_SHELL[Math.floor(rnd() * 6)], bot: sex === 'm' ? M_BOT[Math.floor(rnd() * 5)] : '#2b2b3a',
      acc: Math.floor(rnd() * 4), x: b.x + (rnd() - 0.5) * 20, y: b.y + 18, v: 28 + rnd() * 16, k: 1, wait: rnd() * 6, ph: rnd() * 6, face: 1,
      say: '', sayT: 0, cool: rnd() * 6, path: [], moving: false, eatEmoji: '', eatT: 0, replyAt: 0, replyTxt: '',
    }, opts || {});
    if (!walkXY(p.x, p.y)) { p.x = b.x; p.y = b.y + 24; }
    if (mem.length > 1) goPlace(p, pick(mem)); else wander(p);
    people.push(p); return p;
  }
  Object.entries(SPAWN).forEach(([g_, n]) => { for (let i = 0; i < n; i++) addPerson(g_); });
  const emperor = addPerson('dt', { owner: true, sex: 'f', outfit: 3, k: 1.3, v: 34, decT: 12, hair: '#5a3d2b', skin: SKIN[1], top: '#e8503a' });

  const fx = [];
  function heart(p, ch) { for (let i = 0; i < 3; i++) fx.push({ x: p.x + (Math.random() - 0.5) * 14, y: p.y, z: 26, vz: 22 + Math.random() * 16, life: 1.4, ch: ch || '💛' }); }
  function say(p, text, dur) { p.say = text; p.sayT = dur || 5; }

  /* ================= journal ================= */
  const logsEl = $('logs');
  let lastLogAt = 0;
  function addLog(html, cls, force) {
    const now = performance.now();
    if (!force && now - lastLogAt < 900) return;
    lastLogAt = now;
    const d = document.createElement('div');
    if (cls) d.className = cls;
    d.innerHTML = html;
    logsEl.prepend(d);
    while (logsEl.children.length > 40) logsEl.lastChild.remove();
  }
  function decree() {
    const r = Math.random(); let text;
    if (r < 0.4) { const foods = buildings.filter((x) => x.p.type === 'food'); text = fill(pick(tx('declFood')), { s: nameOf(pick(foods).p) }); }
    else if (r < 0.7) { const sights = buildings.filter((x) => x.p.type === 'sight'); text = fill(pick(tx('declSight')), { s: nameOf(pick(sights).p) }); }
    else text = pick(tx('declGen')[season] || tx('declGen').all);
    say(emperor, text, 7);
    $('decreeTx').textContent = text;
    addLog(fill(tx('logDecree'), { t: esc(text) }), 'own', true);
  }
  function arrive(p) {
    if (p.target === 'place') {
      const b = buildings[p.to];
      p.wait = 4 + Math.random() * 6;
      const isFood = b.p.type === 'food';
      say(p, fill(pick(tx(isFood ? 'eatFood' : 'seeSight')), { s: nameOf(b.p) }), 4);
      heart(p, isFood ? '💛' : '✨');
      p.eatEmoji = b.p.emoji; p.eatT = p.wait * 0.8;
      if (p.owner || Math.random() < 0.4) addLog(fill(tx(isFood ? 'logEat' : 'logSee'), { n: esc(personName(p)), s: esc(nameOf(b.p)), e: b.p.emoji }));
    } else p.wait = 2 + Math.random() * 3;
  }
  function nextTarget(p) {
    const mem = groupMembers(p.grp);
    if (mem.length > 1 && Math.random() < 0.82) { let b; do { b = pick(mem); } while (buildings.indexOf(b) === p.to && mem.length > 1 && Math.random() < 0.9); goPlace(p, b); }
    else wander(p);
  }
  function updatePeople(dt, tm) {
    for (const p of people) {
      if (p.sayT > 0) p.sayT -= dt;
      if (p.eatT > 0) p.eatT -= dt;
      if (p.cool > 0) p.cool -= dt;
      if (p.replyAt && tm > p.replyAt) { say(p, p.replyTxt, 4); p.replyAt = 0; }
      if (p.wait > 0) { p.wait -= dt; p.moving = false; if (p.wait <= 0) nextTarget(p); continue; }
      if (!p.path.length) { nextTarget(p); if (!p.path.length) p.wait = 2; continue; }
      const [tx_, ty_] = p.path[0];
      const dx = tx_ - p.x; const dy = ty_ - p.y; const d = Math.hypot(dx, dy); const step = p.v * dt;
      if (d <= step) { p.x = tx_; p.y = ty_; p.path.shift(); p.moving = false; if (!p.path.length) arrive(p); }
      else {
        p.x += (dx / d) * step; p.y += (dy / d) * step;
        if (Math.abs(dx) > 0.2) p.face = dx > 0 ? 1 : -1;
        p.ph += dt * 9 * (p.v / 40); p.moving = true;
      }
    }
    emperor.decT -= dt;
    if (emperor.decT <= 0) { decree(); emperor.decT = 20 + Math.random() * 14; }
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.life -= dt; f.z += f.vz * dt; if (f.life <= 0) fx.splice(i, 1); }
  }
  function chatter(tm) {
    for (let i = 0; i < people.length; i++) {
      const a = people[i]; if (a.cool > 0 || a.sayT > 0) continue;
      for (let j = i + 1; j < people.length; j++) {
        const b = people[j]; if (b.cool > 0 || b.sayT > 0) continue;
        if (Math.hypot(a.x - b.x, (a.y - b.y) * 1.4) < 24 && Math.random() < 0.4) {
          const place = nameOf(pick(buildings).p);
          say(a, fill(pick(tx('greet')), { n: personName(b), s: place }), 4.5);
          b.replyAt = tm + 1.6; b.replyTxt = fill(pick(tx('reply')), { s: place });
          a.cool = b.cool = 14; a.wait = Math.max(a.wait, 3.5); b.wait = Math.max(b.wait, 3.5); a.moving = b.moving = false;
          addLog(fill(tx('logChat'), { n: esc(personName(a)), m: esc(personName(b)) }));
          break;
        }
      }
    }
  }

  /* ================= canvas / camera ================= */
  const cv = $('cv'); const g = cv.getContext('2d');
  let W = 0; let H = 0; let DPR = 1;
  function resize() {
    DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  const ZMIN = 0.06; const ZMAX = 3;
  const cam = { x: 0, y: 0, z: 0.5, tx: 0, ty: 0, tz: 0.5, tilt: 0.58, ttilt: 0.58 };
  let bird = false;
  const sx = (x) => (x - cam.x) * cam.z + W / 2;
  const sy = (y, z) => (y - cam.y) * cam.z * cam.tilt + H / 2 - (z || 0) * cam.z;
  const WB = { x0: -1700, y0: -2300, x1: 2800, y1: 2250 };
  function rectZoom(x0, y0, x1, y1) {
    const padX = isMobile() ? 16 : 70; const padY = isMobile() ? 190 : 150;
    return clamp(Math.min((W - padX * 2) / (x1 - x0), (H - padY * 2) / ((y1 - y0) * cam.ttilt)), ZMIN, 1.3);
  }
  function fitRect(x0, y0, x1, y1) { cam.tz = rectZoom(x0, y0, x1, y1); cam.tx = (x0 + x1) / 2; cam.ty = (y0 + y1) / 2; }
  function fitAll() { fitRect(WB.x0, WB.y0, WB.x1, WB.y1); }
  function fitCity() { fitRect(metroC[0] - 760, metroC[1] - 520, metroC[0] + 760, metroC[1] + 520); }
  function fitStart() {
    if (isMobile()) { cam.tz = clamp(Math.min(W / 1000, H / 900), 0.25, 0.8); cam.tx = metroC[0]; cam.ty = metroC[1]; } else fitCity();
  }
  let followP = null;
  function flyTo(x, y, z) { cam.tx = x; cam.ty = y; if (z) cam.tz = Math.max(cam.tz, z); followP = null; refreshFollow(); }
  function zoomAt(px, py, f) {
    const wx = (px - W / 2) / cam.z + cam.x; const wy = (py - H / 2) / (cam.z * cam.tilt) + cam.y;
    const nz = clamp(cam.z * f, ZMIN, ZMAX);
    cam.z = cam.tz = nz;
    cam.x = cam.tx = wx - (px - W / 2) / nz; cam.y = cam.ty = wy - (py - H / 2) / (nz * cam.tilt);
  }

  /* ---------- drawing helpers ---------- */
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function box(x, y, w, h, c, r) { rr(x, y, w, h, r || 0); g.fillStyle = c; g.fill(); g.stroke(); }
  function poly(pts, c) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fillStyle = c; g.fill(); g.stroke(); }
  function ell(x, y, rx, ry, c, stroke) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fillStyle = c; g.fill(); if (stroke) g.stroke(); }
  function emoji(ch, x, y, size) { g.font = `${size}px ${EMOJI_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = INK; g.fillText(ch, x, y); }
  function onScreen(x, y, m) { return x > -m && x < W + m && y > -m && y < H + m; }

  /* ---------- environment: time of day + season ---------- */
  const TOD = [{ m: [255, 212, 186], n: 0.15 }, { m: [255, 255, 255], n: 0 }, { m: [255, 168, 124], n: 0.35 }, { m: [92, 110, 190], n: 1 }];
  const env = { m: [255, 255, 255], n: 0 };
  let todIdx = 1; let autoTod = false; let autoClock = 0; let time = 0;
  const SEAS_TINT = { spring: [255, 244, 250], summer: [255, 252, 240], autumn: [255, 238, 218], winter: [232, 241, 255] };
  const hexA = (h) => hex2rgb(h);
  const sea = { tint: [...SEAS_TINT[season]], ground: hexA(GROUND[season]), snow: SNOW_AMT[season], warm: season === 'summer' ? 1 : 0, bare: season === 'winter' ? 1 : 0 };
  function updateEnv(dt) {
    const T = TOD[todIdx]; const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 2.5);
    for (let i = 0; i < 3; i++) env.m[i] += (T.m[i] - env.m[i]) * k;
    env.n += (T.n - env.n) * k;
    if (autoTod && !reduceMotion) { autoClock += dt; if (autoClock > 12) { autoClock = 0; todIdx = (todIdx + 1) % 4; syncTodButtons(); } }
    const ks = reduceMotion ? 1 : 1 - Math.exp(-dt * 1.6);
    const tt = SEAS_TINT[season]; const gg = hexA(GROUND[season]);
    for (let i = 0; i < 3; i++) { sea.tint[i] += (tt[i] - sea.tint[i]) * ks; sea.ground[i] += (gg[i] - sea.ground[i]) * ks; }
    sea.snow += (SNOW_AMT[season] - sea.snow) * ks;
    sea.warm += ((season === 'summer' ? 1 : season === 'spring' ? 0.5 : 0) - sea.warm) * ks;
    sea.bare += ((season === 'winter' ? 1 : 0) - sea.bare) * ks;
    if (autoSeason && !reduceMotion) { autoSeasonClock += dt; if (autoSeasonClock > 9) { autoSeasonClock = 0; season = SEASONS[(SEASONS.indexOf(season) + 1) % 4]; syncSeasonButtons(); } }
  }
  const groundCol = () => `rgb(${sea.ground.map(Math.round).join(',')})`;
  const seasonVis = (s) => (season === s ? 1 : 0);
  const SEASON_ID = { spring: 0, summer: 1, autumn: 2, winter: 3 };

  /* ================= sprites: buildings ================= */
  let lw = 2;
  const lights = [];
  const litList = [];
  const snowy = () => sea.snow > 0.7;
  function snowBand(x, y, w) { if (snowy()) { g.save(); g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x, y, w / 2, 3.2, 0, 0, TAU); g.fill(); g.restore(); } }
  function roofShape(y, wBot, wTop, h, color, eaves) {
    const hb = wBot / 2; const ht = wTop / 2;
    poly([[-hb, y], [hb, y], [ht, y - h], [-ht, y - h]], color);
    if (eaves) {
      g.beginPath(); g.moveTo(-hb, y); g.quadraticCurveTo(-hb - 3, y - 2, -hb - 6, y - 7); g.quadraticCurveTo(-hb + 3, y - 4, -hb + 6, y - 3); g.closePath(); g.fillStyle = color; g.fill(); g.stroke();
      g.beginPath(); g.moveTo(hb, y); g.quadraticCurveTo(hb + 3, y - 2, hb + 6, y - 7); g.quadraticCurveTo(hb - 3, y - 4, hb - 6, y - 3); g.closePath(); g.fillStyle = color; g.fill(); g.stroke();
    }
    if (snowy()) { g.save(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-ht - 1, y - h); g.lineTo(ht + 1, y - h); g.lineTo(ht + (hb - ht) * 0.35, y - h * 0.62); g.lineTo(-ht - (hb - ht) * 0.35, y - h * 0.62); g.closePath(); g.fill(); g.restore(); }
  }
  function drawShop(b, night) {
    const w = 36; const h = b.h; const d = 10;
    const dc = DIST[b.dist]; const roof = shade(dc.c, -0.22); const roofSide = shade(dc.c, -0.36);
    ell(5, 2, 28, 7, 'rgba(0,0,0,.18)');
    box(-w / 2, -h, w, h, b.wall);
    poly([[w / 2, 0], [w / 2 + d, -5], [w / 2 + d, -h - 5], [w / 2, -h]], shade(b.wall, -0.2));
    poly([[w / 2 + 5, -h + 1], [w / 2 + d + 5, -h - 4], [w / 2 + d - 5, -h - 19], [w / 2 - 5, -h - 14]], roofSide);
    poly([[-w / 2 - 5, -h + 1], [w / 2 + 5, -h + 1], [w / 2 - 5, -h - 14], [-w / 2 + 5, -h - 14]], roof);
    snowBand(0, -h - 13, w - 4);
    const sw = w / 6;
    for (let i = 0; i < 6; i++) box(-w / 2 + i * sw, -h + 1, sw, 8, i % 2 ? '#ffffff' : dc.c);
    box(-12, -h / 2 - 7, 24, 20, night ? '#ffe9a8' : '#ffffff', 5);
    emoji(b.p.emoji, 0, -h / 2 + 3, 15);
    if (night > 0.2) lights.push([0, -h / 2 + 3, 30, '255,200,110']);
  }
  function drawHallV(b, night) {
    const kd = b.kind; const s = kd.big ? 1.15 : 1; const wall = kd.wall || '#f3e3c2'; const roof = kd.roof || '#c8553d';
    ell(6, 2, 42 * s, 8, 'rgba(0,0,0,.18)');
    box(-36 * s, -6, 72 * s, 6, '#d8d0bf');
    box(-30 * s, -28, 60 * s, 22, wall);
    poly([[30 * s, -6], [38 * s, -11], [38 * s, -33], [30 * s, -28]], shade(wall, -0.2));
    if (kd.chinese) {
      g.save(); g.lineWidth = lw * 2; g.strokeStyle = '#c8553d';
      for (let x = -24 * s; x <= 24 * s; x += 16 * s) { g.beginPath(); g.moveTo(x, -28); g.lineTo(x, -6); g.stroke(); }
      g.restore();
      roofShape(-28, 78 * s, 46 * s, 20, roof, true);
      ell(0, -52, 4, 4, '#ffc93c', true);
    } else {
      for (let x = -22 * s; x <= 22 * s; x += 14 * s) { if (Math.abs(x) < 6) continue; box(x - 3, -22, 6, 9, night > 0.2 ? '#ffd873' : '#bfe3f5', 1.5); }
      roofShape(-28, 74 * s, 54 * s, kd.flat ? 7 : 19, roof, false);
      if (kd.gable) { poly([[-8, -47], [8, -47], [0, -57]], shade(roof, -0.15)); }
      if (kd.ivy) { g.save(); g.fillStyle = '#4fae6b'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(-26 + i * 6.5, -24 + (i % 3) * 5, 4, 0, TAU); g.fill(); } g.restore(); }
    }
    box(-6, -22, 12, 16, night > 0.2 ? '#ffd873' : '#5b4a3c', 3);
    if (night > 0.2) lights.push([0, -14, 38, '255,190,90']);
  }
  function drawStation(b, night) {
    ell(6, 2, 58, 9, 'rgba(0,0,0,.2)');
    box(-52, -6, 104, 6, '#cfd3da');
    const NAVY = '#1d3a6e'; const GOLD = '#ffc93c';
    box(-46, -27, 92, 21, '#f1e8d2');
    poly([[46, -6], [56, -11], [56, -32], [46, -27]], shade('#f1e8d2', -0.2));
    for (let x = -36; x <= 36; x += 18) { g.beginPath(); g.moveTo(x - 5, -8); g.lineTo(x - 5, -16); g.quadraticCurveTo(x, -23, x + 5, -16); g.lineTo(x + 5, -8); g.closePath(); g.fillStyle = night > 0.2 ? '#ffd873' : '#bfe3f5'; g.fill(); g.stroke(); }
    poly([[-52, -27], [52, -27], [40, -45], [-40, -45]], NAVY);
    poly([[52, -27], [60, -32], [48, -50], [40, -45]], shade(NAVY, -0.3));
    box(-52, -30, 104, 3.5, GOLD);
    box(-30, -42, 60, 12, '#102650', 3);
    g.save(); g.fillStyle = GOLD; g.font = `700 8px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ROCKY MOUNTAINEER', 0, -36); g.restore();
    box(-7, -62, 14, 20, '#f1e8d2'); ell(0, -54, 4.5, 4.5, '#ffffff', true);
    g.beginPath(); g.moveTo(0, -54); g.lineTo(0, -57); g.moveTo(0, -54); g.lineTo(2.5, -53); g.stroke();
    poly([[-9, -62], [9, -62], [0, -74]], NAVY);
    g.beginPath(); g.moveTo(0, -74); g.lineTo(0, -84); g.stroke(); poly([[0, -84], [13, -80], [0, -76]], '#e8503a');
    if (night > 0.2) lights.push([0, -20, 60, '255,200,110']);
  }
  function drawSails(b) {
    ell(4, 2, 56, 9, 'rgba(0,0,0,.18)');
    box(-50, -9, 100, 9, '#cfd8e3');
    for (let i = 0; i < 5; i++) { const x = -44 + i * 19; poly([[x, -9], [x + 21, -9], [x + 10, -33 - (i % 2) * 7]], '#ffffff'); }
    box(-40, -17, 80, 8, '#aab6c6');
    // cruise ship alongside
    g.save(); g.translate(60, 4); poly([[-30, -5], [34, -5], [28, 6], [-24, 6]], '#ffffff'); box(-24, -13, 48, 8, '#ffffff'); box(-18, -20, 34, 7, '#e8f1fa'); box(-9, -28, 8, 8, '#3a8fc7'); box(-30, -2, 62, 3, '#233b6e'); g.restore();
  }
  function drawClock(b) {
    ell(3, 2, 18, 6, 'rgba(0,0,0,.2)');
    box(-5, -50, 10, 50, '#3a3a44', 2); box(-9, -60, 18, 12, '#a85a3a', 2);
    box(-13, -88, 26, 28, '#e8dcc0', 4); ell(0, -74, 9, 9, '#fffdf6', true);
    const a = time * 0.5; g.beginPath(); g.moveTo(0, -74); g.lineTo(Math.cos(a) * 7, -74 + Math.sin(a) * 7); g.moveTo(0, -74); g.lineTo(Math.cos(a / 12) * 4.5, -74 + Math.sin(a / 12) * 4.5); g.stroke();
    poly([[-15, -88], [15, -88], [0, -102]], '#3a3a44');
    g.save(); g.globalAlpha = 0.7; for (let i = 0; i < 3; i++) { const f = ((time * 0.6 + i / 3) % 1); ell(Math.sin(f * 6 + i) * 4, -104 - f * 26, 4 + f * 5, 3 + f * 3, '#ffffff'); } g.restore();
  }
  function drawDome(b, night) {
    const kd = b.kind; ell(4, 2, 36, 8, 'rgba(0,0,0,.18)');
    if (kd.pink) { // conservatory: glass dome among flowers
      box(-34, -8, 68, 8, '#d8d0bf');
      g.beginPath(); g.ellipse(0, -8, 30, 30, 0, Math.PI, TAU); g.closePath(); g.fillStyle = '#c9f0e0'; g.fill(); g.stroke();
      g.save(); g.globalAlpha = 0.5; g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(i * 12, -8); g.quadraticCurveTo(i * 10, -26, 0, -38); } g.stroke(); g.restore();
      for (let i = 0; i < 6; i++) ell(-30 + i * 12, 0, 4, 3, ['#ff9ebb', '#ffc93c', '#ffffff'][i % 3]);
      return;
    }
    ell(0, -34, 31, 31, '#dfe7f0', true);
    g.save(); g.globalAlpha = 0.55; g.beginPath(); g.ellipse(0, -34, 31, 11, 0, 0, TAU); g.moveTo(0, -65); g.lineTo(0, -3); g.moveTo(-22, -56); g.lineTo(22, -12); g.moveTo(22, -56); g.lineTo(-22, -12); g.stroke(); g.restore();
    ell(-9, -44, 8, 11, 'rgba(255,255,255,.55)');
    if (night > 0.2) lights.push([0, -30, 50, '170,210,255']);
  }
  function drawPaifangV(b, night) {
    ell(4, 2, 40, 7, 'rgba(0,0,0,.18)');
    box(-31, -34, 6, 34, '#c8553d'); box(25, -34, 6, 34, '#c8553d'); box(-12, -30, 4, 30, '#c8553d'); box(8, -30, 4, 30, '#c8553d');
    box(-32, -42, 64, 12, '#fff1d6', 3); emoji(b.p.emoji, 0, -35, 12);
    roofShape(-42, 76, 54, 10, b.kind.roof, true);
    if (night > 0.2) lights.push([0, -34, 36, '255,190,90']);
  }
  function drawTotem() {
    ell(4, 2, 34, 7, 'rgba(0,0,0,.18)');
    [[-18, 62, '#c8553d'], [0, 80, '#3a8f9a'], [18, 56, '#e8a02e']].forEach(([x, h, c], i) => {
      box(x - 6, -h, 12, h, c, 3);
      for (let j = 0; j < 4; j++) { const y = -h + 8 + j * (h / 4.4); ell(x, y, 4.5, 3.5, '#fffdf6', true); g.fillStyle = INK; g.fillRect(x - 2.2, y - 0.6, 1.6, 1.6); g.fillRect(x + 0.8, y - 0.6, 1.6, 1.6); if (j % 2) { poly([[x - 7, y + 4], [x - 15, y + 1], [x - 7, y - 2]], c); poly([[x + 7, y + 4], [x + 15, y + 1], [x + 7, y - 2]], c); } }
      if (i === 1) { poly([[x - 7, -h], [x + 7, -h], [x, -h - 12]], '#1d3a6e'); }
    });
  }
  function drawBridgeLG(b, night) {
    box(-58, -13, 116, 5, '#9aa3ad', 1.5);
    [-34, 34].forEach((x) => { box(x - 4, -66, 8, 56, '#2f8f6b', 1.5); box(x - 6, -68, 12, 5, '#256f54', 1.5); });
    g.beginPath(); g.moveTo(-58, -14); g.quadraticCurveTo(-46, -22, -34, -64); g.quadraticCurveTo(0, -18, 34, -64); g.quadraticCurveTo(46, -22, 58, -14); g.stroke();
    g.save(); g.lineWidth = 1; for (let x = -30; x <= 30; x += 8) { const t = Math.abs(x) / 34; g.beginPath(); g.moveTo(x, -13); g.lineTo(x, -13 - (1 - t) * 18 - 2); g.stroke(); } g.restore();
    if (night > 0.2) { lights.push([-34, -64, 26, '255,255,200'], [34, -64, 26, '255,255,200'], [0, -16, 50, '255,255,220']); }
  }
  function drawInukshuk() {
    ell(3, 2, 26, 6, 'rgba(0,0,0,.18)');
    box(-12, -22, 9, 22, '#8d8f98', 3); box(3, -22, 9, 22, '#9a9ca5', 3); box(-8, -36, 16, 15, '#a7a9b2', 3); box(-26, -46, 52, 10, '#b4b6be', 4); box(-6, -56, 12, 10, '#9a9ca5', 3);
  }
  function drawBeach(b) {
    const warm = sea.warm > 0.4;
    ell(4, -2, 56, 16, warm ? '#f6e2a8' : '#eadfc5', true);
    box(-24, -12, 34, 14, '#6ad0e8', 5);
    g.save(); g.lineWidth = 1; g.globalAlpha = 0.6; g.beginPath(); g.moveTo(-20, -6); g.lineTo(6, -6); g.moveTo(-20, -2); g.lineTo(6, -2); g.stroke(); g.restore();
    if (warm) [[26, -10, '#e8503a'], [40, -2, '#ffc93c'], [-34, 2, '#3a8fc7']].forEach(([x, y, c]) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 20); g.stroke(); poly([[x - 12, y - 18], [x + 12, y - 18], [x, y - 28]], c); ell(x + 8, y + 3, 5, 2, '#ffdcb8', true); });
  }
  function drawGarden(b) {
    ell(2, -1, 50, 16, '#8fd078', true);
    const cols = season === 'spring' ? ['#ff9ebb', '#ffc93c', '#ffffff', '#f09ae0'] : season === 'summer' ? ['#e8503a', '#ffc93c', '#8f7be0', '#ff9ebb'] : season === 'autumn' ? ['#ff9a4d', '#e8503a', '#ffc93c', '#b86a3a'] : ['#ffffff', '#cfe6ff', '#ffe9a8', '#ffffff'];
    for (let i = 0; i < 16; i++) { const a = i * 2.4; ell(Math.cos(a) * (10 + (i % 4) * 9), -2 + Math.sin(a) * 7, 3.2, 2.6, cols[i % 4], true); }
    box(-9, -20, 18, 18, '#fffdf6', 2); poly([[-12, -20], [12, -20], [0, -33]], '#c8553d'); g.beginPath(); g.moveTo(0, -33); g.lineTo(0, -40); g.stroke();
  }
  function drawBridge2() {
    box(-52, -26, 22, 26, '#8a8f98', 4); box(30, -26, 22, 26, '#8a8f98', 4);
    g.save(); g.lineWidth = 5; g.strokeStyle = '#a8764a'; g.beginPath(); g.moveTo(-34, -22); g.quadraticCurveTo(0, -4, 34, -22); g.stroke(); g.restore();
    g.beginPath(); g.moveTo(-34, -32); g.quadraticCurveTo(0, -14, 34, -32); g.stroke();
    g.save(); g.lineWidth = 1; for (let x = -28; x <= 28; x += 8) { const y = -22 + 18 * (1 - (x / 34) ** 2) * 0.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 10); g.stroke(); } g.restore();
  }
  function drawLodge(b, night) {
    ell(4, 2, 34, 7, 'rgba(0,0,0,.18)');
    box(-28, -26, 56, 26, '#a8764a', 3);
    g.save(); g.globalAlpha = 0.35; for (let y = -22; y < 0; y += 6) { g.beginPath(); g.moveTo(-28, y); g.lineTo(28, y); g.stroke(); } g.restore();
    roofShape(-26, 66, 14, 30, '#4a3b30', false);
    box(14, -52, 8, 14, '#8a8f98'); box(-7, -20, 14, 20, night > 0.2 ? '#ffd873' : '#6b4a30', 2);
    box(-24, -20, 10, 8, night > 0.2 ? '#ffd873' : '#bfe3f5', 1.5);
    if (b.kind.cable) { box(32, -40, 5, 40, '#6b6f78'); ell(34.5, -44, 7, 7, '#e8503a', true); }
    if (night > 0.2) lights.push([0, -14, 36, '255,190,90']);
  }
  function drawDock(b) {
    const c = b.kind.c || '#e8503a';
    box(-34, -4, 68, 6, '#a8764a', 1.5);
    for (let x = -30; x <= 30; x += 10) { g.beginPath(); g.moveTo(x, -4); g.lineTo(x, 2); g.stroke(); }
    if (b.kind.houses) [[-24, '#ff9ebb'], [-4, '#7ccbf5'], [16, '#ffc93c']].forEach(([x, col]) => { box(x - 8, -22, 16, 18, col, 2); poly([[x - 10, -22], [x + 10, -22], [x, -32]], '#c8553d'); box(x - 2, -14, 4, 5, '#fff', 1); });
    else { g.beginPath(); g.moveTo(-26, -4); g.lineTo(-26, -34); g.stroke(); poly([[-26, -34], [-8, -29], [-26, -24]], c); }
    if (b.kind.ferry) { box(10, -26, 20, 20, '#ffffff', 3); box(13, -22, 14, 6, '#3a8fc7', 2); }
    if (b.id === 'steveston' || b.id === 'deepcove' || b.id === 'nanaimo') { poly([[22, 0], [44, 0], [40, 7], [26, 7]], '#ffffff'); g.beginPath(); g.moveTo(33, 0); g.lineTo(33, -18); g.stroke(); poly([[33, -18], [43, -4], [33, -4]], c); }
  }
  function drawMine() {
    ell(4, 2, 44, 8, 'rgba(0,0,0,.2)');
    poly([[-44, 0], [-30, -50], [40, -62], [50, 0]], '#8a8f98');
    box(-32, -22, 40, 22, '#b8734a', 2); box(-24, -40, 30, 20, '#a8613a', 2); box(-16, -54, 18, 16, '#c2845a', 2);
    poly([[-22, -22], [4, -22], [-9, -32]], '#7a4a2a'); box(24, -18, 14, 18, '#2b2b3a', 7);
    g.save(); g.globalAlpha = 0.6; for (let i = 0; i < 2; i++) { const f = ((time * 0.5 + i / 2) % 1); ell(-6 + f * 8, -58 - f * 22, 5 + f * 5, 4 + f * 3, '#e6e6ea'); } g.restore();
  }
  function drawFalls() {
    poly([[-34, 0], [-30, -78], [34, -84], [38, 0]], '#8e949e');
    g.save(); g.globalAlpha = 0.3; g.beginPath(); for (let x = -26; x < 34; x += 12) { g.moveTo(x, -70); g.lineTo(x + 4, -4); } g.stroke(); g.restore();
    g.save(); g.lineCap = 'round'; for (let i = 0; i < 3; i++) { g.strokeStyle = '#ffffff'; g.lineWidth = 6 - i; g.setLineDash([14, 6]); g.lineDashOffset = -time * 30 - i * 5; g.beginPath(); g.moveTo(-6 + i * 5, -78); g.lineTo(-6 + i * 5, -6); g.stroke(); } g.restore();
    g.save(); g.fillStyle = '#7ad0ee'; g.beginPath(); g.ellipse(0, 3, 30, 8, 0, 0, TAU); g.fill(); g.stroke(); g.restore();
    ell(-4, 2, 16, 4, 'rgba(255,255,255,.7)');
    if (snowy()) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(2, -82, 34, 6, 0, 0, TAU); g.fill(); }
  }
  function drawRock(b) {
    if (b.kind.lake) { ell(0, 0, 54, 14, '#40b9cf', true); ell(-6, -2, 28, 5, 'rgba(255,255,255,.4)'); for (let i = 0; i < 4; i++) poly([[-40 + i * 26, -8], [-30 + i * 26, -62 + (i % 2) * 14], [-20 + i * 26, -8]], i % 2 ? '#6b7280' : '#7a8190'); return; }
    ell(4, 2, 46, 9, 'rgba(0,0,0,.2)');
    g.beginPath(); g.moveTo(-46, 0); g.quadraticCurveTo(-48, -70, 0, -78); g.quadraticCurveTo(48, -70, 46, 0); g.closePath(); g.fillStyle = '#c3c6cf'; g.fill(); g.stroke();
    g.save(); g.globalAlpha = 0.3; g.beginPath(); for (let x = -34; x <= 34; x += 12) { g.moveTo(x, -4); g.quadraticCurveTo(x * 0.9, -40, x * 0.5, -72); } g.stroke(); g.restore();
    [[-10, -50, '#e8503a'], [10, -36, '#ffc93c']].forEach(([x, y, c]) => { ell(x, y, 2.4, 2.4, c, true); });
    if (snowy()) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, -76, 18, 4, 0, 0, TAU); g.fill(); }
  }
  function drawVillage(b, night) {
    const hope = b.kind.hope;
    ell(4, 2, 56, 9, 'rgba(0,0,0,.18)');
    [[-38, '#e8503a'], [-14, '#3a8fc7'], [16, '#ffc93c'], [40, '#3fb68b']].forEach(([x, c], i) => { box(x - 11, -24 - (i % 2) * 5, 22, 24 + (i % 2) * 5, hope ? b.wall : '#a8764a', 2); roofShape(-24 - (i % 2) * 5, 30, 4, 20, c, false); box(x - 3, -14, 6, 8, night > 0.2 ? '#ffd873' : '#fff1d6', 1); });
    if (hope) emoji('🐻', 0, -34, 22);
    else { box(-5, -52, 10, 26, '#c8553d', 2); poly([[-8, -52], [8, -52], [0, -64]], '#4a3b30'); ell(0, -43, 3, 3, '#fffdf6', true); }
    if (night > 0.2) lights.push([0, -20, 60, '255,190,90']);
  }
  function drawCapitol(b, night) {
    ell(6, 2, 52, 9, 'rgba(0,0,0,.2)');
    box(-46, -22, 92, 22, '#d8cdb8', 2); box(-24, -34, 48, 12, '#d8cdb8', 2);
    for (let x = -40; x <= 40; x += 13) { if (Math.abs(x) < 8) continue; box(x - 3, -18, 6, 12, night > 0.2 ? '#ffd873' : '#8a7a68', 1.5); }
    g.beginPath(); g.ellipse(0, -34, 16, 20, 0, Math.PI, TAU); g.closePath(); g.fillStyle = '#4fae9a'; g.fill(); g.stroke();
    box(-3, -66, 6, 8, '#4fae9a'); g.beginPath(); g.moveTo(0, -66); g.lineTo(0, -74); g.stroke();
    [-38, 38].forEach((x) => { box(x - 7, -36, 14, 14, '#d8cdb8', 2); poly([[x - 9, -36], [x + 9, -36], [x, -48]], '#4fae9a'); });
    box(-8, -14, 16, 14, '#6b4a30', 6);
    if (night > 0.15) { g.save(); g.fillStyle = '#fff2a8'; for (let i = -9; i <= 9; i++) { g.beginPath(); g.arc(i * 5, -22 - Math.abs(i) * 0.3, 1.2, 0, TAU); g.fill(); } g.restore(); lights.push([0, -30, 70, '255,230,150']); }
  }
  function drawCastle() {
    ell(5, 2, 42, 8, 'rgba(0,0,0,.2)');
    box(-34, -34, 68, 34, '#a05a46', 3);
    [[-30, -64], [30, -60]].forEach(([x, y]) => { box(x - 8, y, 16, -y, '#8f4c3a', 3); poly([[x - 11, y], [x + 11, y], [x, y - 20]], '#4a5a6a'); });
    box(-10, -50, 20, 20, '#b06a52', 3); poly([[-13, -50], [13, -50], [0, -68]], '#4a5a6a');
    box(-6, -16, 12, 16, '#4a3b30', 6); [-20, 20].forEach((x) => box(x - 3, -28, 6, 9, '#ffd873', 3));
  }
  function drawArch() {
    poly([[-44, 0], [-34, -56], [40, -62], [48, 0]], '#8e949e');
    g.beginPath(); g.moveTo(-14, 0); g.lineTo(-14, -16); g.quadraticCurveTo(0, -34, 14, -16); g.lineTo(14, 0); g.closePath(); g.fillStyle = '#2b2b3a'; g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-8, 3); g.lineTo(-12, 8); g.moveTo(8, 3); g.lineTo(12, 8); g.stroke();
    if (snowy()) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(2, -60, 26, 5, 0, 0, TAU); g.fill(); }
  }
  function drawFort() {
    ell(4, 2, 42, 8, 'rgba(0,0,0,.18)');
    for (let x = -36; x <= 36; x += 7) poly([[x - 3, 0], [x + 3, 0], [x + 3, -26], [x, -31], [x - 3, -26]], '#a8764a');
    box(-12, -46, 24, 30, '#8a5a3c', 2); roofShape(-46, 32, 12, 12, '#5a3d2b', false);
    g.beginPath(); g.moveTo(0, -58); g.lineTo(0, -72); g.stroke(); poly([[0, -72], [14, -68], [0, -64]], '#e8503a');
  }
  function drawSpa() {
    ell(0, -2, 44, 14, '#5cc8d8', true); ell(-6, -4, 26, 6, 'rgba(255,255,255,.4)');
    g.save(); g.globalAlpha = 0.6; for (let i = 0; i < 4; i++) { const f = ((time * 0.5 + i / 4) % 1); ell(-18 + i * 12 + Math.sin(f * 8) * 3, -10 - f * 30, 5 + f * 5, 4 + f * 3, '#ffffff'); } g.restore();
    box(26, -26, 22, 24, '#a8764a', 2); roofShape(-26, 32, 14, 14, '#c8553d', false);
  }
  function drawHouse(h, X, Y, k) {
    k *= h.s; g.save(); g.translate(X, Y); g.scale(k, k);
    g.lineWidth = Math.max(1.2 / k, 1.6); g.strokeStyle = INK; g.lineJoin = 'round';
    ell(3, 1, 13, 4, 'rgba(0,0,0,.16)');
    if (h.kind === 'mid') { box(-11, -34, 22, 34, h.c, 2); g.save(); g.fillStyle = 'rgba(80,120,160,.5)'; for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) g.fillRect(-8 + c * 9, -30 + r * 8, 6, 4.5); g.restore(); box(-12, -37, 24, 4, h.rc, 1); }
    else if (h.kind === 'chalet') { box(-10, -14, 20, 14, '#a8764a', 1.5); roofShape(-14, 30, 4, 16, h.rc, false); box(-2.5, -9, 5, 9, '#4a3b30'); }
    else { box(-10, -13, 20, 13, h.c, 1.5); poly([[-13, -13], [13, -13], [7, -23], [-7, -23]], h.rc); if (snowy()) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-13, -13); g.lineTo(13, -13); g.lineTo(11, -16); g.lineTo(-11, -16); g.fill(); } box(-2.5, -8, 5, 8, '#8a5a3c'); box(5, -10, 4, 4, '#bfe3f5'); }
    g.restore();
    if (env.n > 0.3 && k > 0.3 && h.k > 0.5) litList.push([X, Y - 8 * k, 20 * k, '255,200,110']);
  }
  function drawTowerBlock(t, X, Y, k) {
    g.save(); g.translate(X, Y); g.scale(k, k);
    g.lineWidth = Math.max(1.2 / k, 1.6); g.strokeStyle = INK; g.lineJoin = 'round';
    const w = t.w; const h = t.h; const d = 8;
    ell(3, 1, w * 0.7, 5, 'rgba(0,0,0,.16)');
    box(-w / 2, -h, w, h, t.c, 1.5);
    poly([[w / 2, 0], [w / 2 + d, -4], [w / 2 + d, -h - 4], [w / 2, -h]], shade(t.c, -0.25));
    poly([[-w / 2, -h], [w / 2, -h], [w / 2 + d, -h - 4], [-w / 2 + d, -h - 4]], shade(t.c, 0.3));
    g.save(); g.lineWidth = 1; g.globalAlpha = 0.45; g.beginPath(); for (let y = -h + 9; y < -4; y += 9) { g.moveTo(-w / 2, y); g.lineTo(w / 2, y); } for (let x = -w / 2 + w / 3; x < w / 2; x += w / 3) { g.moveTo(x, -h); g.lineTo(x, 0); } g.stroke(); g.restore();
    g.restore();
    if (env.n > 0.3 && k > 0.35) { litList.push([X, Y - (h * k) / 2, Math.max(24, w * k * 1.1), '255,214,130']); }
  }

  /* ================= sprites: nature, people, vehicles ================= */
  function drawBuilding(b) {
    const X = sx(b.x); const Y = sy(b.y + 6);
    const k = cam.z; lw = Math.max(1.3 / k, 2);
    g.save(); g.translate(X, Y); g.scale(k, k);
    g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = INK;
    const night = env.n; const hl = (selId === b.id) ? 1 : 0;
    switch (b.kind.k) {
      case 'shop': drawShop(b, night); break;
      case 'station': drawStation(b, night); break;
      case 'sails': drawSails(b); break;
      case 'clock': drawClock(b); break;
      case 'dome': drawDome(b, night); break;
      case 'paifang': drawPaifangV(b, night); break;
      case 'totem': drawTotem(); break;
      case 'bridge': drawBridgeLG(b, night); break;
      case 'inukshuk': drawInukshuk(); break;
      case 'beach': drawBeach(b); break;
      case 'garden': drawGarden(b); break;
      case 'bridge2': drawBridge2(); break;
      case 'lodge': drawLodge(b, night); break;
      case 'dock': drawDock(b); break;
      case 'mine': drawMine(); break;
      case 'falls': drawFalls(); break;
      case 'rock': drawRock(b); break;
      case 'village': drawVillage(b, night); break;
      case 'capitol': drawCapitol(b, night); break;
      case 'castle': drawCastle(); break;
      case 'arch': drawArch(); break;
      case 'fort': drawFort(); break;
      case 'spa': drawSpa(); break;
      default: drawHallV(b, night);
    }
    if (b.p.type === 'sight') {
      const by = -b.hh - 12 + Math.sin(time * 2 + b.idx) * 1.5;
      g.beginPath(); g.arc(0, by, 11, 0, TAU); g.fillStyle = '#fffdf6'; g.fill(); g.stroke(); emoji(b.p.emoji, 0, by + 1, 13);
    }
    if (hl) { g.globalAlpha = 0.9; g.strokeStyle = '#ffc93c'; g.lineWidth = 4; g.beginPath(); g.ellipse(4, 3, b.w * 0.62, 11 + Math.sin(time * 5) * 1.2, 0, 0, TAU); g.stroke(); }
    g.restore();
    for (const L of lights) litList.push([X + L[0] * k, Y + L[1] * k, L[2] * k, L[3]]);
    lights.length = 0;
    b.hit = { x: X - (b.w / 2) * k, y: Y - b.hh * k - 8 * k, w: b.w * k, h: (b.hh + 14) * k };
  }

  function drawTreeN(t, X, Y, k0) {
    const k = k0 * t.s; g.save(); g.translate(X, Y); g.scale(k, k);
    g.lineWidth = Math.max(1.2 / k, 1.7); g.strokeStyle = INK; g.lineJoin = 'round';
    ell(2, 1, 10, 3.5, 'rgba(0,0,0,.15)');
    if (t.type === 'con') {
      box(-1.8, -7, 3.6, 7, '#7a5232');
      const gcol = t.c < 0.5 ? '#2f7d4f' : '#3a8f5a';
      for (let i = 0; i < 3; i++) { const y = -6 - i * 9; const w = 12 - i * 3; poly([[-w, y], [w, y], [0, y - 15]], gcol); if (sea.snow > 0.6) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-w * 0.55, y - 7); g.lineTo(w * 0.55, y - 7); g.lineTo(0, y - 15); g.closePath(); g.fill(); } }
    } else {
      box(-2, -11, 4, 11, '#8a5a32');
      const bare = sea.bare > 0.5;
      if (bare) {
        g.beginPath(); g.moveTo(0, -10); g.lineTo(-7, -22); g.moveTo(0, -12); g.lineTo(6, -23); g.moveTo(0, -15); g.lineTo(0, -26); g.stroke();
        if (snowy()) { ell(-7, -22, 2.5, 1.6, '#fff'); ell(6, -23, 2.5, 1.6, '#fff'); }
      } else {
        let col;
        if (t.type === 'cherry') col = season === 'spring' ? '#ffb3c7' : season === 'summer' ? '#6cc070' : '#e0603a';
        else col = season === 'spring' ? '#8fd67a' : season === 'summer' ? (t.c < 0.5 ? '#6cc070' : '#4fae6b') : (t.c < 0.33 ? '#ffa23c' : t.c < 0.66 ? '#e8503a' : '#ffc93c');
        ell(0, -20, 11, 10, col, true); ell(-5, -17, 6, 5.5, shade(col, 0.25));
        if (t.type === 'cherry' && season === 'spring') { g.fillStyle = '#ff8fb0'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(-7 + i * 3.6, -21 + (i % 2) * 5, 1.5, 0, TAU); g.fill(); } }
      }
    }
    g.restore();
  }

  function mtnPath(w, h, k, lean) { // asymmetric peak silhouette, origin at base centre
    return [[-w / 2, 0], [-w * 0.3, -h * 0.45], [-w * 0.12, -h * 0.62 + lean], [0, -h], [w * 0.1, -h * 0.7], [w * 0.22, -h * 0.55], [w * 0.5, 0]];
  }
  function drawPeak(e, X, Y, k0) {
    const k = k0; g.save(); g.translate(X, Y); g.scale(k, k);
    g.lineWidth = Math.max(1.1 / k, 1.5); g.strokeStyle = INK; g.lineJoin = 'round';
    const w = e.w; const h = e.h;
    const pts = [[-w / 2, 0], [-w * 0.12, -h * 0.55], [0, -h], [w * 0.14, -h * 0.62], [w / 2, 0]];
    poly(pts, e.k < 0.5 ? '#8d9bb3' : '#7f8fa8');
    poly([[0, -h], [w * 0.14, -h * 0.62], [w / 2, 0], [w * 0.08, 0]], '#6f7f99');
    const cap = 0.22 + sea.snow * 0.38;
    const yc = -h * (1 - cap);
    const wl = (w * 0.12 + (w * 0.5 - w * 0.12) * ((yc / -h) * 0)) ; void wl;
    // snow cap: triangle from the summit down to the snow line
    const f = cap * 1.0; const lx = -w * 0.12 * (1 - f) - (w * 0.38) * f * 0.55; const rx = w * 0.14 * (1 - f) + (w * 0.36) * f * 0.55;
    g.beginPath(); g.moveTo(0, -h); g.lineTo(lx, yc); g.lineTo(lx * 0.4 + 2, yc + 6); g.lineTo(lx * 0.1, yc - 2); g.lineTo(rx * 0.3, yc + 7); g.lineTo(rx, yc); g.closePath(); g.fillStyle = '#ffffff'; g.fill(); g.stroke();
    // green foothills
    g.save(); g.fillStyle = sea.bare > 0.5 ? '#9fb5a6' : '#4f9a63'; g.beginPath(); g.moveTo(-w / 2, 0); g.quadraticCurveTo(-w * 0.3, -h * 0.22, 0, -h * 0.14); g.quadraticCurveTo(w * 0.3, -h * 0.22, w / 2, 0); g.closePath(); g.fill(); g.restore();
    g.restore();
  }

  function skierPos(m, sk) {
    const run = m.runsPts[sk.run]; if (!run) return null;
    const seg = Math.max(0, Math.min(run.length - 2, Math.floor(sk.t * (run.length - 1)))); const f = sk.t * (run.length - 1) - seg;
    return [run[seg][0] + (run[seg + 1][0] - run[seg][0]) * f, run[seg][1] + (run[seg + 1][1] - run[seg][1]) * f];
  }
  function drawSkier(c) {
    g.save(); g.lineCap = 'round';
    g.lineWidth = 2.2; g.strokeStyle = '#1d3a6e'; g.beginPath(); g.moveTo(-6, 1); g.lineTo(7, 3); g.stroke();
    g.lineWidth = 3.2; g.strokeStyle = c; g.beginPath(); g.moveTo(0, 0); g.lineTo(1, -6); g.stroke();
    g.fillStyle = c; g.beginPath(); g.arc(1.5, -9, 2.8, 0, TAU); g.fill();
    g.fillStyle = '#2b2b3a'; g.fillRect(0.6, -10.2, 3.6, 1.8);
    g.lineWidth = 0.9; g.strokeStyle = INK; g.beginPath(); g.moveTo(-1, -5); g.lineTo(-7, 1); g.moveTo(4, -5); g.lineTo(8, 1); g.stroke();
    g.restore();
  }
  function drawBigMountain(m, X, Y, k) {
    g.save(); g.translate(X, Y); g.scale(k, k);
    g.lineWidth = Math.max(1.2 / k, 1.8); g.strokeStyle = INK; g.lineJoin = 'round';
    const w = m.w; const h = m.h;
    if (m.baker) {
      poly([[-w / 2, 0], [-w * 0.22, -h * 0.55], [-w * 0.06, -h * 0.9], [0, -h], [w * 0.07, -h * 0.92], [w * 0.2, -h * 0.58], [w / 2, 0]], '#9fb1c9');
      poly([[0, -h], [w * 0.07, -h * 0.92], [w * 0.2, -h * 0.58], [w / 2, 0], [w * 0.1, 0]], '#8499b6');
      g.beginPath(); g.moveTo(0, -h); g.lineTo(-w * 0.2, -h * 0.5); g.lineTo(-w * 0.12, -h * 0.46); g.lineTo(-w * 0.05, -h * 0.52); g.lineTo(w * 0.05, -h * 0.44); g.lineTo(w * 0.15, -h * 0.5); g.lineTo(w * 0.18, -h * 0.58); g.closePath(); g.fillStyle = '#fff'; g.fill(); g.stroke();
    } else if (m.tusk) {
      poly([[-w / 2, 0], [-w * 0.3, -h * 0.4], [-w * 0.12, -h * 0.5], [-w * 0.1, -h * 0.9], [0, -h], [w * 0.1, -h * 0.82], [w * 0.14, -h * 0.5], [w * 0.4, -h * 0.35], [w / 2, 0]], '#5a5f6e');
      poly([[0, -h], [w * 0.1, -h * 0.82], [w * 0.14, -h * 0.5], [w * 0.05, -h * 0.3], [0, -h * 0.6]], '#454a58');
      g.beginPath(); g.moveTo(-w * 0.1, -h * 0.8); g.lineTo(-w * 0.04, -h * 0.74); g.lineTo(w * 0.1, -h * 0.76); g.lineTo(w * 0.08, -h * 0.84); g.lineTo(0, -h); g.closePath(); g.fillStyle = 'rgba(255,255,255,.9)'; g.fill();
    } else {
      const pts = [[-w / 2, 0], [-w * 0.3, -h * 0.42], [-w * 0.1, -h * 0.74], [0, -h], [w * 0.12, -h * 0.76], [w * 0.28, -h * 0.5], [w * 0.5, 0]];
      poly(pts, '#8d9bb3');
      poly([[0, -h], [w * 0.12, -h * 0.76], [w * 0.28, -h * 0.5], [w * 0.5, 0], [w * 0.12, 0]], '#6f7f99');
      const cap = 0.25 + sea.snow * 0.3; const yc = -h * (1 - cap);
      g.beginPath(); g.moveTo(0, -h); g.lineTo(-w * 0.14 - cap * w * 0.1, yc); g.lineTo(-w * 0.05, yc + 8); g.lineTo(w * 0.03, yc - 4); g.lineTo(w * 0.1, yc + 9); g.lineTo(w * 0.14 + cap * w * 0.1, yc); g.lineTo(w * 0.12, -h * 0.76); g.closePath(); g.fillStyle = '#fff'; g.fill(); g.stroke();
      // forest on the lower slopes
      g.save(); g.fillStyle = sea.bare > 0.5 ? '#aabfb0' : '#3f8a58'; g.beginPath(); g.moveTo(-w / 2, 0); g.quadraticCurveTo(-w * 0.28, -h * 0.3, -w * 0.04, -h * 0.24); g.quadraticCurveTo(w * 0.26, -h * 0.3, w / 2, 0); g.closePath(); g.fill(); g.restore();
      // ski runs
      if (m.ski && season === 'winter') {
        g.save(); g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
        m.runsPts.forEach((r) => { g.beginPath(); r.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); });
        g.strokeStyle = 'rgba(100,150,210,.5)'; g.lineWidth = 1.5; m.runsPts.forEach((r) => { g.beginPath(); r.forEach((p, i) => (i ? g.lineTo(p[0] + 4, p[1]) : g.moveTo(p[0] + 4, p[1]))); g.stroke(); });
        g.restore();
        m.skiers.forEach((sk, i) => { const p = skierPos(m, sk); if (p) { g.save(); g.translate(p[0], p[1]); drawSkier(['#e8503a', '#ffc93c', '#3a8fc7'][i % 3]); g.restore(); } });
      }
    }
    g.restore();
  }

  /* ---------- people ---------- */
  function drawPerson(p) {
    const X = sx(p.x); const Y = sy(p.y); if (!onScreen(X, Y, 60)) { p.sx = undefined; return; }
    const k = Math.max(cam.z, 0.5) * p.k; g.save(); g.translate(X, Y); g.scale(k, k);
    g.lineWidth = Math.max(1.1 / k, 1.6); g.strokeStyle = INK; g.lineJoin = 'round'; g.lineCap = 'round';
    const sw = p.moving ? Math.sin(p.ph) * 4 : 0; const bob = p.moving ? -Math.abs(Math.sin(p.ph)) * 1.6 : Math.sin(time * 2 + p.id) * 0.4;
    ell(0, 0, 8, 3, 'rgba(0,0,0,.2)');
    const f = p.face; const cold = season === 'winter'; const cool = cold || season === 'autumn';
    const male = p.sex === 'm'; const guide = p.owner;
    // back accessories
    if (!guide && ((male && p.acc === 1) || (!male && p.outfit === 0 && p.acc < 2))) { // yoga mat on the back
      g.save(); g.translate(-f * 6, -15 + bob); g.rotate(-f * 0.5); box(-2.5, -9, 5, 18, male ? '#3a8fc7' : '#8f7be0', 2.5); g.restore();
    } else if (!guide && p.acc === 2) box(-f * 7 - 3.5, -20 + bob, 7, 11, '#e8503a', 2.5); // daypack
    // legs
    const longPants = !male || cool;
    const legCol = guide ? '#2b2b3a' : (male ? p.bot : (p.outfit === 1 && !cold ? '#2b2b3a' : p.bot));
    g.save(); g.lineWidth = 3.6;
    if (male && !cool) { // shorts show bare legs
      g.strokeStyle = p.skin; g.beginPath(); g.moveTo(-2.6, -6 + bob); g.lineTo(-2.6 + sw, -0.5); g.moveTo(2.6, -6 + bob); g.lineTo(2.6 - sw, -0.5); g.stroke();
    } else {
      g.strokeStyle = legCol; g.beginPath(); g.moveTo(-2.6, -9 + bob); g.lineTo(-2.6 + sw, -0.5); g.moveTo(2.6, -9 + bob); g.lineTo(2.6 - sw, -0.5); g.stroke();
    }
    g.restore(); void longPants;
    g.save(); g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(-2.6 + sw, -0.4, 2.6, 1.5, 0, 0, TAU); g.ellipse(2.6 - sw, -0.4, 2.6, 1.5, 0, 0, TAU); g.fill(); g.stroke(); g.restore();
    if (male && !cool) box(-5.6, -12 + bob, 11.2, 6, p.bot, 2); // the shorts
    // torso
    let topCol = p.top; let hood = false; let zip = false;
    if (guide) { topCol = '#e8503a'; hood = true; }
    else if (male) { topCol = cold ? '#3a5fa8' : p.top; hood = true; }
    else if (p.outfit === 0 && !cold) { topCol = p.top; }
    else { topCol = cold ? p.shell : p.shell; hood = true; zip = true; }
    if (hood) ell(0, -21 + bob, 6.4, 3.4, shade(topCol, -0.2), true); // hood bunched at the neck
    const crop = !male && !guide && p.outfit === 0 && !cold;
    box(-6, -21 + bob, 12, crop ? 9 : 13, topCol, 4.5);
    if (crop) box(-5.6, -12.5 + bob, 11.2, 4, '#2b2b3a', 2); // high-rise waistband
    if (male && !guide) { box(-3.8, -13 + bob, 7.6, 4.4, shade(topCol, -0.18), 2); g.save(); g.lineWidth = 0.9; g.beginPath(); g.moveTo(-1.6, -19 + bob); g.lineTo(-1.6, -15.5 + bob); g.moveTo(1.6, -19 + bob); g.lineTo(1.6, -15.5 + bob); g.stroke(); g.restore(); }
    if (zip) { g.save(); g.lineWidth = 1; g.beginPath(); g.moveTo(0, -20 + bob); g.lineTo(0, -8 + bob); g.stroke(); g.fillStyle = '#ffc93c'; g.fillRect(-6, -17 + bob, 12, 1.6); g.restore(); }
    if (guide) { emoji('🍁', 0, -14.5 + bob, 8); }
    // arms
    g.save(); g.lineWidth = 3; g.strokeStyle = (male || zip || guide || cold) ? shade(topCol, -0.25) : p.skin;
    g.beginPath(); g.moveTo(-6, -18 + bob); g.lineTo(-8, -12 + bob - sw * 0.3); g.moveTo(6, -18 + bob); g.lineTo(8, -12 + bob + sw * 0.3); g.stroke(); g.restore();
    // head
    const hy = -28 + bob;
    if (!male && !guide) { const sway = Math.sin(time * 5 + p.id) * (p.moving ? 3 : 0.8); g.save(); g.lineWidth = 3.6; g.strokeStyle = p.hair; g.beginPath(); g.moveTo(-f * 5, hy - 2); g.quadraticCurveTo(-f * (10 + sway), hy + 2, -f * (8 + sway * 1.4), hy + 9); g.stroke(); g.restore(); }
    ell(0, hy, 7.6, 7.6, p.skin, true);
    g.beginPath(); g.arc(0, hy, 7.8, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); g.fillStyle = p.hair; g.fill(); g.stroke();
    if (cool && !guide) { // toque
      g.beginPath(); g.arc(0, hy - 1, 8, Math.PI * 1.0, Math.PI * 2.0); g.closePath(); g.fillStyle = male ? '#e8503a' : '#ffffff'; g.fill(); g.stroke(); box(-8, hy - 3, 16, 3.4, shade(male ? '#e8503a' : '#ffffff', -0.15), 1.5); ell(0, hy - 10, 2.6, 2.6, '#ffc93c', true);
    } else if (guide) {
      g.beginPath(); g.arc(0, hy - 1, 8, Math.PI * 1.0, Math.PI * 2.0); g.closePath(); g.fillStyle = '#ffffff'; g.fill(); g.stroke(); box(-8, hy - 3, 16, 3.4, '#e8503a', 1.5);
    } else if (!male && p.outfit === 0) box(-7.6, hy - 6, 15.2, 3, p.top === '#2b2b3a' ? '#ff9ebb' : p.top, 1.5); // headband
    else if (male && p.acc === 3) { g.beginPath(); g.arc(0, hy - 1, 8, Math.PI * 1.0, Math.PI * 2.0); g.closePath(); g.fillStyle = '#2f6f73'; g.fill(); g.stroke(); box(f * 1 - 1, hy - 3, 11 * f > 0 ? 11 : -11, 2.4, '#2f6f73', 1); }
    // face
    g.fillStyle = INK; g.beginPath(); g.arc(f * 2.2 - 2.4, hy + 0.5, 1.2, 0, TAU); g.arc(f * 2.2 + 2.4, hy + 0.5, 1.2, 0, TAU); g.fill();
    if (season === 'summer' && p.acc !== 0) { g.fillStyle = '#2b2b3a'; g.fillRect(f * 2.2 - 5.2, hy - 1, 10.4, 2.6); }
    g.fillStyle = 'rgba(255,120,120,.45)'; g.beginPath(); g.arc(f * 2.2 - 4.6, hy + 3, 1.7, 0, TAU); g.arc(f * 2.2 + 4.6, hy + 3, 1.7, 0, TAU); g.fill();
    if (p.eatT > 0 && p.eatEmoji) emoji(p.eatEmoji, f * 10, -15 + bob + Math.sin(time * 6) * 1.5, 11);
    g.restore();
    p.sx = X; p.sy = Y; p.sk = k;
  }

  function drawPaddler(q, vis) {
    const x = q.cx + Math.cos(q.a) * q.rx; const y = q.cy + Math.sin(q.a) * q.ry;
    const X = sx(x); const Y = sy(y); if (!onScreen(X, Y, 50)) return;
    const k = Math.max(cam.z, 0.5); g.save(); g.translate(X, Y); g.scale(k, k); g.globalAlpha = vis;
    g.lineWidth = Math.max(1.1 / k, 1.5); g.strokeStyle = INK; g.lineJoin = 'round'; g.lineCap = 'round';
    const dir = Math.sin(q.a + Math.PI / 2) * q.rx * q.v > 0 ? -1 : 1;
    g.scale(dir, 1);
    g.save(); g.globalAlpha = 0.5 * vis; ell(0, 3, 16, 3, '#ffffff'); g.restore();
    const tone = q.sex === 'f' ? '#2b2b3a' : '#6b7a8f';
    if (q.type === 'kayak') {
      g.beginPath(); g.moveTo(-17, 0); g.quadraticCurveTo(0, 6, 17, 0); g.quadraticCurveTo(0, -4, -17, 0); g.fillStyle = q.col; g.fill(); g.stroke();
      box(-3.5, -12, 7, 10, q.sex === 'f' ? '#1f6f78' : '#ffc93c', 3);
      ell(0, -17, 4.6, 4.6, '#ffdcb8', true);
      g.beginPath(); g.arc(0, -18, 4.8, Math.PI, TAU); g.fillStyle = q.sex === 'f' ? '#5a3d2b' : '#2b2b3a'; g.fill(); g.stroke();
      const s = Math.sin(time * 4 + q.a * 3) * 4;
      g.save(); g.lineWidth = 1.6; g.beginPath(); g.moveTo(-14 + s, -12 - s); g.lineTo(14 + s, -3 + s); g.stroke(); g.fillStyle = q.col; g.beginPath(); g.ellipse(-14 + s, -12 - s, 3, 1.6, 0.6, 0, TAU); g.ellipse(14 + s, -3 + s, 3, 1.6, 0.6, 0, TAU); g.fill(); g.restore();
    } else {
      g.beginPath(); g.moveTo(-17, 0); g.quadraticCurveTo(0, 5, 17, 0); g.quadraticCurveTo(0, -3, -17, 0); g.fillStyle = '#ffffff'; g.fill(); g.stroke();
      g.save(); g.lineWidth = 3.4; g.strokeStyle = q.sex === 'f' ? '#2b2b3a' : '#3a8fc7'; g.beginPath(); g.moveTo(-2, -1); g.lineTo(-2, -9); g.moveTo(2, -1); g.lineTo(2, -9); g.stroke(); g.restore();
      box(-5, -21, 10, 13, q.sex === 'f' ? q.col : '#e8503a', 4);
      ell(0, -27, 5, 5, '#ffdcb8', true); g.beginPath(); g.arc(0, -27, 5.2, Math.PI, TAU); g.fillStyle = q.sex === 'f' ? '#5a3d2b' : '#2b2b3a'; g.fill(); g.stroke();
      const s = Math.sin(time * 3 + q.a * 2) * 3;
      g.save(); g.lineWidth = 1.6; g.beginPath(); g.moveTo(-6 + s, -26); g.lineTo(8 + s, 3); g.stroke(); g.fillStyle = q.col; g.beginPath(); g.ellipse(8 + s, 3, 2.2, 3.4, 0.4, 0, TAU); g.fill(); g.restore();
    }
    g.restore();
  }

  function drawCar(c) {
    const [x, y, dx] = posAt(c.L, c.s); const X = sx(x); const Y = sy(y); if (!onScreen(X, Y, 40)) return;
    const k = Math.max(cam.z, 0.35); g.save(); g.translate(X, Y); g.scale(k * (dx * c.dir >= 0 ? 1 : -1), k);
    g.lineWidth = Math.max(1.1 / k, 1.5); g.strokeStyle = INK; g.lineJoin = 'round';
    ell(0, 1, 11, 3, 'rgba(0,0,0,.2)');
    if (c.bus) { box(-14, -13, 28, 11, '#3a8fc7', 3); g.fillStyle = '#cfeaff'; g.fillRect(-11, -11, 22, 4); }
    else { box(-9, -8, 18, 6, c.col, 2.5); box(-5, -13, 10, 6, shade(c.col, 0.15), 2.5); g.fillStyle = '#cfeaff'; g.fillRect(-3.4, -12, 6.8, 3.4); }
    ell(-5.5, -1, 2.6, 2.6, '#2b2b3a', true); ell(5.5, -1, 2.6, 2.6, '#2b2b3a', true);
    g.restore();
  }

  /* ---------- Rocky Mountaineer ---------- */
  const NAVY = '#1d3a6e'; const GOLD = '#ffc93c'; const GLASS = '#bfe6ff';
  function lerp2(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
  function railBox(cx, cy, dx, dy, len, wid, h, z0, col, o) {
    const hx = (dx * len) / 2; const hy = (dy * len) / 2; const nx = (-dy * wid) / 2; const ny = (dx * wid) / 2;
    const C = [[cx - hx - nx, cy - hy - ny], [cx + hx - nx, cy + hy - ny], [cx + hx + nx, cy + hy + ny], [cx - hx + nx, cy - hy + ny]];
    const S0 = C.map((c) => [sx(c[0]), sy(c[1], z0)]); const S1 = C.map((c) => [sx(c[0]), sy(c[1], z0 + h)]);
    const faces = [];
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; const mx = (C[i][0] + C[j][0]) / 2 - cx; const my = (C[i][1] + C[j][1]) / 2 - cy; if (my > 0.01) faces.push(i); }
    const quad = (i, u0, u1, v0, v1) => {
      const j = (i + 1) % 4; const pt = (u, v) => lerp2(lerp2(S0[i], S0[j], u), lerp2(S1[i], S1[j], u), v);
      return [pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1)];
    };
    const fillQ = (q, c, stroke) => { g.beginPath(); q.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fillStyle = c; g.fill(); if (stroke) g.stroke(); };
    faces.forEach((i) => {
      const along = i % 2 === 0; // faces parallel to the heading
      fillQ(quad(i, 0, 1, 0, 1), along ? col : shade(col, -0.25), true);
      if (along && o.stripe) fillQ(quad(i, 0, 1, 0.08, 0.2), GOLD, false);
      if (along && o.windows) { const n = o.windows; for (let w = 0; w < n; w++) { const u0 = 0.08 + (w / n) * 0.84 + 0.01; const u1 = 0.08 + ((w + 1) / n) * 0.84 - 0.01; fillQ(quad(i, u0, u1, 0.42, 0.82), env.n > 0.3 ? '#ffe9a8' : GLASS, false); } }
      if (!along && o.nose) fillQ(quad(i, 0.1, 0.9, 0.55, 0.85), '#cfeaff', false);
    });
    fillQ(S1, shade(col, 0.22), true);
    if (o.glass) { // glass dome on the roof
      const m = 0.22; const T = S1.map((p, i) => lerp2(p, S1[(i + 2) % 4], m));
      const U = T.map((p) => [p[0], p[1] - h * 0.55 * cam.z]);
      for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; if (faces.includes(i)) fillQ([T[i], T[j], U[j], U[i]], 'rgba(191,230,255,.78)', true); }
      fillQ(U, 'rgba(225,244,255,.9)', true);
    }
    return S0.concat(S1);
  }
  function drawTrain(t) {
    const GAP = 3; const LOCO = 34; const CAR = 38;
    const dir = t.dir; const parts = [];
    let off = 0;
    for (let i = 0; i <= t.cars; i++) {
      const len = i === 0 ? LOCO : CAR; const cs = t.s - dir * (off + len / 2); off += len + GAP;
      if (cs < 0 || cs > t.L.len) continue;
      const [x, y, ddx, ddy] = posAt(t.L, cs); const d = Math.hypot(ddx, ddy) || 1;
      parts.push({ i, x, y, dx: (ddx / d) * (dir < 0 ? -1 : 1) * (i === 0 ? 1 : 1), dy: (ddy / d) * (dir < 0 ? -1 : 1), len });
    }
    parts.sort((a, b) => a.y - b.y);
    let minX = 1e9; let minY = 1e9; let maxX = -1e9; let maxY = -1e9;
    const lit = env.n > 0.2;
    parts.forEach((p) => {
      let pts;
      if (p.i === 0) pts = railBox(p.x, p.y, p.dx, p.dy, p.len, 15, 18, 3, NAVY, { stripe: true, nose: true, windows: 2 });
      else pts = railBox(p.x, p.y, p.dx, p.dy, p.len, 15, 15, 3, p.i % 2 ? NAVY : '#27508f', { stripe: true, windows: 6, glass: p.i % 2 === 0 });
      pts.forEach((q) => { minX = Math.min(minX, q[0]); maxX = Math.max(maxX, q[0]); minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]); });
      if (lit && p.i > 0) litList.push([sx(p.x), sy(p.y, 12), 34 * cam.z, '255,210,120']);
    });
    t.hit = { x: minX - 4, y: minY - 4, w: maxX - minX + 8, h: maxY - minY + 8 };
    // loco headlight + smoke
    if (parts.length) {
      const hd = parts.find((p) => p.i === 0);
      if (hd) { t.x = hd.x; t.y = hd.y; t.sx = sx(hd.x); t.sy = sy(hd.y, 14); t.sk = Math.max(cam.z, 0.6);
        g.save(); g.globalAlpha = 0.55; for (let i = 0; i < 3; i++) { const f = ((time * 0.7 + i / 3) % 1); ell(sx(hd.x) - hd.dx * 6 * cam.z + Math.sin(f * 7) * 3, sy(hd.y, 22 + f * 24), (3 + f * 5) * cam.z, (2.5 + f * 3) * cam.z, '#e6e6ea'); } g.restore();
        if (lit) litList.push([sx(hd.x + hd.dx * 20), sy(hd.y + hd.dy * 20, 10), 60 * cam.z, '255,245,200']);
      }
    }
  }
  function moveTrains(dt) {
    for (const t of TRAINS) { const q0 = posAt(t.L, t.s); t.x = q0[0]; t.y = q0[1]; }
    for (const t of TRAINS) {
      if (t.state === 'wait') { t.wait -= dt; if (t.wait <= 0) { t.state = 'run'; if (t.flip) { t.dir = -t.dir; t.flip = false; } } continue; }
      const prev = t.s; t.s += t.dir * t.v * dt;
      for (let i = 0; i < t.stops.length; i++) {
        const sv = t.stops[i]; const end = i === t.stops.length - 1;
        if ((prev < sv && t.s >= sv && t.dir > 0) || (prev > sv && t.s <= sv && t.dir < 0)) {
          if (t.skip === i) continue;
          t.s = sv; t.state = 'wait'; t.wait = end ? 9 : 6; t.skip = i; if (end) { t.flip = true; t.skip = -1; }
          break;
        }
      }
      if (t.s <= 6 && t.dir < 0) { t.s = 6; t.state = 'wait'; t.wait = 9; t.flip = true; t.skip = -1; }
      if (t.skip !== undefined && t.skip >= 0 && Math.abs(t.s - t.stops[t.skip]) > 60) t.skip = -1;
    }
  }

  /* ---------- ferries, planes, whales, sailboats, gondolas ---------- */
  function drawFerry(s) {
    const [x, y, dx] = posAt(s.L, s.s); const X = sx(x); const Y = sy(y); if (!onScreen(X, Y, 120)) return;
    const k = Math.max(cam.z, 0.4); g.save(); g.translate(X, Y); g.scale(k * (dx * s.dir >= 0 ? 1 : -1), k);
    g.lineWidth = Math.max(1.2 / k, 1.7); g.strokeStyle = INK; g.lineJoin = 'round';
    g.save(); g.globalAlpha = 0.5; ell(-30, 4, 22, 3, '#ffffff'); ell(-52, 6, 14, 2.2, '#ffffff'); g.restore();
    poly([[-40, -10], [42, -10], [34, 3], [-34, 3]], '#233b6e'); box(-38, -6, 76, 3, '#ffffff');
    box(-32, -22, 60, 12, '#ffffff', 2); box(-24, -32, 42, 10, '#ffffff', 2); box(-10, -40, 18, 8, '#f3f6fa', 2);
    g.save(); g.fillStyle = env.n > 0.3 ? '#ffe9a8' : '#7fbfe0'; for (let i = 0; i < 9; i++) g.fillRect(-30 + i * 6.6, -19, 4, 3.4); for (let i = 0; i < 6; i++) g.fillRect(-22 + i * 6.6, -29, 4, 3.2); g.restore();
    box(16, -48, 9, 10, '#233b6e', 2); box(16, -43, 9, 3, '#e8503a');
    g.restore();
    if (env.n > 0.3) litList.push([X, Y - 24 * k, 70 * k, '255,230,170']);
  }
  function moveShips(dt) {
    for (const s of SHIPS) {
      if (s.wait > 0) { s.wait -= dt; continue; }
      s.s += s.dir * s.v * dt;
      if (s.s >= s.L.len) { s.s = s.L.len; s.dir = -1; s.wait = 7; }
      if (s.s <= 0) { s.s = 0; s.dir = 1; s.wait = 7; }
    }
    PLANE.s += PLANE.dir * PLANE.v * dt * (PLANE.wait > 0 ? 0 : 1); if (PLANE.wait > 0) PLANE.wait -= dt;
    if (PLANE.s >= PLANE.L.len) { PLANE.s = PLANE.L.len; PLANE.dir = -1; PLANE.wait = 14; }
    if (PLANE.s <= 0) { PLANE.s = 0; PLANE.dir = 1; PLANE.wait = 14; }
    for (const c of cars) { c.s += c.dir * c.v * dt; if (c.s > c.L.len) c.s = 0; if (c.s < 0) c.s = c.L.len; }
    for (const q of PADDLERS) q.a += q.v * dt;
    for (const m of BIGM) m.skiers.forEach((sk) => { sk.t += sk.v * dt; if (sk.t > 1) { sk.t = 0; sk.run = (sk.run + 1) % Math.max(1, m.runs); } });
    for (const cb of CABLES) cb.cabins.forEach((c) => { c.t += c.d * cb.v * dt; if (c.t > 1) { c.t = 1; c.d = -1; } if (c.t < 0) { c.t = 0; c.d = 1; } });
  }
  function drawPlane() {
    if (PLANE.wait > 0 && (PLANE.s <= 1 || PLANE.s >= PLANE.L.len - 1)) { /* parked at the dock */ }
    const [x, y, dx] = posAt(PLANE.L, PLANE.s); const lift = clamp(Math.min(PLANE.s, PLANE.L.len - PLANE.s) / 120, 0, 1) * 46;
    const X = sx(x); const Y = sy(y, lift); if (!onScreen(X, Y, 60)) return;
    const k = Math.max(cam.z, 0.45); g.save();
    g.globalAlpha = 0.25; ell(X, sy(y, 0), 16 * k, 4 * k, '#000'); g.globalAlpha = 1;
    g.translate(X, Y); g.scale(k * (dx * PLANE.dir >= 0 ? 1 : -1), k); g.lineWidth = Math.max(1.1 / k, 1.5); g.strokeStyle = INK; g.lineJoin = 'round';
    box(-6, 4, 24, 3, '#e8503a', 1.5); box(-14, -6, 32, 9, '#ffffff', 4); poly([[-14, -5], [-24, -14], [-20, -4]], '#e8503a'); box(-4, -9, 18, 3, '#e8503a'); ell(10, -2, 3, 2.4, '#7fbfe0', true);
    g.beginPath(); g.moveTo(18, -2); g.lineTo(22, -2); g.moveTo(21, -6); g.lineTo(21, 2); g.stroke();
    g.restore();
  }
  function drawSailboat(s, alpha) {
    const X = sx(s.x); const Y = sy(s.y + Math.sin(time + s.ph) * 1.2); if (!onScreen(X, Y, 40)) return;
    const k = Math.max(cam.z, 0.5); g.save(); g.globalAlpha = alpha; g.translate(X, Y); g.scale(k, k); g.lineWidth = Math.max(1.1 / k, 1.5); g.strokeStyle = INK; g.lineJoin = 'round';
    poly([[-13, 0], [13, 0], [9, 6], [-9, 6]], '#ffffff'); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -26); g.stroke();
    poly([[1, -25], [1, -3], [13, -3]], s.col); poly([[-1, -22], [-1, -3], [-10, -3]], '#ffffff');
    g.restore();
  }
  function drawCargo(c) {
    const X = sx(c.x); const Y = sy(c.y); if (!onScreen(X, Y, 80)) return;
    const k = Math.max(cam.z, 0.4); g.save(); g.translate(X, Y); g.scale(k, k); g.lineWidth = Math.max(1.1 / k, 1.5); g.strokeStyle = INK; g.lineJoin = 'round';
    poly([[-36, -6], [40, -6], [32, 6], [-32, 6]], '#a64d4d'); box(-30, -14, 14, 8, '#fff', 1.5);
    ['#e8503a', '#3a8fc7', '#ffc93c', '#3fb68b', '#e8503a', '#3a8fc7'].forEach((c_, i) => box(-10 + i * 8, -13, 7, 7, c_, 1));
    g.restore();
  }
  function drawWhale(w) {
    const cyc = (time * 0.07 + w.ph) % 1; if (!(cyc >= 0 && cyc <= 0.22)) return; const f = cyc / 0.22;
    const X = sx(w.x + Math.cos(f * 2) * 20); const Y = sy(w.y); if (!onScreen(X, Y, 60)) return;
    const k = Math.max(cam.z, 0.5); g.save(); g.translate(X, Y); g.scale(k, k); g.lineWidth = Math.max(1.1 / k, 1.5); g.strokeStyle = INK;
    const up = Math.max(0, Math.sin(f * Math.PI));
    g.beginPath(); g.ellipse(0, 0, 18, 6 * up + 1, 0, Math.PI, TAU); g.closePath(); g.fillStyle = '#2b2b3a'; g.fill(); g.stroke();
    poly([[10, -1], [20, -9 * up - 2], [14, 0]], '#2b2b3a');
    if (up > 0.5) { g.save(); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-6, -4); g.lineTo(-6, -16); g.moveTo(-6, -16); g.lineTo(-11, -10); g.moveTo(-6, -16); g.lineTo(-1, -10); g.stroke(); g.restore(); }
    g.restore();
  }
  function cablePt(cb, t) { return [cb.a[0] + (cb.b[0] - cb.a[0]) * t, cb.a[1] + (cb.b[1] - cb.a[1]) * t, cb.a[2] + (cb.b[2] - cb.a[2]) * t + Math.sin(t * Math.PI) * -6]; }
  function drawCable(cb) {
    const x0 = sx(cb.a[0]); const y0 = sy(cb.a[1], cb.a[2]); const x1 = sx(cb.b[0]); const y1 = sy(cb.b[1], cb.b[2]);
    if (Math.max(x0, x1) < -40 || Math.min(x0, x1) > W + 40 || Math.max(y0, y1) < -40 || Math.min(y0, y1) > H + 80) return;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = INK; g.lineWidth = Math.max(1.4, 2 * cam.z); g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + 8 * cam.z, x1, y1); g.stroke();
    [cb.a, cb.b].forEach((p) => { const X = sx(p[0]); const Y = sy(p[1]); const Yt = sy(p[1], p[2]); g.lineWidth = Math.max(2, 3.5 * cam.z); g.strokeStyle = '#6b6f78'; g.beginPath(); g.moveTo(X, Y); g.lineTo(X, Yt); g.stroke(); });
    g.restore();
    cb.cabins.forEach((c, i) => {
      const [x, y, z] = cablePt(cb, c.t); const X = sx(x) + Math.sin(time * 1.3 + i) * 1.5 * cam.z; const Y = sy(y, z); const k = Math.max(cam.z, 0.5);
      g.save(); g.translate(X, Y); g.scale(k, k); g.lineWidth = Math.max(1.1 / k, 1.5); g.strokeStyle = INK; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 8); g.stroke(); box(-8, 8, 16, 12, i % 2 ? '#e8503a' : '#ffc93c', 3); g.fillStyle = '#cfeaff'; g.fillRect(-6, 10, 12, 5);
      g.restore();
      if (env.n > 0.3) litList.push([X, Y + 14 * k, 26 * k, '255,220,150']);
    });
  }

  /* ================= ground, weather, overlays, frame ================= */
  let labelsOn = true; let paused = false; let hoverB = null; let selId = null; let selTrain = null; let planRoute = []; let planPath = []; let lastDt = 0.016;
  const toPath = (pts, close) => { const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]))); if (close) p.closePath(); return p; };
  const PATH = {
    land: (() => { const p = new Path2D(); [POLY.main, POLY.island, POLY.olympic, ...POLY.islets].forEach((pl) => p.addPath(toPath(pl, true))); return p; })(),
    mtn: [Z.coast, Z.cascade, Z.islMtn, POLY.olympic].map((pl) => toPath(pl, true)),
    water: POLY.water.map((w) => toPath(w.pts, true)),
    isletLand: POLY.isletLand.map((pl) => toPath(pl, true)),
    rivers: Object.values(RIVER).map((r) => toPath(r, false)),
    hw: Object.entries(HW).map(([k, L]) => [k, toPath(L.pts, false)]),
    rl: Object.entries(RL).map(([k, L]) => [k, toPath(L.pts, false)]),
    fy: Object.values(FY).map((L) => toPath(L.pts, false)),
  };
  const FIELD_COL = {
    spring: [['#e9f7a8', '#cbe46b'], ['#ffc4d6', '#ff9ebb'], ['#fff29a', '#f5d94c']],
    summer: [['#f3dc7a', '#e0c04f'], ['#c9e58a', '#a9cc62'], ['#e7c79a', '#cfa66c']],
    autumn: [['#e8b35a', '#cf8f34'], ['#d9c27a', '#bfa04c'], ['#c78d54', '#a8703a']],
    winter: [['#f4f8fb', '#dfe9f1'], ['#eaf1f7', '#d2e0ea'], ['#f1f5f8', '#dae6ee']],
  };
  const clouds = Array.from({ length: 16 }, (_, i) => ({ x: WORLD.x0 + hashN(i, 3) * (WORLD.x1 - WORLD.x0), y: WORLD.y0 + hashN(3, i) * (WORLD.y1 - WORLD.y0), s: 0.8 + hashN(i, i) * 1.2, v: 5 + hashN(i, 9) * 8 }));
  const parts = Array.from({ length: isMobile() ? 60 : 110 }, (_, i) => ({ x: hashN(i, 1), y: hashN(1, i), s: 0.6 + hashN(i, 5) * 0.9, ph: hashN(i, 7) * TAU, v: 0.6 + hashN(i, 11) * 0.8 }));

  function visRect(m) { const hx = W / 2 / cam.z + m; const hy = H / 2 / (cam.z * cam.tilt) + m; return [cam.x - hx, cam.y - hy, cam.x + hx, cam.y + hy]; }
  function withWorld(fn) { // draw in world coordinates through the camera's affine transform
    g.save(); g.setTransform(DPR * cam.z, 0, 0, DPR * cam.z * cam.tilt, DPR * (W / 2 - cam.x * cam.z), DPR * (H / 2 - cam.y * cam.z * cam.tilt));
    fn(); g.restore();
  }

  function drawGround() {
    const z = cam.z; g.lineJoin = 'round'; g.lineCap = 'round';
    g.fillStyle = '#7cc9ea'; g.fillRect(0, 0, W, H);
    const v = visRect(80);
    // sea waves (screen space)
    if (z > 0.1) {
      g.save(); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = Math.max(1, 1.6 * z); g.beginPath();
      const step = 150; const x0 = Math.floor(v[0] / step) * step; const y0 = Math.floor(v[1] / (step * 0.7)) * (step * 0.7);
      for (let gx = x0; gx < v[2]; gx += step) for (let gy = y0; gy < v[3]; gy += step * 0.7) {
        const wx = gx + hashN(gx, gy) * step; const wy = gy + hashN(gy, gx) * step * 0.7; if (isLand(wx, wy)) continue;
        const X = sx(wx) + Math.sin(time * 0.8 + gx) * 4 * z; const Y = sy(wy); g.moveTo(X - 9 * z, Y); g.quadraticCurveTo(X, Y - 5 * z, X + 9 * z, Y);
      }
      g.stroke(); g.restore();
    }
    withWorld(() => {
      const iz = 1 / z;
      // shallow water band + coast
      g.lineWidth = 34 * iz; g.strokeStyle = 'rgba(190,236,250,.85)'; g.stroke(PATH.land);
      g.lineWidth = 14 * iz; g.strokeStyle = '#a3dff3'; g.stroke(PATH.land);
      g.fillStyle = groundCol(); g.fill(PATH.land);
      // mountain zones
      g.save(); g.clip(PATH.land);
      const mt = 0.3 * (1 - sea.snow * 0.55); g.fillStyle = `rgba(52,118,88,${mt})`; PATH.mtn.forEach((p) => g.fill(p));
      const sn = clamp((sea.snow - 0.35) * 0.55, 0, 0.4); if (sn > 0.02) { g.fillStyle = `rgba(255,255,255,${sn})`; PATH.mtn.forEach((p) => g.fill(p)); }
      // towns: warm paving patches
      for (const t of TOWNS) { if (t.x + t.r < v[0] || t.x - t.r > v[2] || t.y + t.r < v[1] || t.y - t.r > v[3]) continue; g.fillStyle = t.kind === 'metro' ? 'rgba(232,218,190,.5)' : 'rgba(232,218,190,.45)'; g.beginPath(); g.ellipse(t.x, t.y, t.r * 0.8, t.r * 0.62, 0, 0, TAU); g.fill(); }
      g.restore();
      g.lineWidth = 3.4 * iz; g.strokeStyle = INK; g.stroke(PATH.land);
      // inlets & rivers
      PATH.water.forEach((p) => { g.fillStyle = '#7cc9ea'; g.fill(p); g.lineWidth = 3 * iz; g.strokeStyle = INK; g.stroke(p); });
      PATH.isletLand.forEach((p) => { g.fillStyle = groundCol(); g.fill(p); g.stroke(p); });
      PATH.rivers.forEach((p) => { g.lineWidth = 24; g.lineCap = 'butt'; g.strokeStyle = INK; g.stroke(p); });
      PATH.rivers.forEach((p) => { g.lineWidth = 18; g.strokeStyle = '#7cc9ea'; g.stroke(p); });
      g.lineCap = 'round';
      // fields
      const FC = FIELD_COL[season];
      g.lineWidth = Math.max(1.2, 1.6 * iz * 0.7);
      for (const f of FIELDS) {
        if (f.x + f.w < v[0] || f.x > v[2] || f.y + f.h < v[1] || f.y > v[3]) continue;
        g.fillStyle = FC[f.v % 3][0]; g.fillRect(f.x, f.y, f.w, f.h); g.strokeStyle = INK; g.lineWidth = 1.6 * iz; g.strokeRect(f.x, f.y, f.w, f.h);
        g.strokeStyle = FC[f.v % 3][1]; g.lineWidth = 2.6 * iz; g.beginPath();
        if (f.orient) for (let x = f.x + 8; x < f.x + f.w - 3; x += 9) { g.moveTo(x, f.y + 3); g.lineTo(x, f.y + f.h - 3); } else for (let y = f.y + 8; y < f.y + f.h - 3; y += 9) { g.moveTo(f.x + 3, y); g.lineTo(f.x + f.w - 3, y); }
        g.stroke();
      }
      // roads
      PATH.hw.forEach(([k, p]) => { const big = k === 'sea2sky' || k === 'hwy1'; g.lineWidth = (big ? 11 : 8) ; g.strokeStyle = INK; g.stroke(p); });
      PATH.hw.forEach(([k, p]) => { const big = k === 'sea2sky' || k === 'hwy1'; g.lineWidth = big ? 7.5 : 5; g.strokeStyle = k === 'sea2sky' ? '#ffd766' : '#f6efe0'; g.stroke(p); });
      g.setLineDash([9, 12]); g.lineWidth = 1.4; g.strokeStyle = 'rgba(180,140,40,.6)'; PATH.hw.forEach(([k, p]) => { if (k === 'sea2sky') g.stroke(p); }); g.setLineDash([]);
      // railways: dark bed with sleepers
      PATH.rl.forEach(([k, p]) => { if (k === 'south') return; g.lineWidth = 8; g.strokeStyle = INK; g.stroke(p); g.lineWidth = 5.2; g.strokeStyle = '#6c7280'; g.stroke(p); g.lineWidth = 3.4; g.strokeStyle = '#f4f4f6'; g.setLineDash([2.5, 6]); g.stroke(p); g.setLineDash([]); });
      // ferry routes
      g.lineWidth = 3.4 * iz; g.strokeStyle = 'rgba(255,255,255,.85)'; g.setLineDash([12 * iz, 14 * iz]); g.lineDashOffset = -time * 14 * iz; PATH.fy.forEach((p) => g.stroke(p)); g.setLineDash([]);
    });
  }

  function drawClouds() {
    for (const c of clouds) {
      if (!paused) { c.x += c.v * lastDt; if (c.x > WORLD.x1 + 200) c.x = WORLD.x0 - 200; }
      const X = sx(c.x); const Y = sy(c.y, 150); const k = cam.z * c.s; if (!onScreen(X, Y, 120 * k)) continue;
      const SY = sy(c.y);
      g.fillStyle = 'rgba(0,50,80,.1)'; g.beginPath(); g.ellipse(X, SY + 20 * k, 50 * k, 12 * k, 0, 0, TAU); g.fill();
      g.fillStyle = season === 'winter' ? 'rgba(240,244,250,.9)' : 'rgba(255,255,255,.88)'; g.beginPath();
      g.arc(X - 28 * k, Y, 18 * k, 0, TAU); g.arc(X, Y - 10 * k, 24 * k, 0, TAU); g.arc(X + 28 * k, Y, 19 * k, 0, TAU); g.rect(X - 28 * k, Y, 56 * k, 18 * k);
      g.fill();
    }
  }
  function drawSeasonParticles() {
    if (season === 'summer') return;
    const t = time; const sp = lastDt * (paused ? 0 : 1);
    g.save();
    for (const p of parts) {
      p.y += sp * (season === 'winter' ? 0.07 : 0.05) * p.v; p.x += sp * Math.sin(t * 0.6 + p.ph) * 0.02 + sp * (season === 'winter' ? 0.004 : 0.012);
      if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); } if (p.x > 1.05) p.x = -0.05;
      const X = p.x * W; const Y = p.y * H; const s = p.s;
      if (season === 'winter') { g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(X, Y, 2.2 * s, 0, TAU); g.fill(); }
      else if (season === 'spring') { g.save(); g.translate(X, Y); g.rotate(t * p.v + p.ph); g.fillStyle = '#ffc2d4'; g.beginPath(); g.ellipse(0, 0, 5 * s, 2.8 * s, 0, 0, TAU); g.fill(); g.restore(); }
      else { g.save(); g.translate(X, Y); g.rotate(t * 0.9 * p.v + p.ph); g.fillStyle = ['#e8503a', '#ff9a4d', '#ffc93c'][Math.floor(p.ph * 3) % 3]; g.beginPath(); g.moveTo(0, -5 * s); g.quadraticCurveTo(5 * s, 0, 0, 5 * s); g.quadraticCurveTo(-5 * s, 0, 0, -5 * s); g.fill(); g.restore(); }
    }
    g.restore();
  }

  /* ---------- screen-space overlays ---------- */
  function pill(text, x, y, o) {
    o = o || {}; const size = o.size || 13;
    g.font = `600 ${size}px ${FONT}`; const w = g.measureText(text).width + 18; const h = size + 11;
    rr(x - w / 2, y - h, w, h, h / 2); g.fillStyle = o.bg || 'rgba(255,253,246,.96)'; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
    g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y - h / 2 + 1);
  }
  function pillRect(text, x, y, size) { g.font = `600 ${size}px ${FONT}`; const w = g.measureText(text).width + 18; const h = size + 11; return [x - w / 2, y - h, w, h]; }
  function wrapText(text, maxW) {
    const lines = []; let line = ''; const cjk = /[　-鿿]/.test(text); const toks = cjk ? [...text] : text.split(' ');
    for (const t of toks) {
      const test = line ? (cjk ? line + t : line + ' ' + t) : t;
      if (g.measureText(test).width > maxW && line) { lines.push(line); line = t; } else line = test;
    }
    if (line) lines.push(line);
    return lines.slice(0, 3);
  }
  function drawBubble(p) {
    if (p.sayT <= 0 || !p.say || p.sx === undefined || !onScreen(p.sx, p.sy, 80)) return;
    const k = p.sk; const size = clamp(12 * Math.max(cam.z, 0.7), 11, 15);
    g.font = `500 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = wrapText(p.say, 150); const w = Math.max(...lines.map((l) => g.measureText(l).width)) + 16; const lh = size + 3; const h = lines.length * lh + 10;
    const x = clamp(p.sx, w / 2 + 4, W - w / 2 - 4); const yb = p.sy - 40 * k - 4; const a = Math.min(1, p.sayT * 1.5);
    g.save(); g.globalAlpha = a;
    rr(x - w / 2, yb - h, w, h, 10); g.fillStyle = p.owner ? '#fff3c4' : '#ffffff'; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.moveTo(p.sx - 5, yb - 1); g.lineTo(p.sx, yb + 6); g.lineTo(p.sx + 5, yb - 1); g.fillStyle = p.owner ? '#fff3c4' : '#ffffff'; g.fill();
    g.beginPath(); g.moveTo(p.sx - 5, yb); g.lineTo(p.sx, yb + 6); g.lineTo(p.sx + 5, yb); g.stroke();
    g.fillStyle = INK; lines.forEach((l, i) => g.fillText(l, x, yb - h + 5 + lh * (i + 0.5)));
    g.restore();
  }
  const LABEL_AT = (() => {
    const at = {};
    ORDER.forEach((k) => {
      const mem = buildings.filter((b) => b.dist === k); if (!mem.length) return;
      const anc = { isl: 'innerharbour', sky: 'gondola', val: 'langley' }[k]; const ab = anc && bById.get(anc);
      if (ab) { at[k] = [ab.x, ab.y - 130]; return; }
      at[k] = [mem.reduce((a, b) => a + b.x, 0) / mem.length, Math.min(...mem.map((b) => b.y)) - 100];
    });
    return at;
  })();
  function drawLabels() {
    const taken = [];
    const free = (r) => !taken.some((t) => r[0] < t[0] + t[2] && r[0] + r[2] > t[0] && r[1] < t[1] + t[3] && r[1] + r[3] > t[1]);
    if (labelsOn && cam.z < 1.5) {
      ORDER.forEach((key) => {
        const d = DIST[key]; const at = LABEL_AT[key]; if (!at) return; const X = sx(at[0]); const Y = sy(at[1]);
        if (!onScreen(X, Y, 140)) return;
        const size = clamp(15 * Math.sqrt(cam.z), 12, 18); const text = `${tx('districts')[key]} · ${d.count}`;
        pill(text, X, Y, { size, bg: mix(d.c, '#ffffff', 0.72) }); taken.push(pillRect(text, X, Y, size));
      });
    }
    if (labelsOn && window.TELE && cam.z > 0.2 && cam.z < 1.6) {
      const X = sx(PORTAL.x); const Y = sy(PORTAL.y, 92 + 14 / cam.z); const text = '🌀 ' + window.TELE.portalLabel();
      if (onScreen(X, Y, 80)) { const r = pillRect(text, X, Y, 12); if (free(r)) { pill(text, X, Y, { size: 12, bg: '#e9e3ff' }); taken.push(r); } }
    }
    // mountain names
    if (labelsOn && cam.z > 0.1 && cam.z < 1.1) {
      BIGM.forEach((m) => {
        const X = sx(m.x); const Y = sy(m.y, m.h * 0.55); if (!onScreen(X, Y, 100)) return;
        const text = '⛰️ ' + (tx('mountains')[m.name] || m.name); const r = pillRect(text, X, Y, 11);
        if (free(r)) { pill(text, X, Y, { size: 11, bg: '#eaf3fb' }); taken.push(r); }
      });
    }
    // trains
    TRAINS.forEach((t) => {
      if (!t.hit || !labelsOn || cam.z < 0.1) return; const x = t.hit.x + t.hit.w / 2; const y = t.hit.y - 6; if (!onScreen(x, y, 120)) return;
      const info = tx('trains')[t.id]; const text = '🚂 ' + info.short; const r = pillRect(text, x, y, 12);
      pill(text, x, y, { size: 12, bg: '#fff0b3' }); taken.push(r);
    });
    const list = [...buildings].sort((a, b) => (selId === b.id) - (selId === a.id) || (hoverB === b) - (hoverB === a) || (b.p.type === 'sight') - (a.p.type === 'sight') || a.y - b.y);
    for (const b of list) {
      const forced = hoverB === b || selId === b.id;
      const show = forced || (labelsOn && (b.p.type === 'sight' ? cam.z >= 0.5 : cam.z >= 1.0));
      if (!show || !b.hit) continue;
      const x = b.hit.x + b.hit.w / 2; const y = b.hit.y - (b.p.type === 'sight' ? 14 * cam.z : 0); const r = pillRect(nameOf(b.p), x, y, 13);
      if (!forced && !free(r)) continue;
      pill(nameOf(b.p), x, y, { size: 13, bg: selId === b.id ? '#ffe680' : undefined }); taken.push(r);
    }
    if (emperor.sx !== undefined && labelsOn && cam.z >= 0.4) pill('🍁 ' + tx('emperorName'), emperor.sx, emperor.sy - 56 * emperor.sk, { size: 12, bg: '#ffe0d8' });
    const fp = followP;
    if (fp && fp.sx !== undefined) {
      const tt = (performance.now() / 300) % TAU; g.save(); g.fillStyle = '#e8503a'; g.strokeStyle = INK; g.lineWidth = 2; const y = fp.sy - 50 * fp.sk + Math.sin(tt) * 3;
      g.beginPath(); g.moveTo(fp.sx - 7, y - 10); g.lineTo(fp.sx + 7, y - 10); g.lineTo(fp.sx, y); g.closePath(); g.fill(); g.stroke(); g.restore();
    }
  }
  function drawPlanRoute() {
    if (planRoute.length < 1) return;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    if (planPath.length > 1) {
      g.beginPath(); planPath.forEach((p, i) => (i ? g.lineTo(sx(p[0]), sy(p[1])) : g.moveTo(sx(p[0]), sy(p[1]))));
      g.strokeStyle = INK; g.lineWidth = 7; g.setLineDash([]); g.globalAlpha = 0.9; g.stroke();
      g.strokeStyle = '#ffc93c'; g.lineWidth = 4; g.setLineDash([10, 8]); g.lineDashOffset = -time * 20; g.stroke();
    }
    g.setLineDash([]); g.globalAlpha = 1;
    planRoute.forEach((id, i) => {
      const b = bById.get(id); const X = sx(b.x); const Y = sy(b.y + 16);
      g.beginPath(); g.arc(X, Y, 13, 0, TAU); g.fillStyle = '#e8503a'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
      g.fillStyle = '#fff'; g.font = `700 14px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), X, Y + 1);
    });
    g.restore();
  }

  /* ---------- render ---------- */
  statics.sort((a, b) => a.y - b.y);
  const MAXM = statics.reduce((m, s) => Math.max(m, s.m), 0);
  function lowerBound(y) { let lo = 0; let hi = statics.length; while (lo < hi) { const m = (lo + hi) >> 1; if (statics[m].y < y) lo = m + 1; else hi = m; } return lo; }

  function render() {
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    litList.length = 0;
    drawGround();
    const z = cam.z;

    const dyn = [];
    const pad = 90;
    const inView = (x, y) => { const X = sx(x); const Y = sy(y); return X > -pad && X < W + pad && Y > -pad && Y < H + pad; };
    people.forEach((p) => { if (inView(p.x, p.y)) dyn.push({ y: p.y + 1, f: () => drawPerson(p) }); else p.sx = undefined; });
    const vis = sea.warm;
    if (vis > 0.04) {
      PADDLERS.forEach((q) => { const x = q.cx + Math.cos(q.a) * q.rx; const y = q.cy + Math.sin(q.a) * q.ry; if (inView(x, y)) dyn.push({ y, f: () => drawPaddler(q, vis) }); });
      SAILS.forEach((s) => { if (inView(s.x, s.y)) dyn.push({ y: s.y, f: () => drawSailboat(s, vis) }); });
    }
    cargo.forEach((c) => { if (inView(c.x, c.y)) dyn.push({ y: c.y, f: () => drawCargo(c) }); });
    WHALES.forEach((w) => { if (inView(w.x, w.y)) dyn.push({ y: w.y, f: () => drawWhale(w) }); });
    SHIPS.forEach((s) => { const [x, y] = posAt(s.L, s.s); if (inView(x, y)) dyn.push({ y, f: () => drawFerry(s) }); });
    cars.forEach((c) => { const [x, y] = posAt(c.L, c.s); if (inView(x, y)) dyn.push({ y, f: () => drawCar(c) }); });
    TRAINS.forEach((t) => {
      const mg = 330 * z + 60; const X = sx(t.x); const Y = sy(t.y);
      if (X > -mg && X < W + mg && Y > -mg && Y < H + mg) dyn.push({ y: t.y, f: () => drawTrain(t) }); else t.hit = null;
    });
    dyn.sort((a, b) => a.y - b.y);
    let di = 0;
    const y0 = cam.y - H / 2 / (z * cam.tilt) - 20; const y1 = cam.y + (H / 2 + MAXM * z + 60) / (z * cam.tilt);
    for (let si = lowerBound(y0); si < statics.length; si++) {
      const s = statics[si]; if (s.y > y1) break;
      while (di < dyn.length && dyn[di].y <= s.y) dyn[di++].f();
      if (s.lod && z < s.lod) continue;
      const X = sx(s.x); const Y = sy(s.y); const wide = (s.wide || s.m) * z * 0.6 + 40;
      if (X < -wide || X > W + wide || Y < 0 || Y - s.m * z > H) { if (s.b) s.b.hit = null; continue; }
      s.f(X, Y, z); window.__drawn = (window.__drawn || 0) + 1;
    }
    while (di < dyn.length) dyn[di++].f();
    buildings.forEach((b) => { if (b.hit && (b.hit.x > W + 200 || b.hit.y > H + 200 || b.hit.x + b.hit.w < -200 || b.hit.y + b.hit.h < -200)) b.hit = null; });

    CABLES.forEach(drawCable);
    drawPlane();
    fx.forEach((f) => { const X = sx(f.x); const Y = sy(f.y, f.z); g.globalAlpha = clamp(f.life, 0, 1); emoji(f.ch, X, Y, 14 * Math.max(cam.z, 0.7)); g.globalAlpha = 1; });
    drawClouds();

    // season tint and time of day
    g.globalCompositeOperation = 'multiply';
    const m = env.m.map((v, i) => (v * sea.tint[i]) / 255);
    g.fillStyle = `rgb(${m.map(Math.round).join(',')})`; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    if (env.n > 0.05) {
      for (const L of litList) {
        const grd = g.createRadialGradient(L[0], L[1], 0, L[0], L[1], L[2]);
        grd.addColorStop(0, `rgba(${L[3]},${0.55 * env.n})`); grd.addColorStop(1, `rgba(${L[3]},0)`);
        g.fillStyle = grd; g.fillRect(L[0] - L[2], L[1] - L[2], L[2] * 2, L[2] * 2);
      }
    }
    g.globalCompositeOperation = 'source-over';

    drawSeasonParticles();
    drawPlanRoute();
    drawLabels();
    people.forEach(drawBubble);
  }

  let last = performance.now(); let uiClock = 0; let chatT = 0;
  function frame(now) {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; lastDt = dt;
    if (!paused) { time += dt; updatePeople(dt, time); moveShips(dt); moveTrains(dt); chatT += dt; if (chatT > 0.7) { chatT = 0; chatter(time); } }
    updateEnv(dt);
    if (followP) { cam.tx = followP.x; cam.ty = followP.y - 8; }
    const e = reduceMotion ? 1 : 1 - Math.exp(-dt * 6);
    cam.x += (cam.tx - cam.x) * e; cam.y += (cam.ty - cam.y) * e; cam.z += (cam.tz - cam.z) * e; cam.tilt += (cam.ttilt - cam.tilt) * e;
    uiClock += dt; if (uiClock > 0.5) { uiClock = 0; refreshFollow(); }
    const _t0 = performance.now(); render();
    if (QS.has('perf') && (window.__pf = (window.__pf || 0) + 1) < 8) console.log('frame ms', Math.round(performance.now() - _t0), 'z', cam.z.toFixed(2), 'drawn', window.__drawn, 'statics', statics.length); window.__drawn = 0;
    requestAnimationFrame(frame);
  }

  /* ================= input ================= */
  const ptrs = new Map(); let moved = 0; let pinch = 0;
  function pinchDist() { const a = [...ptrs.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) moved = 0; if (ptrs.size === 2) pinch = pinchDist();
  });
  cv.addEventListener('pointermove', (e) => {
    const prev = ptrs.get(e.pointerId);
    if (!prev) { if (e.pointerType === 'mouse') hover(e.clientX, e.clientY); return; }
    const dx = e.clientX - prev.x; const dy = e.clientY - prev.y; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) {
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 6) {
        cv.classList.add('drag'); if (followP) stopFollow();
        cam.x -= dx / cam.z; cam.y -= dy / (cam.z * cam.tilt); cam.tx = cam.x; cam.ty = cam.y;
      }
    } else if (ptrs.size === 2) {
      const d = pinchDist(); const a = [...ptrs.values()];
      if (pinch) zoomAt((a[0].x + a[1].x) / 2, (a[0].y + a[1].y) / 2, d / pinch);
      pinch = d; moved = 99;
    }
  });
  function endPtr(e) {
    const had = ptrs.has(e.pointerId); ptrs.delete(e.pointerId); cv.classList.remove('drag'); pinch = 0;
    if (had && e.type === 'pointerup' && moved < 7 && ptrs.size === 0) clickAt(e.clientX, e.clientY);
  }
  cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
  cv.addEventListener('wheel', (e) => { e.preventDefault(); if (followP) stopFollow(); zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0016)); }, { passive: false });
  cv.addEventListener('dblclick', (e) => zoomAt(e.clientX, e.clientY, 1.6));

  function hitBuilding(x, y) {
    let best = null;
    for (const b of buildings) { const h = b.hit; if (h && x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h && (!best || b.y > best.y)) best = b; }
    return best;
  }
  function hitTrain(x, y) { return TRAINS.find((t) => t.hit && x >= t.hit.x && x <= t.hit.x + t.hit.w && y >= t.hit.y && y <= t.hit.y + t.hit.h) || null; }
  function hitPerson(x, y) {
    let best = null; let bd = 1e9;
    for (const p of people) {
      if (p.sx === undefined) continue; const d = Math.hypot(x - p.sx, y - (p.sy - 14 * p.sk));
      if (d < 16 * p.sk + 6 && d < bd) { best = p; bd = d; }
    }
    return best;
  }
  const hitPortal = (x, y) => !!window.TELE && window.TELE.hit(x, y, sx(PORTAL.x), sy(PORTAL.y), cam.z);
  function hover(x, y) {
    if (hitPortal(x, y)) { hoverB = null; cv.style.cursor = 'pointer'; return; }
    const p = hitPerson(x, y); const t = p ? null : hitTrain(x, y); const b = p || t ? null : hitBuilding(x, y);
    hoverB = b; cv.style.cursor = p || b || t ? 'pointer' : '';
  }
  function clickAt(x, y) {
    if (hitPortal(x, y)) { window.TELE.open(); return; }
    const p = hitPerson(x, y);
    if (p) { startFollow(p); return; }
    const t = hitTrain(x, y);
    if (t) { selectTrain(t); return; }
    const b = hitBuilding(x, y);
    if (b) { selectBuilding(b); return; }
    closeCard();
  }

  /* ================= selection / card ================= */
  const favs = new Set((() => { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch (e) { return []; } })());
  const saveFavs = () => { try { localStorage.setItem(FAV_KEY, JSON.stringify([...favs])); } catch (e) { /* ignore */ } };
  const planSel = new Set();
  const card = $('card');

  function selectBuilding(b, opts) {
    selId = b.id; selTrain = null; if (!(opts && opts.noFly)) { flyTo(b.x, b.y - 24, 1.3); }
    if (isMobile()) { closePanel('drawer'); closePanel('plan'); }
    renderCard(); highlightList();
  }
  function selectTrain(t) {
    selTrain = t.id; selId = null; flyTo(t.x, t.y - 10, 0.9);
    if (isMobile()) { closePanel('drawer'); closePanel('plan'); }
    renderCard(); highlightList();
  }
  function closeCard() { selId = null; selTrain = null; card.classList.remove('show'); highlightList(); }
  function renderTrainCard(t) {
    const info = tx('trains')[t.id];
    card.innerHTML =
      `<button class="x" type="button" aria-label="${esc(tx('close'))}">×</button>` +
      `<div class="sign" style="background:#1d3a6e">🚂</div>` +
      `<div class="body"><h2 lang="${lang}">${esc(info.name)}</h2><div class="sub">${esc(info.route)}</div>` +
      `<div class="tags"><span class="tag" style="background:#ffe9a8">${esc(tx('trainTag'))}</span></div>` +
      `<p>${esc(info.blurb)}</p><div class="tip">💡 ${esc(info.tip)}</div>` +
      `<div class="acts"><button class="btn" data-act="ride" type="button">${esc(tx('rideTrain'))}</button></div></div>`;
    card.classList.add('show');
    card.querySelector('.x').onclick = closeCard;
    card.querySelector('[data-act=ride]').onclick = () => startFollow(t);
  }
  function renderCard() {
    if (selTrain) { const t = TRAINS.find((q) => q.id === selTrain); if (t) { renderTrainCard(t); return; } }
    const b = selId && bById.get(selId); if (!b) { card.classList.remove('show'); return; }
    const p = b.p; const d = DIST[b.dist]; const fav = favs.has(p.id); const inRoute = planSel.has(p.id);
    card.innerHTML =
      `<button class="x" type="button" aria-label="${esc(tx('close'))}">×</button>` +
      `<div class="sign" style="background:${d.c}">${p.emoji}</div>` +
      `<div class="body"><h2 lang="${lang}">${esc(nameOf(p))}</h2><div class="sub" lang="${lang === 'zh' ? 'en' : 'zh'}">${esc(subOf(p))}</div>` +
      `<div class="tags"><span class="tag" style="background:${mix(d.c, '#ffffff', 0.55)}">${esc(tx('districts')[b.dist])}</span><span class="tag">${esc(typeLabel(p))}${p.far ? esc(tx('dayTrip')) : ''}</span></div>` +
      `<p>${esc(placeText(p, 'blurb'))}</p><div class="tip">💡 ${esc(placeText(p, 'tip'))}</div>` +
      `<div class="acts"><button class="btn" data-act="fav" type="button">${esc(tx(fav ? 'saved' : 'save'))}</button>` +
      `<button class="btn" data-act="route" type="button">${esc(tx(inRoute ? 'inRoute' : 'addRoute'))}</button>` +
      `<a class="btn" href="https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=17/${p.lat}/${p.lng}" target="_blank" rel="noopener">${esc(tx('osm'))}</a></div></div>`;
    card.classList.add('show');
    card.querySelector('.x').onclick = closeCard;
    card.querySelector('[data-act=fav]').onclick = () => { if (favs.has(p.id)) favs.delete(p.id); else favs.add(p.id); saveFavs(); renderCard(); buildList(); };
    card.querySelector('[data-act=route]').onclick = () => { if (planSel.has(p.id)) planSel.delete(p.id); else planSel.add(p.id); renderCard(); buildPlanList(); };
  }

  /* ================= follow (people and trains) ================= */
  const followEl = $('follow');
  function startFollow(p) {
    followP = p; const isTrain = !!p.L; cam.tz = Math.max(cam.tz, isTrain ? 0.8 : 1.3);
    const own = !isTrain && !!p.owner;
    $('bFollow').classList.toggle('on', !own); $('bFollow').setAttribute('aria-pressed', String(!own));
    $('bEmperor').classList.toggle('on', own); $('bEmperor').setAttribute('aria-pressed', String(own));
    refreshFollow();
  }
  function stopFollow() {
    followP = null;
    ['bFollow', 'bEmperor'].forEach((id) => { $(id).classList.remove('on'); $(id).setAttribute('aria-pressed', 'false'); });
    refreshFollow();
  }
  function nextFollow() { const others = people.filter((p) => !p.owner && p !== followP); startFollow(pick(others)); }
  function refreshFollow() {
    if (!followP) { followEl.classList.remove('show'); return; }
    if (followP.L) {
      const info = tx('trains')[followP.id];
      followEl.innerHTML = `<span>🚂 ${esc(tx('followingPre'))} <b>${esc(info.short)}</b> · ${esc(tx(followP.state === 'wait' ? 'trainWait' : 'trainRun'))}</span><button type="button" data-f="stop">${esc(tx('followingStop'))}</button>`;
    } else {
      const to = targetName(followP);
      followEl.innerHTML = `<span>🧍 ${esc(tx('followingPre'))} <b>${esc(personName(followP))}</b>${to ? ` · ${esc(tx('followingTo'))} ${esc(to)}` : ''}</span>` +
        (followP.owner ? '' : `<button type="button" data-f="next">${esc(tx('followingNext'))}</button>`) + `<button type="button" data-f="stop">${esc(tx('followingStop'))}</button>`;
    }
    followEl.classList.add('show');
    const n = followEl.querySelector('[data-f=next]'); if (n) n.onclick = nextFollow;
    followEl.querySelector('[data-f=stop]').onclick = stopFollow;
  }

  /* ================= panels ================= */
  const PANELS = { drawer: ['drawer', 'bList'], plan: ['plan', 'bPlan'], log: ['log', 'bLog'] };
  function setBtn(id, on) { const b = $(id); b.setAttribute('aria-pressed', String(on)); if (id === 'bList') b.setAttribute('aria-expanded', String(on)); if (id !== 'bList') b.classList.toggle('on', on); }
  function openPanel(name) {
    const [el, btn] = PANELS[name];
    if (isMobile()) Object.keys(PANELS).forEach((n) => { if (n !== name) closePanel(n); });
    if (isMobile() && (name === 'drawer' || name === 'plan')) closeCard();
    $(el).classList.add('show'); setBtn(btn, true);
  }
  function closePanel(name) { const [el, btn] = PANELS[name]; $(el).classList.remove('show'); setBtn(btn, false); }
  const isOpen = (name) => $(PANELS[name][0]).classList.contains('show');
  const togglePanel = (name) => (isOpen(name) ? closePanel(name) : openPanel(name));

  /* ---------- list drawer ---------- */
  let catFilter = 'all'; let query = '';
  function buildChips() {
    const wrap = $('cats'); wrap.replaceChildren();
    const mk = (key, label, color) => {
      const c = document.createElement('button'); c.type = 'button'; c.className = 'chip' + (catFilter === key ? ' on' : ''); c.setAttribute('aria-pressed', String(catFilter === key));
      c.innerHTML = (color ? `<i style="background:${color}"></i>` : '') + esc(label);
      c.onclick = () => { catFilter = key; buildChips(); buildList(); }; wrap.appendChild(c);
    };
    mk('all', tx('chipAll')); mk('fav', tx('chipFav'));
    ORDER.forEach((k) => mk(k, tx('districts')[k], DIST[k].c));
  }
  function buildList() {
    const q = query.trim().toLowerCase(); const out = $('list'); out.replaceChildren(); let any = false;
    ORDER.forEach((k) => {
      if (catFilter !== 'all' && catFilter !== 'fav' && catFilter !== k) return;
      const rows = buildings.filter((b) => b.dist === k && (catFilter !== 'fav' || favs.has(b.id)) &&
        (!q || [b.p.name, b.p.zh, placeText(b.p, 'blurb'), placeText(b.p, 'tip')].join(' ').toLowerCase().includes(q)));
      if (!rows.length) return; any = true;
      const h = document.createElement('h4'); h.textContent = tx('districts')[k]; out.appendChild(h);
      rows.forEach((b) => {
        const it = document.createElement('button'); it.type = 'button'; it.className = 'it' + (selId === b.id ? ' sel' : ''); it.dataset.id = b.id;
        it.innerHTML = `<span class="em" style="background:${mix(DIST[k].c, '#ffffff', 0.6)}">${b.p.emoji}</span><span class="tx"><span lang="${lang}">${esc(nameOf(b.p))}</span><small lang="${lang === 'zh' ? 'en' : 'zh'}">${esc(subOf(b.p))}</small></span>${favs.has(b.id) ? '<span class="star">⭐</span>' : ''}`;
        it.onclick = () => selectBuilding(b); out.appendChild(it);
      });
    });
    if (!any) { const e = document.createElement('div'); e.className = 'empty'; e.textContent = tx('noMatches'); out.appendChild(e); }
  }
  function highlightList() { document.querySelectorAll('#list .it').forEach((el) => el.classList.toggle('sel', el.dataset.id === selId)); }
  $('q').addEventListener('input', (e) => { query = e.target.value; buildList(); });

  /* ---------- route planner ---------- */
  const DUR = { whistler: 300, gondola: 150, peak2peak: 180, butchart: 120, capilano: 90, grouse: 150, stanley: 120, aquarium: 100, empress: 60, parliament: 60, rbcm: 90, craigdarroch: 70, garibaldi: 360, chief: 240, nanaimo: 90, harrison: 120, hope: 90, othello: 60, langley: 60, moa: 90, scienceworld: 90, cypress: 120, seymour: 120, britannia: 120, shannon: 30, brandywine: 30, rmstation: 45 };
  const MODES = { walk: [4.5, 0], bike: [12, 3], transit: [22, 10], car: [48, 8] };
  const PACES = { fast: 0.7, normal: 1, slow: 1.4 };
  const STARTS = { station: { lat: 49.2737, lng: -123.0970 }, waterfront: { lat: 49.2858, lng: -123.1128 } };
  const FERRY_MIN = 110;
  const hav = (a, b) => {
    const R = 6371; const r = Math.PI / 180; const dLat = (b.lat - a.lat) * r; const dLng = (b.lng - a.lng) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h));
  };
  const fmt = (m) => { m = Math.round(m); const h = Math.floor(m / 60) % 24; return String(h).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };

  function fillSelect(el, entries, cur) { el.replaceChildren(...entries.map(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; return o; })); if (cur) el.value = cur; }
  function buildPlanSelects() {
    const keep = (id) => $(id).value;
    const f = keep('pFrom'); const m = keep('pMode'); const pc = keep('pPace');
    fillSelect($('pFrom'), [['station', tx('fromStation')], ['waterfront', tx('fromWaterfront')], ['first', tx('fromFirst')]], f || 'station');
    fillSelect($('pMode'), Object.entries(tx('modes')), m || 'car');
    fillSelect($('pPace'), Object.entries(tx('paces')), pc || 'normal');
    $('pNote').textContent = tx('planNote');
  }
  function buildPlanList() {
    const out = $('pList'); out.replaceChildren();
    ORDER.forEach((k) => {
      const rows = buildings.filter((b) => b.dist === k); if (!rows.length) return;
      const h = document.createElement('h4'); h.innerHTML = `<i style="background:${DIST[k].c}"></i>${esc(tx('districts')[k])}`; out.appendChild(h);
      rows.forEach((b) => {
        const l = document.createElement('label'); l.className = 'pi';
        l.innerHTML = `<input type="checkbox" ${planSel.has(b.id) ? 'checked' : ''}><span>${b.p.emoji}</span><span>${esc(nameOf(b.p))}</span>`;
        l.querySelector('input').onchange = (e) => { if (e.target.checked) planSel.add(b.id); else planSel.delete(b.id); updatePlanCount(); if (selId === b.id) renderCard(); };
        out.appendChild(l);
      });
    });
    updatePlanCount();
  }
  function updatePlanCount() { $('pCount').textContent = fill(tx('selected'), { n: planSel.size }); }

  function orderStops(ids, startKey) {
    const ps = ids.map((id) => bById.get(id).p);
    const nn = (list, from) => {
      const left = [...list]; const out = []; let cur = from || (left.length ? left.shift() : null); if (cur && !from) out.push(cur);
      while (left.length) { let bi = 0; let bd = 1e9; left.forEach((p, i) => { const d = hav(cur, p); if (d < bd) { bd = d; bi = i; } }); cur = left.splice(bi, 1)[0]; out.push(cur); }
      return out;
    };
    const start = STARTS[startKey] || null;
    const main = ps.filter((p) => p.d !== 'isl'); const isl = ps.filter((p) => p.d === 'isl');
    const mainOrder = nn(main, start);
    const last = mainOrder.length ? mainOrder[mainOrder.length - 1] : start;
    return [...mainOrder, ...nn(isl, last || null)];
  }
  function planRouteNow() {
    const out = $('pOut');
    if (planSel.size < 2) { out.innerHTML = `<div class="muted">${esc(tx('needTwo'))}</div>`; planRoute = []; planPath = []; return; }
    const from = $('pFrom').value; const mode = $('pMode').value; const pace = PACES[$('pPace').value] || 1;
    const [h, m] = ($('pTime').value || '09:30').split(':').map(Number); let t = h * 60 + m;
    const stops = orderStops([...planSel], from); planRoute = stops.map((p) => p.id);
    let prev = STARTS[from] || null; let prevP = null; let totalKm = 0; let html = '<ul class="tl">'; let anyLate = false; let ferries = 0;
    stops.forEach((p, i) => {
      if (prev) {
        const km = hav(prev, p) * 1.3; let md = mode; if ((md === 'walk' || md === 'bike') && km > 6) md = 'car';
        const [sp, oh] = MODES[md]; let mins = (km / sp) * 60 + oh; totalKm += km;
        const cross = prevP && (prevP.d === 'isl') !== (p.d === 'isl');
        if (cross) { mins += FERRY_MIN; ferries++; }
        t += mins;
        html += `<li class="leg">${cross ? '⛴️ ' : ''}${tx('leg' + md[0].toUpperCase() + md.slice(1))} ${Math.max(1, Math.round(mins))} min · ${km.toFixed(1)} km${cross ? ' · ' + esc(tx('legFerry')) : ''}</li>`;
      }
      const stay = Math.round((p.type === 'food' ? 40 : (DUR[p.id] || 60)) * pace); const late = t > 20.5 * 60 && p.type === 'sight'; anyLate = anyLate || late;
      html += `<li class="stop"><span class="no">${i + 1}</span><div><div class="tm">${fmt(t)}–${fmt(t + stay)} <small>${esc(tx('stay'))} ${stay} min</small></div>` +
        `<div class="nm${late ? ' late' : ''}">${p.emoji} ${esc(nameOf(p))}</div></div></li>`;
      t += stay; prev = p; prevP = p;
    });
    html += '</ul>';
    const hasFar = stops.some((p) => p.far && p.d !== 'isl');
    out.innerHTML = `<div class="sum">${esc(fill(tx('summary'), { n: stops.length, km: totalKm.toFixed(1), t: fmt(t) }))}</div>` +
      (hasFar ? `<div class="warn">${esc(tx('tripBlock'))}</div>` : '') + (ferries ? `<div class="warn">${esc(tx('ferryWarn'))}</div>` : '') + (anyLate ? `<div class="warn">${esc(tx('late'))}</div>` : '') + html;
    const xs = stops.map((p) => bById.get(p.id)); const minX = Math.min(...xs.map((b) => b.x)); const maxX = Math.max(...xs.map((b) => b.x)); const minY = Math.min(...xs.map((b) => b.y)); const maxY = Math.max(...xs.map((b) => b.y));
    stopFollow();
    planPath = [];
    for (let i = 1; i < xs.length; i++) { const a = doorOf(xs[i - 1]); const c = doorOf(xs[i]); findPath(a[0], a[1], c[0], c[1]).forEach((p, k) => { if (planPath.length && !k) return; planPath.push(p); }); }
    cam.tx = (minX + maxX) / 2; cam.ty = (minY + maxY) / 2 - 10;
    const availW = isMobile() ? W : W - 460; cam.tz = clamp(Math.min(availW / (maxX - minX + 340), (H * (isMobile() ? 0.4 : 0.75)) / ((maxY - minY + 220) * cam.ttilt)), 0.08, 1.3);
    if (!isMobile()) cam.tx -= (W - availW) / 2 / cam.tz;
  }
  $('pGo').onclick = planRouteNow;
  $('pClear').onclick = () => { planSel.clear(); planRoute = []; planPath = []; $('pOut').innerHTML = ''; buildPlanList(); if (selId) renderCard(); };
  $('pFav').onclick = () => { favs.forEach((id) => planSel.add(id)); buildPlanList(); if (selId) renderCard(); };
  $('pclose').onclick = () => closePanel('plan');

  /* ================= toolbar wiring ================= */
  const todEl = $('tod');
  const TOD_ICONS = ['🌅', '☀️', '🌇', '🌙', '🔄'];
  function buildTod() {
    todEl.replaceChildren();
    TOD_ICONS.forEach((ic, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tb'; b.dataset.t = i; b.title = tx('tod')[i]; b.setAttribute('aria-label', tx('tod')[i]);
      b.innerHTML = `<span class="i">${ic}</span>`;
      b.onclick = () => { if (i === 4) { autoTod = !autoTod; autoClock = 0; } else { autoTod = false; todIdx = i; } syncTodButtons(); };
      todEl.appendChild(b);
    });
    syncTodButtons();
  }
  function syncTodButtons() {
    [...todEl.children].forEach((b, i) => { const on = i === 4 ? autoTod : !autoTod && i === todIdx; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  }
  const seasonEl = $('season');
  function buildSeason() {
    seasonEl.replaceChildren();
    [...SEASONS, 'auto'].forEach((s) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tb'; b.dataset.s = s;
      b.innerHTML = `<span class="i">${SEASON_ICON[s]}</span><span class="sn">${esc(tx('seasons')[s])}</span>`;
      b.setAttribute('aria-label', tx('seasons')[s]);
      b.onclick = () => setSeason(s);
      seasonEl.appendChild(b);
    });
    syncSeasonButtons();
  }
  function syncSeasonButtons() {
    [...seasonEl.children].forEach((b) => { const s = b.dataset.s; const on = s === 'auto' ? autoSeason : (!autoSeason && s === season) || (autoSeason && s === season); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  }
  function setSeason(s) {
    if (s === 'auto') { autoSeason = !autoSeason; autoSeasonClock = 0; } else { autoSeason = false; season = s; }
    try { localStorage.setItem(SEASON_KEY, autoSeason ? 'auto' : season); } catch (e) { /* ignore */ }
    syncSeasonButtons();
  }
  const JUMPS = () => ({
    van: [metroC[0], metroC[1], 0.9], squamish: (() => { const b = bById.get('gondola'); return [b.x + 40, b.y - 30, 0.8]; })(),
    whistler: (() => { const b = bById.get('whistler'); return [b.x + 20, b.y - 60, 0.7]; })(), victoria: [VICT[0] + 40, VICT[1], 0.9],
    hope: (() => { const b = bById.get('hope'); return [b.x, b.y - 20, 0.8]; })(),
  });
  function jumpTo(key) {
    const j = JUMPS()[key]; if (!j) return; stopFollow(); closeCard();
    cam.tx = j[0]; cam.ty = j[1]; cam.tz = j[2];
    $('jump').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.j === key));
  }
  function buildJump() {
    const el = $('jump'); el.replaceChildren();
    ['van', 'squamish', 'whistler', 'victoria', 'hope'].forEach((k) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'jb'; b.dataset.j = k; b.textContent = tx('jump')[k]; b.onclick = () => jumpTo(k); el.appendChild(b);
    });
  }
  $('bLabel').onclick = () => { labelsOn = !labelsOn; setBtn('bLabel', labelsOn); };
  $('bEmperor').onclick = () => { if (followP === emperor) stopFollow(); else startFollow(emperor); };
  $('bFollow').onclick = () => { if (followP && !followP.owner && !followP.L) stopFollow(); else nextFollow(); };
  $('bPause').onclick = () => { paused = !paused; setBtn('bPause', paused); syncPause(); };
  function syncPause() { $('pauseIcon').textContent = paused ? '▶️' : '⏸'; $('pauseTx').textContent = tx('tools')[paused ? 'play' : 'pause']; }
  $('bBird').onclick = () => { bird = !bird; setBtn('bBird', bird); cam.ttilt = bird ? 0.95 : 0.58; stopFollow(); fitAll(); };
  $('bPlan').onclick = () => togglePanel('plan');
  $('bLog').onclick = () => togglePanel('log');
  $('bList').onclick = () => togglePanel('drawer');
  $('bAll').onclick = () => { stopFollow(); closeCard(); if (Math.abs(cam.tz - rectZoom(WB.x0, WB.y0, WB.x1, WB.y1)) < 0.03) fitCity(); else fitAll(); };
  $('bHelp').onclick = () => openIntro(0);
  document.querySelectorAll('.lang button').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
  addEventListener('resize', () => { resize(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { if ($('intro').classList.contains('show')) closeIntro(); else { closeCard(); Object.keys(PANELS).forEach(closePanel); } } });

  /* ================= intro tour ================= */
  let introStep = 0;
  function openIntro(i) { introStep = i; renderIntro(); $('intro').classList.add('show'); $('inext').focus(); }
  function closeIntro() { $('intro').classList.remove('show'); try { localStorage.setItem(INTRO_KEY, '1'); } catch (e) { /* ignore */ } }
  function renderIntro() {
    const steps = tx('intro'); const s = steps[introStep];
    $('ist').textContent = s[0]; $('iti').textContent = s[1]; $('itx').textContent = s[2];
    $('idt').replaceChildren(...steps.map((_, i) => { const d = document.createElement('i'); if (i === introStep) d.className = 'on'; return d; }));
    $('iskip').textContent = tx('introSkip'); $('inext').textContent = introStep === steps.length - 1 ? tx('introDone') : tx('introNext');
  }
  $('inext').onclick = () => { if (introStep >= tx('intro').length - 1) closeIntro(); else { introStep++; renderIntro(); } };
  $('iskip').onclick = closeIntro;

  /* ================= static text ================= */
  function applyStatic() {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = tx('docTitle');
    const meta = document.querySelector('meta[name="description"]'); if (meta) meta.setAttribute('content', tx('docDesc'));
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = tx(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', tx(el.dataset.i18nAria)); });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.setAttribute('placeholder', tx(el.dataset.i18nPh)); });
    document.querySelectorAll('[data-tool]').forEach((el) => { el.textContent = tx('tools')[el.dataset.tool]; });
    document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    $('bHelp').setAttribute('aria-label', tx('help'));
    if (!$('decreeTx').textContent || $('decreeTx').dataset.first) { $('decreeTx').textContent = tx('decreeFirst'); $('decreeTx').dataset.first = '1'; }
    syncPause();
    if (window.TELE) window.TELE.refresh();
  }
  function setLang(next) {
    if (!LANGS.includes(next) || next === lang) return;
    lang = next; try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ }
    people.forEach((p) => { p.sayT = 0; p.replyAt = 0; });
    applyStatic(); buildTod(); buildSeason(); buildJump(); buildChips(); buildList(); buildPlanSelects(); buildPlanList(); renderCard(); refreshFollow();
    $('decreeTx').textContent = tx('decreeFirst'); $('decreeTx').dataset.first = '1';
    if ($('intro').classList.contains('show')) renderIntro();
    if (planRoute.length) planRouteNow();
  }

  /* ================= start ================= */
  resize(); fitStart(); cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz * 0.8;
  if (reduceMotion) { paused = true; setBtn('bPause', true); }
  applyStatic(); buildTod(); buildSeason(); buildJump(); buildChips(); buildList(); buildPlanSelects(); buildPlanList();
  if (window.TELE) window.TELE.init({ here: 'vancouver', getLang: () => lang });
  if (QS.get('portal')) { Object.assign(cam, { x: PORTAL.x, y: PORTAL.y - 20, z: 1.1, tx: PORTAL.x, ty: PORTAL.y - 20, tz: 1.1 }); if (QS.get('portal') === 'open') window.TELE.open(); }
  addLog(esc(tx('decreeFirst')), 'own', true);
  let introSeen = false; try { introSeen = !!localStorage.getItem(INTRO_KEY); } catch (e) { /* ignore */ }
  if (!introSeen && !QS.has('nointro')) openIntro(0);
  if (QS.get('tod') && TOD[+QS.get('tod')]) { todIdx = +QS.get('tod'); Object.assign(env, { m: [...TOD[todIdx].m], n: TOD[todIdx].n }); syncTodButtons(); }
  // seasons start fully applied (no slow fade on load)
  sea.tint = [...SEAS_TINT[season]]; sea.ground = hexA(GROUND[season]); sea.snow = SNOW_AMT[season]; sea.warm = season === 'summer' ? 1 : season === 'spring' ? 0.5 : 0; sea.bare = season === 'winter' ? 1 : 0;
  TRAINS.forEach((t) => { const q = posAt(t.L, t.s); t.x = q[0]; t.y = q[1]; });
  const _w0 = performance.now();
  const warm = QS.has('warm') ? +QS.get('warm') || 0 : 25;
  if (!paused) for (let i = 0; i < warm * 10; i++) { time += 0.1; updatePeople(0.1, time); if (i % 7 === 0) chatter(time); if (QS.has('perf') && i % 25 === 0) console.log('warm i', i, Math.round(performance.now() - _w0)); }
  if (QS.get('cam')) { const [cx, cy, cz] = QS.get('cam').split(',').map(Number); Object.assign(cam, { x: cx, y: cy, z: cz, tx: cx, ty: cy, tz: cz }); }
  if (QS.get('view') === 'world') { fitAll(); cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz; }
  if (QS.get('jump')) { jumpTo(QS.get('jump')); cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz; }
  if (QS.get('panel') && PANELS[QS.get('panel')]) openPanel(QS.get('panel'));
  if (QS.get('sel') && bById.has(QS.get('sel'))) selectBuilding(bById.get(QS.get('sel')));
  if (QS.get('train')) { const t = TRAINS.find((q) => q.id === QS.get('train')); if (t) { selectTrain(t); cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz; } }
  if (QS.get('route')) { QS.get('route').split(',').forEach((id) => bById.has(id) && planSel.add(id)); buildPlanList(); openPanel('plan'); planRouteNow(); }
  requestAnimationFrame(frame);

  window.__van = { cam, buildings, people, TRAINS, selectBuilding: (id) => selectBuilding(bById.get(id)), selectTrain: (id) => selectTrain(TRAINS.find((t) => t.id === id)), openPanel, setSeason, jumpTo };
})();
