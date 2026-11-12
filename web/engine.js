/* OvO Web — game engine (physics, level objects, rendering) */
(function () {
  'use strict';
  const D2R = Math.PI / 180;

  // ---------- tuning (from the original Platform behaviour settings) ----------
  const P = {
    maxSpeed: 330, accel: 1500, decel: 1500, jump: 650, gravity: 1500, maxFall: 1000,
    w: 22, h: 54, hSmall: 26,
    wallSlide: 110, coyote: 0.09, buffer: 0.12,
  };

  const SOLID = new Set(['Solid', 'Solid2', 'Solid3', 'UnmovableSolid', 'SolidMove', 'GroundPoundSolid']);
  const JT = new Set(['JumpThrough', 'UnmovableJumpThrough']);
  const SPIKE = new Set(['Spike', 'Spike2']);

  // ---------- mods (data-only: physics multipliers + colours) ----------
  const MOD = { gravity: 1, jump: 1, speed: 1, colors: {} };
  function setMods(m) { MOD.gravity = m.gravity || 1; MOD.jump = m.jump || 1; MOD.speed = m.speed || 1; MOD.colors = m.colors || {}; }

  // ---------- assets ----------
  const IMG = {};
  ['spike', 'spike2', 'boost', 'coin', 'flag', 'launcher', 'rocket', 'button', 'button_on', 'jumpthrough', 'gpsolid', 'ujumpthrough', 'portal']
    .forEach(n => { const i = new Image(); i.src = 'assets/' + n + '.png'; IMG[n] = i; });

  const SFX = {};
  let sfxOn = true, musicOn = true, music = null, musicName = '';
  function sfx(name, vol) {
    if (!sfxOn) return;
    try {
      let pool = SFX[name];
      if (!pool) pool = SFX[name] = [];
      let a = pool.find(x => x.paused || x.ended);
      if (!a) { if (pool.length > 4) return; a = new Audio('assets/sfx/' + name + '.mp3'); pool.push(a); }
      a.volume = vol == null ? 0.5 : vol; a.currentTime = 0; a.play().catch(() => {});
    } catch (e) {}
  }
  function playMusic(name) {
    if (musicName === name && music && !music.paused) return;
    musicName = name;
    if (music) { music.pause(); music = null; }
    if (!musicOn || !name) return;
    music = new Audio('assets/sfx/' + name + '.mp3'); music.loop = true; music.volume = 0.35;
    music.play().catch(() => {});
  }

  // ---------- geometry ----------
  function rot(x, y, a) { const c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; }

  function updatePoly(o) {
    const a = o.a, ox = -o.hx * o.w, oy = -o.hy * o.h;
    let local;
    if (o.tri) { // spike collision polygon from the original project
      local = [[ox + o.w * 0.5, oy + o.h * 0.1875], [ox + o.w * 0.90625, oy + o.h], [ox + o.w * 0.09375, oy + o.h]];
    } else local = [[ox, oy], [ox + o.w, oy], [ox + o.w, oy + o.h], [ox, oy + o.h]];
    const pts = local.map(([x, y]) => { const r = rot(x, y, a); return [o.x + r[0], o.y + r[1]]; });
    o.poly = pts;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    o.bb = [x0, y0, x1, y1];
    // edge normals
    o.axes = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      let nx = q[1] - p[1], ny = -(q[0] - p[0]); const l = Math.hypot(nx, ny) || 1;
      o.axes.push([nx / l, ny / l]);
    }
  }

  function bbHit(b, x0, y0, x1, y1) { return b[0] < x1 && b[2] > x0 && b[1] < y1 && b[3] > y0; }

  // SAT: axis-aligned box (cx,cy,hw,hh) vs convex polygon. Returns {nx,ny,d} pushing the box out, or null.
  function satBox(cx, cy, hw, hh, o) {
    let best = 1e9, bnx = 0, bny = 0;
    const axes = [[1, 0], [0, 1]].concat(o.axes);
    for (const [ax, ay] of axes) {
      let pmin = 1e9, pmax = -1e9;
      for (const p of o.poly) { const d = p[0] * ax + p[1] * ay; if (d < pmin) pmin = d; if (d > pmax) pmax = d; }
      const c = cx * ax + cy * ay, r = hw * Math.abs(ax) + hh * Math.abs(ay);
      const bmin = c - r, bmax = c + r;
      const o1 = pmax - bmin, o2 = bmax - pmin;
      if (o1 <= 0 || o2 <= 0) return null;
      if (o1 < o2) { if (o1 < best) { best = o1; bnx = ax; bny = ay; } }
      else if (o2 < best) { best = o2; bnx = -ax; bny = -ay; }
    }
    return { nx: bnx, ny: bny, d: best };
  }

  // ---------- spatial grid for static objects ----------
  class Grid {
    constructor(cell) { this.c = cell; this.m = new Map(); }
    key(i, j) { return i * 73856093 ^ j * 19349663; }
    add(o) {
      const c = this.c, b = o.bb;
      for (let i = Math.floor(b[0] / c); i <= Math.floor(b[2] / c); i++)
        for (let j = Math.floor(b[1] / c); j <= Math.floor(b[3] / c); j++) {
          const k = this.key(i, j); let a = this.m.get(k); if (!a) this.m.set(k, a = []); a.push(o);
        }
    }
    query(x0, y0, x1, y1, out, stamp) {
      const c = this.c;
      for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++)
        for (let j = Math.floor(y0 / c); j <= Math.floor(y1 / c); j++) {
          const a = this.m.get(this.key(i, j)); if (!a) continue;
          for (const o of a) if (o._q !== stamp) { o._q = stamp; out.push(o); }
        }
    }
  }

  // ---------- Level ----------
  function makeObj(r) {
    const [t, x, y, w, h, hx, hy, a, e] = r;
    const o = Object.assign({ t, x, y, w, h, hx, hy, a: a * D2R }, e || {});
    o.x0 = o.x; o.y0 = o.y; o.a0 = o.a;
    if (SPIKE.has(t)) o.tri = true;
    return o;
  }

  class Level {
    constructor(def, opts) {
      this.def = def; this.opts = opts || {};
      this.w = def.w; this.h = def.h;
      this.bg = 'rgb(' + (def.bg || '255,255,255') + ')';
      this.build();
    }
    build() {
      const def = this.def;
      this.objs = def.objs.map(makeObj).filter(o => !(o.hard && !this.opts.hard));
      this.byUid = new Map(); this.objs.forEach(o => o.uid != null && this.byUid.set(o.uid, o));
      this.solids = []; this.hazards = []; this.triggers = []; this.areas = []; this.launchers = [];
      this.rockets = []; this.zones = []; this.coin = null; this.flags = []; this.portals = [];
      this.start = null;
      for (const o of this.objs) {
        updatePoly(o);
        if (SOLID.has(o.t) || JT.has(o.t)) this.solids.push(o);
        else if (SPIKE.has(o.t)) this.hazards.push(o);
        else if (o.t === 'MoveArea') this.areas.push(o);
        else if (o.t === 'RocketLauncher') { o.cool = 1 + Math.random(); o.aim = o.a; this.launchers.push(o); }
        else if (o.t === 'Collider') { if (!this.start) this.start = { x: o.x, y: o.y }; }
        else if (o.t === 'EndFlag') this.flags.push(o);
        else if (o.t === 'Coin') this.coin = o;
        else if (o.t === 'Portal') this.portals.push(o);
        else if (o.t === 'Tiledbackground') this.zones.push(o);
        if (['JumpBoost', 'Portal', 'ButtonTrigger', 'Coin', 'EndFlag'].includes(o.t)) this.triggers.push(o);
      }
      if (!this.start) this.start = { x: 100, y: 100 };
      // GD-style move triggers: objects in a targeted group become dynamic
      this.moveTriggers = this.objs.filter(o => o.t === 'MoveTrigger');
      const targeted = new Set(this.moveTriggers.map(t => t.tg));
      this.groups = new Map();
      for (const o of this.objs) if (o.g != null && targeted.has(o.g) && o.t !== 'MoveTrigger') { o.dyn = true; if (!this.groups.has(o.g)) this.groups.set(o.g, []); this.groups.get(o.g).push(o); }
      this.moves = [];
      this.setupAreas();
      this.grid = new Grid(192);
      this.dynamic = [];
      const gobj = this.solids.concat(this.hazards, this.zones);
      for (const o of gobj) if (!o.pin && !o.dyn) this.grid.add(o);
      this.dynamic = gobj.filter(o => o.pin || o.dyn);
      this.stamp = 1;
      this.time = 0;
    }
    setupAreas() {
      const areas = this.areas;
      if (!areas.length) return;
      for (const a of areas) {
        a.cmds = String(a.cmd || '').split(';').map(s => s.trim()).filter(Boolean).map(s => {
          const m = s.split(/\s+/); return { c: m[0].toUpperCase(), v: parseFloat(m[1]) || 0 };
        });
        a.run = !!a.st; a.ci = 0; a.prog = 0; a.spd = 0; a.reps = 0; a.dir = a.rot ? a.a : (a.ia || 0) * D2R;
      }
      const inside = (o, a) => {
        // object origin inside area OBB
        const [lx, ly] = rot(o.x - a.x, o.y - a.y, -a.a);
        const ox = -a.hx * a.w, oy = -a.hy * a.h;
        return lx >= ox && lx <= ox + a.w && ly >= oy && ly <= oy + a.h;
      };
      const pinTo = (o, a) => {
        const [lx, ly] = rot(o.x - a.x, o.y - a.y, -a.a);
        o.pin = { a, lx, ly, la: o.a - a.a };
      };
      // nested areas pin to the most important containing area
      for (const a of areas) if (a.nest) {
        let best = null;
        for (const b of areas) if (b !== a && b.imp > a.imp && inside(a, b) && (!best || b.imp > best.imp)) best = b;
        if (a.par >= 0 && this.byUid.get(a.par)) best = this.byUid.get(a.par);
        if (best) pinTo(a, best);
      }
      const pinnable = this.objs.filter(o => o.t !== 'MoveArea' && o.t !== 'Collider' && o.t !== 'EndFlag' && !o.t.startsWith('SpriteFont') && o.t !== 'LayoutNumber');
      for (const o of pinnable) {
        let best = null;
        for (const a of areas) if (a.grab && inside(o, a) && (!best || a.imp > best.imp)) best = a;
        if (best) pinTo(o, best);
      }
      // order areas: parents before children
      const depth = a => (a.pin ? 1 + depth(a.pin.a) : 0);
      this.areaOrder = areas.slice().sort((p, q) => depth(p) - depth(q));
      this.pinned = this.objs.filter(o => o.pin && o.t !== 'MoveArea');
    }
    trigger(id) { for (const a of this.areas) if (a.id === id && !a.run) { a.run = true; } }
    stepAreas(dt) {
      if (!this.areas.length) return;
      for (const a of this.areaOrder) {
        if (a.pin) { const p = a.pin, r = rot(p.lx, p.ly, p.a.a); a.x = p.a.x + r[0]; a.y = p.a.y + r[1]; a.a = p.a.a + p.la; if (a.rot) a.dir = a.a; }
        if (!a.run || !a.cmds.length) continue;
        let cmd = a.cmds[a.ci]; let t = dt, guard = 0;
        while (t > 0 && a.run && guard++ < 8) {
          cmd = a.cmds[a.ci];
          const next = () => { a.ci++; a.prog = 0; a.spd = 0; if (a.ci >= a.cmds.length) { a.ci = 0; a.reps++; if (a.rep > 0 && a.reps >= a.rep) a.run = false; } };
          if (cmd.c === 'W') { const need = cmd.v - a.prog; if (t >= need) { t -= need; next(); } else { a.prog += t; t = 0; } }
          else if (cmd.c === 'F' || cmd.c === 'B') {
            a.spd = a.ma > 0 ? Math.min(a.ms, a.spd + a.ma * t) : a.ms;
            const step = Math.min(cmd.v - a.prog, a.spd * t || cmd.v); const sg = cmd.c === 'F' ? 1 : -1;
            const dir = a.rot ? a.a : a.dir;
            a.x += Math.cos(dir) * step * sg; a.y += Math.sin(dir) * step * sg; a.prog += step;
            if (a.prog >= cmd.v - 1e-6) { t -= a.spd > 0 ? step / a.spd : t; next(); } else t = 0;
          } else if (cmd.c === 'L' || cmd.c === 'R') {
            a.spd = a.ra > 0 ? Math.min(a.rs, a.spd + a.ra * t) : a.rs;
            const step = Math.min(cmd.v - a.prog, a.spd * t || cmd.v); const sg = cmd.c === 'R' ? 1 : -1;
            if (a.rot) a.a += step * D2R * sg; else a.dir += step * D2R * sg;
            a.prog += step;
            if (a.prog >= cmd.v - 1e-6) { t -= a.spd > 0 ? step / a.spd : t; next(); } else t = 0;
          } else next();
        }
      }
      for (const o of this.pinned) {
        const p = o.pin, r = rot(p.lx, p.ly, p.a.a);
        o.px = o.x; o.py = o.y; o.pa = o.a;
        o.x = p.a.x + r[0]; o.y = p.a.y + r[1]; o.a = p.a.a + p.la;
        if (o.x !== o.px || o.y !== o.py || o.a !== o.pa) updatePoly(o);
      }
    }
    fireMove(t) {
      if (t.fired) return; t.fired = true;
      const objs = this.groups.get(t.tg) || []; if (!objs.length) return;
      this.moves.push({ objs, mx: t.mx || 0, my: t.my || 0, dur: Math.max(0, t.dur || 0), ease: t.ease || 'linear', t: 0, cx: 0, cy: 0 });
    }
    stepMoves(dt) {
      if (!this.moves.length) return;
      const E = { linear: k => k, in: k => k * k, out: k => 1 - (1 - k) * (1 - k), inout: k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2 };
      for (const m of this.moves) {
        m.t += dt; const k = (E[m.ease] || E.linear)(m.dur > 0 ? Math.min(1, m.t / m.dur) : 1);
        const nx = m.mx * k, ny = m.my * k, ddx = nx - m.cx, ddy = ny - m.cy; m.cx = nx; m.cy = ny;
        if (ddx || ddy) for (const o of m.objs) { o.x += ddx; o.y += ddy; if (o.poly) updatePoly(o); }
        if (m.dur <= 0 || m.t >= m.dur) m.done = true;
      }
      this.moves = this.moves.filter(m => !m.done);
    }
    near(x0, y0, x1, y1) {
      const out = []; this.stamp++;
      this.grid.query(x0, y0, x1, y1, out, this.stamp);
      for (const o of this.dynamic) if (!o.gone && bbHit(o.bb, x0, y0, x1, y1)) out.push(o);
      return out;
    }
  }

  // ---------- Game ----------
  // Player logic is a port of the original OvO event sheets (Player.xml / Gameplay.xml)
  // running on an emulation of Construct 2's Platform behaviour, at a fixed 60 ticks/second.
  const TICK = 1 / 60;
  // collision boxes per collider frame, in local coords (x forward when side = 1, y down), from OvO.caproj
  const BOX = {
    stand: [-8, -24, 8, 32],     // frame 0
    slide: [-12, 8, 20, 32],     // frame 1 (slide / slip)
    wave: [-8, 0, 8, 32],        // frame 2 (wave dash)
    dive0: [-12, 8, 32, 32],     // Dive animation frame 0
    dive1: [-12, 8, 20, 32],     // Dive animation frame 1
  };
  const anglediff = (a, b) => { let d = ((a - b) % 360 + 540) % 360 - 180; return Math.abs(d); };
  const anglelerp = (a, b, t) => { let d = ((b - a) % 360 + 540) % 360 - 180; return a + d * t; };
  const between = (v, a, b) => { v = ((v % 360) + 360) % 360; return v >= a && v <= b; };

  function polyOverlap(A, B) { // SAT, returns {nx,ny,d} pushing A out of B, or null
    let best = 1e9, bx = 0, by = 0;
    const test = (pts) => {
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[(i + 1) % pts.length];
        let ax = q[1] - p[1], ay = p[0] - q[0]; const l = Math.hypot(ax, ay) || 1; ax /= l; ay /= l;
        let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
        for (const v of A) { const d = v[0] * ax + v[1] * ay; if (d < a0) a0 = d; if (d > a1) a1 = d; }
        for (const v of B) { const d = v[0] * ax + v[1] * ay; if (d < b0) b0 = d; if (d > b1) b1 = d; }
        const o1 = b1 - a0, o2 = a1 - b0;
        if (o1 <= 0.0001 || o2 <= 0.0001) return false;
        if (o1 < o2) { if (o1 < best) { best = o1; bx = ax; by = ay; } } else if (o2 < best) { best = o2; bx = -ax; by = -ay; }
      }
      return true;
    };
    if (!test(A) || !test(B)) return null;
    return { nx: bx, ny: by, d: best };
  }

  // ---------- player rig (sprites, pivots and layering from the original project) ----------
  const RIGDEF = {
    Head: { iw: 32, ih: 32, hx: 0.5, hy: 1, ip: {} },
    Body: { iw: 8, ih: 16, hx: 0.5, hy: 0.5, ip: { Head: [0.5, 0], RightA: [1, 0.25], LeftA: [0, 0.25], LeftL: [0, 1], RightL: [0.5, 1] } },
    LeftArm: { iw: 4, ih: 8, hx: 1, hy: 0, ip: { 1: [1, 1] } }, RightArm: { iw: 4, ih: 8, hx: 1, hy: 0, ip: { 1: [1, 1] } },
    LeftHand: { iw: 4, ih: 8, hx: 1, hy: 0, ip: {} }, RightHand: { iw: 4, ih: 8, hx: 1, hy: 0, ip: {} },
    LeftLeg: { iw: 4, ih: 8, hx: 0, hy: 0, ip: { 1: [0, 1] } }, RightLeg: { iw: 4, ih: 8, hx: 0, hy: 0, ip: { 1: [0, 1] } },
    LeftFoot: { iw: 4, ih: 8, hx: 0, hy: 0, ip: {} }, RightFoot: { iw: 4, ih: 8, hx: 0, hy: 0, ip: {} },
  };
  const ZORDER = ['RightArm', 'RightHand', 'Body', 'RightLeg', 'RightFoot', 'LeftLeg', 'LeftFoot', 'Head', 'LeftArm', 'LeftHand'];
  const RIGIMG = {};
  Object.keys(RIGDEF).forEach(n => { const i = new Image(); i.src = 'assets/rig/' + n + '.png'; RIGIMG[n] = i; });
  function makeRig(x, y) { const R = {}; for (const n in RIGDEF) R[n] = { name: n, x, y, a: 0, h: RIGDEF[n].ih, mir: 1, ox: x, oy: y }; R._once = {}; R._tick = 0; return R; }
  function rigIpos(o, ip) {
    const d = RIGDEF[o.name], pt = d.ip[ip]; if (!pt) return [o.x, o.y];
    const lx = (pt[0] - d.hx) * d.iw * o.mir, ly = (pt[1] - d.hy) * o.h;
    const a = o.a * D2R, c = Math.cos(a), s = Math.sin(a);
    return [o.x + lx * c - ly * s, o.y + lx * s + ly * c];
  }
  // body anchor (collider image point "BodyPos") per collider frame
  const BODYPOS = { stand: 8, wave: 8, slide: 28, dive0: 28, dive1: 28 };
  function drawRig(ctx, R, dx, dy, alpha) {
    for (const n of ZORDER) {
      const o = R[n], d = RIGDEF[n], im = RIGIMG[n];
      if (!im.complete || !im.width) continue;
      ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.translate(o.x + dx, o.y + dy); ctx.rotate(o.a * D2R); ctx.scale(o.mir, 1);
      ctx.drawImage(im, -d.hx * d.iw, -d.hy * o.h, d.iw, o.h);
      ctx.restore();
    }
  }
  function cloneRig(R) { const c = {}; for (const n in RIGDEF) c[n] = Object.assign({}, R[n]); return c; }

  class Game {
    constructor(canvas) {
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      this.input = { l: 0, r: 0, u: 0, d: 0 };
      this.prevInput = { l: 0, r: 0, u: 0, d: 0 };
      this.latch = {};
      this.running = false; this.paused = false;
      this.cam = { x: 0, y: 0 }; this.particles = [];
      this.onWin = null; this.onDeath = null;
      this.acc = 0; this.last = 0; this.hard = false; this.mobile = false;
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }
    load(def, meta) {
      this.def = def; this.meta = meta || {};
      this.deaths = 0; this.won = false;
      this.reset(true);
      this.running = true; this.paused = false;
    }
    restart() { if (!this.def) return; this.deaths = 0; this.won = false; this.reset(true); }
    reset(snapCam) {
      this.level = new Level(this.def, { hard: this.hard });
      this.time = 0; this.coinGot = false; this.clock = 0; this.waits = []; this.buf = []; this.bufT = 0;
      this.particles = [];
      const s = this.level.start;
      this.p = {
        x: s.x, y: s.y, dx: 0, dy: 0, G: 90, ang: 0, side: 1,
        maxSpeed: 330, acc: 1500, dec: 1500, jump: 650 * MOD.jump, grav: 1500 * MOD.gravity, maxFall: 1000, ignoring: false, jumpCtrl: false,
        floor: false, wasFloor: false, floorObj: null, jumped: false, landed: false, lastLanded: -1,
        frame: 'stand', diveT: 0,
        Walljump: false, CanSlide: true, Sliding: false, Plunge: false, Pound: true, Stun: false, LongJump: false, Falling: false,
        Slipping: false, WaveDash: false, Dancing: false, CanWaveDash: false, TripleJump: false, Down: false, cnj: 0,
        hit: 0, dead: 0, once: {}, jtOff: false, gpOff: false, noTrace: 0, mirrorT: -1, mirrorN: 0, zoneCd: 0, zoneIn: false, portalCd: 0,
        anim: 0, slideId: 0, inv: false,
      };
      this.p.rig = makeRig(s.x, s.y); this.p.ost = 'idle';
      this.prevPos = { x: s.x, y: s.y };
      if (snapCam) { this.cam.x = s.x; this.cam.y = s.y; }
    }
    // ---------- scheduling (C2 "Wait") ----------
    wait(t, fn) { this.waits.push({ t: this.clock + t, fn, lvl: this.level }); }
    runWaits() {
      const now = this.clock; const due = this.waits.filter(w => w.t <= now + 1e-9); if (!due.length) return;
      this.waits = this.waits.filter(w => w.t > now + 1e-9);
      for (const w of due) if (w.lvl === this.level) w.fn();
    }
    once(key, cond, fn) { const p = this.p; if (cond && !p.once[key]) { p.once[key] = true; fn(); } else if (!cond) p.once[key] = false; }

    // ---------- main loop ----------
    loop(ts) {
      requestAnimationFrame(this.loop);
      const dt = Math.min(0.1, (ts - (this.last || ts)) / 1000); this.last = ts;
      if (this.running && !this.paused && this.level) {
        this.acc += dt; let n = 0;
        while (this.acc >= TICK && n < 6) { this.prevPos = { x: this.p.x, y: this.p.y }; this.tick(); this.acc -= TICK; n++; }
        if (n >= 6) this.acc = 0;
      }
      this.render(dt);
    }

    // ---------- geometry helpers ----------
    boxLocal() {
      const p = this.p; let b = BOX[p.frame] || BOX.stand;
      if (p.side < 0) b = [-b[2], b[1], -b[0], b[3]];
      return b;
    }
    poly(x, y, b) {
      const p = this.p; b = b || this.boxLocal();
      const a = (p.G - 90) * D2R, c = Math.cos(a), s = Math.sin(a);
      return [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]].map(([u, v]) => [x + u * c - v * s, y + u * s + v * c]);
    }
    solidOn(o) {
      if (o.gone) return false;
      const t = o.t;
      if (t === 'GroundPoundSolid') return !this.p.gpOff;
      if (JT.has(t)) return !this.p.jtOff;
      return SOLID.has(t);
    }
    // first solid overlapping at (x,y). jt: include jump-throughs that weren't overlapped at (fx,fy)
    overlap(x, y, jt, fx, fy, b) {
      const P1 = this.poly(x, y, b);
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const v of P1) { x0 = Math.min(x0, v[0]); y0 = Math.min(y0, v[1]); x1 = Math.max(x1, v[0]); y1 = Math.max(y1, v[1]); }
      let P0 = null;
      for (const o of this.level.near(x0, y0, x1, y1)) {
        if (!this.solidOn(o) || !bbHit(o.bb, x0, y0, x1, y1)) continue;
        if (JT.has(o.t)) {
          if (!jt) continue;
          if (!polyOverlap(P1, o.poly)) continue;
          if (!P0) P0 = this.poly(fx, fy, b);
          if (polyOverlap(P0, o.poly)) continue;
          return o;
        }
        if (polyOverlap(P1, o.poly)) return o;
      }
      return null;
    }
    overlapsType(test, b) {
      const p = this.p, P1 = this.poly(p.x, p.y, b);
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const v of P1) { x0 = Math.min(x0, v[0]); y0 = Math.min(y0, v[1]); x1 = Math.max(x1, v[0]); y1 = Math.max(y1, v[1]); }
      for (const o of this.level.near(x0, y0, x1, y1)) if (!o.gone && test(o) && bbHit(o.bb, x0, y0, x1, y1) && polyOverlap(P1, o.poly)) return o;
      return null;
    }
    down() { const a = this.p.G * D2R; return [Math.cos(a), Math.sin(a)]; }
    right() { const a = (this.p.G - 90) * D2R; return [Math.cos(a), Math.sin(a)]; }
    onFloor() { const p = this.p, [gx, gy] = this.down(); return !!this.overlap(p.x + gx, p.y + gy, true, p.x, p.y); }
    byWall(side) { // 0 = left, 1 = right
      const p = this.p, [gx, gy] = this.down(), [rx, ry] = this.right(); const s = side ? 2 : -2;
      return !!this.overlap(p.x + rx * s - gx * 2, p.y + ry * s - gy * 2, false);
    }
    pushOut(dx, dy, dist, jt, fx, fy) { // move along (dx,dy) up to dist px until free; C2 pushOutSolid
      const p = this.p, ox = p.x, oy = p.y;
      for (let i = 1; i <= Math.ceil(dist); i++) {
        const d = Math.min(i, dist);
        if (!this.overlap(ox + dx * d, oy + dy * d, jt, fx, fy)) {
          // refine back towards the obstacle
          let lo = d - 1, hi = d;
          for (let k = 0; k < 5; k++) { const m = (lo + hi) / 2; if (this.overlap(ox + dx * m, oy + dy * m, jt, fx, fy)) lo = m; else hi = m; }
          p.x = ox + dx * hi; p.y = oy + dy * hi; return true;
        }
      }
      return false;
    }
    pushOutNearest(maxd) {
      const p = this.p, ox = p.x, oy = p.y;
      for (let r = 1; r <= maxd; r++) for (let k = 0; k < 16; k++) {
        const a = k / 16 * Math.PI * 2; const x = ox + Math.cos(a) * r, y = oy + Math.sin(a) * r;
        if (!this.overlap(x, y, false)) { p.x = x; p.y = y; return true; }
      }
      return false;
    }
    setG(ng) { // change gravity angle while keeping world velocity (as the original events do)
      const p = this.p, d = -(((ng - p.G) % 360 + 540) % 360 - 180) * D2R;
      const vx = p.dx * Math.cos(d) - p.dy * Math.sin(d), vy = p.dy * Math.cos(d) + p.dx * Math.sin(d);
      p.G = ng; p.dx = vx; p.dy = vy;
    }
    speed() { return Math.hypot(this.p.dx, this.p.dy); }
    moving() { return this.p.dx !== 0 || this.p.dy !== 0; }
    // ray cast against solids (Trace behaviour). returns surface normal angle in degrees or null
    trace(x0, y0, x1, y1) {
      const L = this.level; let best = null, bt = 2;
      const minx = Math.min(x0, x1), maxx = Math.max(x0, x1), miny = Math.min(y0, y1), maxy = Math.max(y0, y1);
      for (const o of L.near(minx, miny, maxx, maxy)) {
        if (!this.solidOn(o)) continue;
        const pts = o.poly;
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          const ex = b[0] - a[0], ey = b[1] - a[1], rx = x1 - x0, ry = y1 - y0;
          const den = rx * ey - ry * ex; if (Math.abs(den) < 1e-9) continue;
          const t = ((a[0] - x0) * ey - (a[1] - y0) * ex) / den, u = ((a[0] - x0) * ry - (a[1] - y0) * rx) / den;
          if (t >= 0 && t <= 1 && u >= 0 && u <= 1 && t < bt) {
            bt = t; let nx = ey, ny = -ex; if (nx * rx + ny * ry > 0) { nx = -nx; ny = -ny; }
            best = Math.atan2(ny, nx) / D2R;
          }
        }
      }
      return best;
    }

    // ---------- Construct 2 Platform behaviour ----------
    platformTick(dt) {
      const p = this.p;
      p.jumped = false; p.landed = false;
      const inv = p.inv;
      let left = !p.ignoring && (inv ? this.input.r : this.input.l), right = !p.ignoring && (inv ? this.input.l : this.input.r);
      const jump = p.jumpCtrl && !p.ignoring; p.jumpCtrl = false;
      if (this.overlap(p.x, p.y, false)) this.pushOutNearest(40);
      const [gx, gy] = this.down(), [rx, ry] = this.right();
      const floor = this.onFloor();
      if (floor) {
        if (p.dy > 0) { if (!p.wasFloor) p.landed = true; p.dy = 0; }
        if (jump) { p.dy = -p.jump; p.jumped = true; }
      } else {
        p.dy += p.grav * dt;
        if (p.dy > p.maxFall) p.dy = p.maxFall;
      }
      if (left === right) { if (p.dx < 0) p.dx = Math.min(0, p.dx + p.dec * dt); else if (p.dx > 0) p.dx = Math.max(0, p.dx - p.dec * dt); }
      else if (left) { p.dx -= (p.dx > 0 ? p.acc + p.dec : p.acc) * dt; }
      else { p.dx += (p.dx < 0 ? p.acc + p.dec : p.acc) * dt; }
      if (p.dx > p.maxSpeed) p.dx = p.maxSpeed; else if (p.dx < -p.maxSpeed) p.dx = -p.maxSpeed;

      // horizontal move (in sub-steps to avoid tunnelling)
      if (p.dx !== 0) {
        const total = p.dx * dt * MOD.speed, steps = Math.max(1, Math.ceil(Math.abs(total) / 6));
        for (let i = 0; i < steps; i++) {
          const ox = p.x, oy = p.y, mv = total / steps;
          p.x += rx * mv; p.y += ry * mv;
          if (this.overlap(p.x, p.y, false)) {
            // try to walk up a slope
            if (!this.pushOut(-gx, -gy, Math.abs(mv) + 2.5, false)) { p.x = ox; p.y = oy; p.dx = 0; break; }
          } else if (floor && !p.jumped) {
            // stick to the ground when walking down slopes
            if (!this.onFloor()) {
              const sx = p.x, sy = p.y; let ok = false;
              for (let k = 1; k <= Math.abs(mv) + 3; k++) {
                if (this.overlap(sx + gx * k, sy + gy * k, true, sx, sy)) { p.x = sx + gx * (k - 1); p.y = sy + gy * (k - 1); this.pushOut(gx, gy, 0); ok = true; break; }
              }
              if (!ok) { p.x = sx; p.y = sy; }
            }
          }
        }
      }
      // vertical move
      if (p.dy !== 0) {
        const total = p.dy * dt, steps = Math.max(1, Math.ceil(Math.abs(total) / 6));
        for (let i = 0; i < steps; i++) {
          const ox = p.x, oy = p.y, mv = total / steps;
          p.x += gx * mv; p.y += gy * mv;
          const hit = this.overlap(p.x, p.y, p.dy > 0, ox, oy);
          if (hit) {
            const sg = p.dy > 0 ? -1 : 1;
            if (!this.pushOut(gx * sg, gy * sg, Math.abs(mv) + 2, p.dy > 0, ox, oy)) { p.x = ox; p.y = oy; }
            if (p.dy > 0) { p.floorObj = hit; if (!p.wasFloor && !floor) p.landed = true; }
            p.dy = 0; break;
          }
        }
      }
      p.floor = this.onFloor();
      if (p.floor) { const [gx2, gy2] = this.down(); p.floorObj = this.overlap(p.x + gx2, p.y + gy2, true, p.x, p.y) || p.floorObj; }
      if (p.floor && !p.wasFloor) p.landed = true;
      p.wasFloor = p.floor;
    }

    // ---------- controls ----------
    readInput() {
      const p = this.p, I = this.input, pr = this.prevInput;
      const edge = k => (I[k] && !pr[k]) || this.latch[k];
      if (edge('l') || edge('r')) p.inv = between(p.G, 181, 359);
      if (edge('u')) { for (let i = 0; i < (this.mobile ? 10 : 5); i++) this.buf.push('Jump'); }
      if (edge('d')) this.ctlDown();
      this.latch = {};
      pr.l = I.l; pr.r = I.r; pr.u = I.u; pr.d = I.d;
      // input buffer: every 0.03s, wait 0.05s then run the first buffered control
      this.bufT += TICK;
      if (this.bufT >= 0.03) { this.bufT -= 0.03; if (this.buf.length) this.wait(0.05, () => { if (this.buf.length) { const n = this.buf[0]; if (n === 'Jump') this.ctlJump(); this.buf.shift(); } }); }
    }
    key(k, v) { if (v && !this.input[k]) this.latch[k] = 1; this.input[k] = v ? 1 : 0; }
    clearBuf() { this.buf.length = 0; }
    ctlDown() {
      const p = this.p; if (p.dead) return;
      if (p.floor && p.CanSlide && !p.Plunge && !p.Stun && !p.Slipping) {
        p.Down = true;
        this.wait(0.05, () => {
          if (this.buf.length && !p.Sliding) {
            p.Down = false; p.dec = 0; p.dy = -p.jump * 0.8; sfx('Plunge', 0.4); this.clearBuf();
            this.wait(0.15, () => { p.Plunge = true; });
          } else {
            p.Down = false;
            this.wait(0, () => { if (p.floor) p.Sliding = true; });
          }
        });
      }
      if (!p.floor) {
        if (this.input.l || this.input.r) {
          if (!p.Pound && !p.Stun && !p.LongJump) {
            if (!p.Plunge) p.Plunge = true; else { p.Pound = true; p.Plunge = false; }
          }
          if (!p.Stun && p.LongJump) { p.Pound = true; this.wait(0.1, () => { p.Pound = false; p.CanWaveDash = true; p.LongJump = false; }); }
        } else if (!p.Stun) {
          if (p.LongJump) this.wait(0.1, () => { p.Pound = false; p.CanWaveDash = true; p.LongJump = false; });
          p.Pound = true; p.Plunge = false;
        }
      }
    }
    ctlJump() {
      const p = this.p; if (p.dead) return;
      // wall jump
      if (!p.floor && !p.Pound && !p.Stun && (this.byWall(0) || this.byWall(1))) {
        const bl = this.byWall(0), br = this.byWall(1);
        p.dx = -p.side * p.maxSpeed; p.dec = 0; p.ignoring = true; sfx('Walljump', 0.45); this.clearBuf();
        p.dy = -p.jump * 0.8; this.wait(0, () => { p.Walljump = true; });
        if (this.input.l || this.input.r) { if (bl && p.side === 1) p.side = -1; if (br && p.side === -1) p.side = 1; }
        this.puff(p.x, p.y + 10, 5);
      }
      // wave dash jump
      if (p.WaveDash && p.floor && this.moving()) { p.dy = -p.jump * 0.7; sfx('JumpBoost', 0.4); p.WaveDash = false; p.LongJump = true; this.clearBuf(); }
      // slide jump
      if (p.Sliding) { p.dec = 0; p.dy = -p.jump * 0.8; p.Sliding = false; sfx('Plunge', 0.4); this.clearBuf(); this.wait(0.15, () => { p.Plunge = true; }); }
      // dive (on floor) -> long jump
      if (p.Plunge && p.floor && this.moving()) { p.dy = -p.jump * 0.7; sfx('JumpBoost', 0.4); p.Plunge = false; p.LongJump = true; this.clearBuf(); }
      // ground pound jump
      if (p.Pound && p.floor) { this.clearBuf(); p.dy = -p.jump * 1.1; p.Pound = false; p.CanWaveDash = false; p.st2 = 'gpjump'; sfx('Superjump', 0.4); }
      // normal jump (with consecutive / triple jumps)
      if (this.normalState() && p.floor && this.buf.length) {
        this.clearBuf(); p.jumpCtrl = true;
        if (this.clock - p.lastLanded <= 0.1) {
          p.cnj++;
          this.wait(0, () => {
            if (p.cnj === 0) sfx('jump', 0.35);
            else if (p.cnj === 1) { p.dy = -p.jump * 1.05; p.st2 = 'gpjump'; sfx('Superjump', 0.3); }
            else if (p.cnj === 2) { p.dy = p.dy * 1.15; p.cnj = -1; p.TripleJump = true; p.st2 = 'triplejump'; sfx('Superjump', 0.45); }
          });
        } else { p.cnj = 0; sfx('jump', 0.35); }
      }
    }
    normalState() { const p = this.p; return !p.Sliding && !p.Plunge && !p.Pound && !p.Stun && !p.Walljump && !p.Slipping && !p.WaveDash && !p.Down; }

    // ---------- one game tick ----------
    tick() {
      const L = this.level, p = this.p, dt = TICK;
      this.clock += dt; L.time += dt;
      // moving areas (carry the player when standing on a moving solid)
      const fo = p.floor && p.floorObj && (p.floorObj.pin || p.floorObj.dyn) ? p.floorObj : null; let rel = null;
      if (fo) { const r = rot(p.x - fo.x, p.y - fo.y, -fo.a); rel = r; }
      L.stepAreas(dt);
      L.stepMoves(dt);
      if (fo && !p.dead) { const r = rot(rel[0], rel[1], fo.a); p.x = fo.x + r[0]; p.y = fo.y + r[1]; }
      this.stepRockets(dt);
      this.stepParticles(dt);
      this.runWaits();
      if (p.dead) {
        for (const n in RIGDEF) { const o = p.rig[n], sp = Math.hypot(o.vx, o.vy); if (sp > 0) { const ns = Math.max(0, sp - sp * dt / 0.75 / 2 * 2); o.vx *= ns / sp; o.vy *= ns / sp; } o.x += o.vx * dt; o.y += o.vy * dt; }
        p.dead -= dt; if (p.dead <= 0) this.reset(false); return;
      }
      if (this.won) return;
      this.time += dt;
      this.readInput();
      this.platformTick(dt);
      if (this.trail && (this.trail.n = (this.trail.n || 0) + 1) % 3 === 0 && this.trail.length < 20000) this.trail.push([Math.round(p.x), Math.round(p.y + 24)]);
      if (p.landed) { p.lastLanded = this.clock; if (!p.Pound) this.puff(p.x, p.y + 30, 3); }
      this.events(dt);
      this.gameplay(dt);
      if (!p.dead) this.updateRig();
      p.anim += dt;
    }

    events(dt) {
      const p = this.p, I = this.input;
      const L_ = p.inv ? I.r : I.l, R_ = p.inv ? I.l : I.r;
      const falling = !p.floor && p.dy > 0;
      const bw0 = this.byWall(0), bw1 = this.byWall(1);
      // --- WallSlide / Jump ---
      if (falling && !p.Pound && !p.Stun) {
        if ((bw0 && L_) || (bw1 && R_)) { p.dy = p.dy / 1.5; p.Walljump = true; p.frame = 'stand'; }
      }
      if (p.jumped && !p.Sliding && (bw0 || bw1)) { // jump next to a wall: super jump
        p.dx = -p.side * p.maxSpeed; this.wait(0, () => { p.dy = -p.jump * 1.2; sfx('Superjump', 0.4); });
      }
      if (p.Walljump && falling && !bw0 && !bw1) p.Walljump = false;
      if (p.Walljump && p.floor) p.Walljump = false;
      // --- Mirroring (facing follows movement) + dance detection ---
      if (!p.Slipping && !p.WaveDash && !p.CanWaveDash) {
        if (p.side > 0 && p.dx < 0) this.mirror(-1); else if (p.side < 0 && p.dx > 0) this.mirror(1);
      }
      if (this.clock - p.mirrorT > 0.3 && p.mirrorN > 0) p.mirrorN = 0;
      // --- Slopes (gravity follows the ground) ---
      const a = (p.G - 90) * D2R, c = Math.cos(a), s = Math.sin(a);
      const lp = (u, v) => [p.x + u * c - v * s, p.y + u * s + v * c];
      if (Math.round(this.clock * 60) % 2 === 0) {
        const b = lp(0, 48), f = lp(p.side > 0 ? 42 : -42, 30);
        p.tr1 = this.trace(p.x, p.y, b[0], b[1]); p.tr2 = this.trace(p.x, p.y, f[0], f[1]);
      }
      const t1 = p.tr1, t2 = p.tr2;
      if (t2 != null && t1 == null) {
        const sa = ((t2 + 180) % 360 + 360) % 360;
        if (between(sa, 0, 30) || between(sa, 150, 180)) this.setG(sa + 90 * p.side);
      }
      if (t1 != null && p.floor) {
        const sa = ((t1 + 180) % 360 + 360) % 360;
        if (this.speed() > 50) {
          if (anglediff(p.G, sa) <= 45) this.setG(sa);
          if (between(sa, 0, 45) || between(sa, 135, 225) || between(sa, 180, 360)) { p.Sliding = false; p.Plunge = false; p.Stun = false; }
        } else {
          if (between(sa, 180, 360)) p.Falling = true;
          if (between(sa, 0, 45) || between(sa, 135, 225)) { p.side = 1; p.Slipping = true; }
          if (between(sa, 45, 135)) this.setG(sa);
        }
        p.noTrace = 0;
      } else if (t1 == null && t2 == null) {
        p.noTrace += dt; if (p.noTrace >= 0.05) p.Falling = true;
      } else p.noTrace = 0;
      p.ang = anglelerp(p.ang, p.G - 90, 0.3);
      if (p.Falling) {
        this.setG(anglelerp(p.G, 90, 0.3)); p.dec = 500;
        if (anglediff(p.G, 90) <= 1) { this.setG(90); p.dec = 1500; p.Falling = false; }
      }
      // --- Special movements ---
      if (p.floor && !p.Sliding) {
        if (p.CanWaveDash && !p.Plunge && !p.Stun) { p.CanWaveDash = false; p.WaveDash = true; }
        if (this.clock - p.lastLanded > dt + 1e-6) { p.dec = 1500; p.maxSpeed = 330; p.ignoring = false; }
      }
      if (p.Dancing) {
        p.maxSpeed = 450;
        if (!p.floor || !this.moving()) { if (!p.danceW) { p.danceW = true; this.wait(0.2, () => { p.danceW = false; if (!p.floor || !this.moving()) p.Dancing = false; }); } }
        if (p.Sliding) p.Dancing = false;
      }
      if ((p.Dancing || p.TripleJump || p.LongJump) && Math.floor(this.clock / 0.08) !== Math.floor((this.clock - dt) / 0.08)) this.ghost();
      if (p.TripleJump) { p.maxSpeed = Math.max(p.maxSpeed, 380); if (p.floor || bw0 || bw1 || p.Plunge) p.TripleJump = false; }
      if (p.WaveDash) {
        p.maxSpeed = 700; p.dec = 100; p.ignoring = true; p.frame = 'wave';
        this.once('wave', true, () => {
          sfx('Slide', 0.35); p.waveT = this.clock + 0.4;
          if (L_ && p.side === 1) p.dx = -550; else if (R_) p.dx = 550; else if (p.side === 1) p.dx = 550; else p.dx = -550;
        });
        if (!p.floor && !this.moving()) p.WaveDash = false;
        if (p.floor && this.moving()) p.dec = 400;
        if (this.clock >= p.waveT) p.WaveDash = false;
        if (this.speed() <= 335 && !p.waveSlowW) { p.waveSlowW = true; this.wait(0.3, () => { p.waveSlowW = false; p.WaveDash = false; }); }
      } else p.once.wave = false;
      if (p.Sliding) {
        p.frame = 'slide'; p.ignoring = true; p.dx = p.maxSpeed * 0.8 * p.side; p.maxSpeed = 660;
        this.once('slide', true, () => {
          sfx('Slide', 0.35); p.CanSlide = false; p.Pound = false; const id = ++p.slideId;
          this.wait(0.8, () => { if (p.slideId === id) p.Sliding = false; this.wait(0.5, () => { if (!p.CanSlide) p.CanSlide = true; }); });
        });
        if (!p.floor) { if (p.slideEndT == null) p.slideEndT = this.clock + 0.1; if (this.clock >= p.slideEndT) { p.dec = 0; p.Sliding = false; p.frame = 'stand'; } }
        else p.slideEndT = null;
        if (bw0 && p.side < 0) { p.Sliding = false; p.CanSlide = true; }
        if (bw1 && p.side > 0) { p.Sliding = false; p.CanSlide = true; }
      } else { p.once.slide = false; p.slideEndT = null; }
      if (p.Plunge) {
        if (!p.wasPlunge) p.diveT = 0; p.diveT += dt;
        p.frame = p.diveT < 1 / 3 ? 'dive0' : 'dive1'; p.ignoring = true;
        this.once('plunge', true, () => sfx('Plunge', 0.4));
        if ((bw0 && p.side < 0) || (bw1 && p.side > 0)) { p.Plunge = false; p.Stun = true; }
        if (!p.floor) { p.dx = p.maxSpeed * 0.7 * p.side; p.maxSpeed = 660; p.dec = 0; }
        if (p.floor && this.moving()) p.dec = 1000;
        if (p.floor && !this.moving() && !p.plungeW) { p.plungeW = true; this.wait(0.2, () => { p.plungeW = false; p.Plunge = false; }); }
      } else p.once.plunge = false;
      p.wasPlunge = p.Plunge;
      if (!p.Plunge && (p.frame === 'dive0' || p.frame === 'dive1')) p.frame = 'stand';
      if (p.LongJump) {
        p.frame = 'stand'; p.ignoring = false; p.maxSpeed = 660; p.dx = p.maxSpeed * 2 * p.side; p.dec = 0;
        if (bw0 || bw1) p.LongJump = false;
        if (p.floor) p.LongJump = false;
      }
      if (p.Pound) {
        p.frame = 'stand'; p.dx = 0; p.maxFall = p.grav * 2; p.ignoring = true;
        this.once('poundOff', true, () => { p.jtOff = true; p.gpOff = true; });
        this.once('poundFloor', p.floor, () => {
          sfx('Pound', 0.5); this.shake = 0.12; this.puff(p.x, p.y + 30, 8);
          this.wait(0.25, () => { if (p.Pound && !p.floor) p.CanWaveDash = true; p.Pound = false; });
        });
        this.once('poundStart', true, () => {
          sfx('PrePound', 0.4); p.dy = -p.grav / 5;
          this.wait(0.2, () => { p.dy = p.grav / 3; });
        });
      } else { p.once.poundOff = false; p.once.poundFloor = false; p.once.poundStart = false; }
      if (p.CanWaveDash) {
        this.once('cwd', true, () => { p.dx = 0; p.dy = p.grav / 3; p.cwdT = this.clock + 0.5; });
        if (this.clock >= p.cwdT) p.CanWaveDash = false;
        if (p.floor) p.CanWaveDash = false;
      } else p.once.cwd = false;
      if (p.Slipping) {
        p.frame = 'slide'; p.ignoring = true;
        this.once('slip', true, () => { p.Sliding = false; p.Plunge = false; p.Stun = false; });
        const ca = ((p.ang % 360) + 360) % 360;
        if (!(ca <= 45 || ca >= 315)) { p.dx = -p.maxSpeed * p.side; p.maxSpeed = 700; p.dec = 0; }
        else if (this.moving()) p.dec = 500;
        else p.Slipping = false;
      } else p.once.slip = false;
      if (p.Stun) {
        p.frame = 'stand'; p.ignoring = true;
        this.once('stunFloor', p.floor, () => { this.wait(0.3, () => { p.Stun = false; p.dx = -p.side * 100; }); });
        this.once('stun', true, () => { p.dx = p.dx * -0.6; sfx('Pound', 0.5); this.shake = 0.25; });
      } else { p.once.stun = false; p.once.stunFloor = false; }
      if (!p.floor && falling) { const b = lp(0, 64); if (this.trace(p.x, p.y, b[0], b[1]) != null) p.lastLanded = this.clock; }
      if (this.normalState()) { p.frame = 'stand'; p.ignoring = false; }
      else p.cnj = 0;
      // pound-through floors come back once we're clear of them
      if (!p.Pound && p.jtOff && !this.overlapsType(o => JT.has(o.t))) p.jtOff = false;
      if (!p.Pound && p.gpOff && !this.overlapsType(o => o.t === 'GroundPoundSolid')) p.gpOff = false;
    }
    mirror(side) {
      const p = this.p; p.side = side;
      if (p.floor && this.moving() && !p.Dancing) {
        if (this.clock - p.mirrorT <= 0.3) { p.mirrorN++; if (p.mirrorN >= 2) { p.Dancing = true; p.mirrorN = 0; } } else p.mirrorN = 1;
        p.mirrorT = this.clock;
      } else p.mirrorN = 0;
    }

    gameplay(dt) {
      const p = this.p, L = this.level;
      // spikes & rockets (need ~2 ticks of overlap, like HitBuffer)
      const touching = this.overlapsType(o => SPIKE.has(o.t)) || L.rockets.some(r => polyOverlap(this.poly(p.x, p.y), r.poly));
      if (touching) { p.hit += dt * 60; if (p.hit >= 2) return this.die(); } else p.hit = 0;
      // outside layout
      const P = this.poly(p.x, p.y); const xs = P.map(v => v[0]), ys = P.map(v => v[1]);
      if (Math.max(...xs) < 0 || Math.min(...xs) > L.w || Math.max(...ys) < 0 || Math.min(...ys) > L.h) return this.die();
      // jump boosts (on collision)
      p.boosts = p.boosts || new Set();
      const now = new Set();
      for (const o of L.triggers) {
        if (o.gone || o.t !== 'JumpBoost') continue;
        if (!polyOverlap(P, o.poly)) continue;
        now.add(o);
        if (p.boosts.has(o) || p.Pound || p.Plunge || p.Stun) continue;
        const ang = o.a / D2R + 270, F = p.grav * (o.f || 0.7);
        p.dy = F * Math.sin(ang * D2R);
        p.maxSpeed = Math.max(F * Math.cos(ang * D2R), 330);
        p.dx = F * Math.cos(ang * D2R) + p.dx;
        if (o.dc) p.dec = 0;
        sfx('JumpBoost', 0.45); this.puff(o.x, o.y, 6);
      }
      p.boosts = now;
      // coin / flag / buttons
      for (const o of L.triggers) {
        if (o.gone) continue;
        if (o.t === 'Coin' && polyOverlap(P, o.poly)) { o.gone = true; this.coinGot = true; sfx('coin1', 0.5); this.puff(o.x, o.y, 12); }
        else if (o.t === 'EndFlag' && polyOverlap(P, o.poly)) return this.win();
        else if (o.t === 'ButtonTrigger' && !o.pressed && polyOverlap(P, o.poly)) { o.pressed = true; L.trigger(o.id); sfx('Button', 0.5); }
      }
      // move triggers: fire when the player passes them (or touches them, if touch-triggered)
      for (const t of L.moveTriggers) {
        if (t.fired) continue;
        if (t.touch ? polyOverlap(P, t.poly) : p.x >= t.x) L.fireMove(t);
      }
      // portals
      p.portalCd = Math.max(0, p.portalCd - dt);
      if (p.portalCd <= 0) {
        const [gx, gy] = this.down(), [rx, ry] = this.right();
        const wvx = rx * p.dx + gx * p.dy, wvy = ry * p.dx + gy * p.dy;
        const Pn = this.poly(p.x + wvx * dt, p.y + wvy * dt);
        for (const o of L.portals) {
          if (!polyOverlap(Pn, o.poly)) continue;
          const out = L.portals.find(q => q.id === o.tg); if (!out) break;
          const initA = o.a / D2R + (o.inv ? 180 : 0);
          const sp = o.fs ? o.fsp : Math.hypot(wvx, wvy);
          let na = o.fa ? o.fan : Math.atan2(wvy, wvx) / D2R + 180 - initA + out.a / D2R + (out.inv ? 180 : 0);
          na *= o.inv ? -1 : 1;
          const ex = out.w * 2.5 * (out.inv ? -1 : 1);
          p.x = out.x + Math.cos(out.a) * ex; p.y = out.y + Math.sin(out.a) * ex;
          const vx = Math.cos(na * D2R) * sp, vy = Math.sin(na * D2R) * sp;
          p.dx = rx * vx + ry * vy; p.dy = gx * vx + gy * vy;
          if (this.overlap(p.x, p.y + 1, true, p.x, p.y)) p.y -= 1;
          p.portalCd = 0.12; sfx('Transition', 0.3);
          break;
        }
      }
      // gravity zones (red areas)
      p.zoneCd = Math.max(0, p.zoneCd - dt);
      const z = this.overlapsType(o => o.t === 'Tiledbackground');
      if (p.zoneCd <= 0) {
        if (z && !p.zoneIn) { this.setG(z.a / D2R + 90); p.ang = p.G - 90; p.zoneIn = true; p.zoneCd = 0.1; p.inv = between(p.G, 181, 359); }
        else if (!z && p.zoneIn) { this.setG(90); p.ang = 0; p.zoneIn = false; p.zoneCd = 0.1; p.inv = false; }
      }
    }

    // ---------- rockets ----------
    stepRockets(dt) {
      const L = this.level, p = this.p;
      for (const o of L.launchers) {
        if (o.alive && !L.rockets.includes(o.alive)) o.alive = null;
        const d = Math.hypot(p.x - o.x, p.y - o.y);
        const los = !p.dead && this.trace(o.x, o.y, p.x, p.y) == null;
        if (!los) continue;
        const want = Math.atan2(p.y - o.y, p.x - o.x);
        o.aim += clampA(angDiff(want, o.aim), Math.PI * dt);
        o.cool = (o.cool || 0) - dt;
        if (d <= 300 && o.cool <= 0 && !o.alive && o.on !== 0) {
          o.cool = 1; const lo = o;
          this.wait(0.2, () => {
            const off = lo.w * (0.90625 - 0.125);
            const r = { x: lo.x + Math.cos(lo.aim) * off, y: lo.y + Math.sin(lo.aim) * off, a: lo.aim, sp: lo.sp > 0 ? lo.sp : 400, w: 32, h: 16 };
            lo.alive = r; L.rockets.push(r); sfx('Rocket-2', 0.3);
          });
        }
      }
      for (const r of L.rockets) {
        if (!p.dead) r.a += clampA(angDiff(Math.atan2(p.y - r.y, p.x - r.x), r.a), 3 * D2R);
        r.x += Math.cos(r.a) * r.sp * dt; r.y += Math.sin(r.a) * r.sp * dt;
        const c = Math.cos(r.a), s = Math.sin(r.a);
        r.poly = [[0, -8], [32, -8], [32, 8], [0, 8]].map(([u, v]) => [r.x + u * c - v * s, r.y + u * s + v * c]);
        if (Math.random() < 0.5) this.particles.push({ x: r.x, y: r.y, vx: 0, vy: 0, life: 0.4, c: '#aaa', s: 4, g: -20 });
        const bb = [r.x - 34, r.y - 34, r.x + 34, r.y + 34];
        for (const o of L.near(bb[0], bb[1], bb[2], bb[3])) {
          if (!o.gone && SOLID.has(o.t) && polyOverlap(r.poly, o.poly)) { r.dead = true; this.explode(r.x + c * 16, r.y + s * 16); break; }
        }
        if (Math.abs(r.x) > 1e5) r.dead = true;
      }
      L.rockets = L.rockets.filter(r => !r.dead);
    }
    explode(x, y) { sfx('Pound', 0.3); for (let i = 0; i < 12; i++) this.particles.push({ x, y, vx: (Math.random() - 0.5) * 400, vy: (Math.random() - 0.5) * 400, life: 0.5, c: i % 2 ? '#f80a19' : '#000', s: 5 }); }
    puff(x, y, n, c) { for (let i = 0; i < n; i++) this.particles.push({ x, y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 120, life: 0.35 + Math.random() * 0.2, c: c || '#000', s: 3 }); }
    ghost() { const p = this.p; this.particles.push({ kind: 'ghost', rig: cloneRig(p.rig), x: 0, y: 0, life: 0.35, vx: 0, vy: 0, g: 0 }); }
    stepParticles(dt) {
      for (const q of this.particles) { if (q.drag) { q.vx *= 0.94; q.vy *= 0.94; } q.vy += (q.g == null ? 600 : q.g) * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; if (q.rs) q.r += q.rs * dt; }
      this.particles = this.particles.filter(q => q.life > 0);
    }
    die() {
      const p = this.p; if (p.dead || this.won) return;
      p.dead = 0.75; this.deaths++; sfx('Death', 0.5); sfx('Pound', 0.35); this.shake = 0.2;
      this.wait(0.1, () => sfx('Transition', 0.3));
      const [gx, gy] = this.down(), [rx, ry] = this.right();
      const vx = rx * p.dx + gx * p.dy, vy = ry * p.dx + gy * p.dy;
      // original death: every rig part keeps flying with its last movement, slowing down while fading out
      for (const n in RIGDEF) { const o = p.rig[n]; o.vx = (o.x - o.ox) / TICK; o.vy = (o.y - o.oy) / TICK; }
      if (this.onDeath) this.onDeath();
    }
    win() {
      if (this.won) return; this.won = true;
      if (this.onWin) setTimeout(() => this.onWin({ time: this.time, deaths: this.deaths, coin: this.coinGot }), 500);
    }
    ovoState() { // "Player > States" from the original event sheet
      const p = this.p; const bw = this.byWall(0) || this.byWall(1); let st = p.ost;
      if (p.floor) {
        if (bw) st = 'wall'; else if (p.Slipping) st = 'slip'; else if (p.Sliding) st = 'slide';
        else if (this.moving() && p.Dancing) st = 'dancing'; else if (this.moving() && p.WaveDash) st = 'wavedash';
        else if (this.moving()) st = 'run'; else st = 'idle';
      } else if (!(p.dy < 0)) {
        if (bw) st = 'wallslide'; else if (p.dy > 0) st = 'fall';
      } else if (st !== 'gpjump' && st !== 'triplejump') st = 'jump';
      if (p.st2) { st = p.st2; p.st2 = null; }
      if (p.Pound && !p.floor) st = 'pound';
      if (p.Pound && p.floor) st = 'poundFloor';
      if (p.CanWaveDash && !p.floor) st = 'wavedashFall';
      if (p.Plunge) st = 'plunge';
      if (p.Stun) st = 'stun';
      p.ost = st; return st;
    }
    updateRig() {
      const p = this.p, R = p.rig; R._tick++;
      for (const n in RIGDEF) { R[n].ox = R[n].x; R[n].oy = R[n].y; R[n].mir = p.side < 0 ? -1 : 1; }
      const ang = ((p.ang % 360) + 360) % 360, a = p.ang * D2R, by = BODYPOS[p.frame] || 8;
      const bx = p.x - Math.sin(a) * by, byy = p.y + Math.cos(a) * by;
      const C = { State: this.ovoState(), Side: p.side, Angle: ang, jumped: p.jumped, landed: p.landed, Skin: '', VectorX: p.dx, VectorY: p.dy, Height: 64, X: p.x, Y: p.y,
        ipx: () => bx, ipy: () => byy };
      const once = id => { const r = R._once[id] !== R._tick - 1; R._once[id] = R._tick; return r; };
      if (window.OvORigAnimate) window.OvORigAnimate(R, C, TICK, this.clock, once, rigIpos);
    }
    animState() {
      const p = this.p;
      if (p.Pound) return 'pound';
      if (p.Plunge) return 'dive';
      if (p.Sliding || p.Slipping) return 'slide';
      if (p.WaveDash) return 'slide';
      if (p.Stun) return 'stun';
      if (p.floor) return this.moving() ? 'run' : 'idle';
      if ((this.byWall(0) || this.byWall(1)) && p.dy > 0) return 'wall';
      return p.dy < 0 ? 'jump' : 'fall';
    }

    // ---------- rendering ----------
    render(dt) {
      const cv = this.cv, ctx = this.ctx;
      const W = cv.width, H = cv.height;
      if (!this.level) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); return; }
      const L = this.level, p = this.p;
      // "Scale outer" with a 640x640 base, like the original project
      const s = Math.min(W, H) / 640; const vw = W / s, vh = H / s;
      const al = Math.min(1, this.acc / TICK);
      const px = this.prevPos.x + (p.x - this.prevPos.x) * al, py = this.prevPos.y + (p.y - this.prevPos.y) * al;
      if (!p.dead) { const k = 1 - Math.pow(0.5, dt * 60); this.cam.x += (px - this.cam.x) * k; this.cam.y += (py - this.cam.y) * k; }
      let cx = this.cam.x, cy = this.cam.y;
      // original levels use unbounded scrolling: the camera just follows the player
      if (this.shake > 0) { this.shake -= dt; cx += (Math.random() - 0.5) * 8; cy += (Math.random() - 0.5) * 8; }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = MOD.colors.background || L.bg; ctx.fillRect(0, 0, W, H);
      ctx.setTransform(s, 0, 0, s, Math.round(W / 2 - cx * s), Math.round(H / 2 - cy * s));
      ctx.imageSmoothingEnabled = true;
      const vx0 = cx - vw / 2 - 64, vy0 = cy - vh / 2 - 64, vx1 = cx + vw / 2 + 64, vy1 = cy + vh / 2 + 64;
      for (const o of L.objs) {
        if (o.gone || o.inv) continue;
        if (o.bb && !bbHit(o.bb, vx0, vy0, vx1, vy1)) continue;
        this.drawObj(ctx, o);
      }
      for (const r of L.rockets) { ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.a); ctx.drawImage(IMG.rocket, 0, -8, 32, 16); ctx.restore(); }
      for (const q of this.particles) if (q.kind === 'ghost' && q.rig) drawRig(ctx, q.rig, 0, 0, q.life / 0.35 * 0.6);
      ctx.globalAlpha = 1;
      if (p.rig) drawRig(ctx, p.rig, p.dead ? 0 : px - p.x, p.dead ? 0 : py - p.y, p.dead ? Math.max(0, p.dead / 0.75) : 1);
      for (const q of this.particles) {
        if (q.kind === 'ghost') continue;
        ctx.globalAlpha = Math.min(1, q.life * 2.5); ctx.fillStyle = q.c; ctx.strokeStyle = q.c;
        if (q.kind === 'head') { ctx.beginPath(); ctx.arc(q.x, q.y, 9, 0, 7); ctx.fill(); }
        else if (q.kind === 'line') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke(); ctx.restore(); }
        else ctx.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s);
      }
      ctx.globalAlpha = 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    drawObj(ctx, o) {
      const t = o.t;
      ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.a);
      const ox = -o.hx * o.w, oy = -o.hy * o.h;
      switch (t) {
        case 'Solid': case 'UnmovableSolid': ctx.fillStyle = MOD.colors.solid || '#000'; ctx.fillRect(ox - 0.3, oy - 0.3, o.w + 0.6, o.h + 0.6); break;
        case 'Solid2': ctx.fillStyle = '#fff'; ctx.fillRect(ox - 0.3, oy - 0.3, o.w + 0.6, o.h + 0.6); break;
        case 'SolidMove': ctx.fillStyle = '#ff0000'; ctx.fillRect(ox, oy, o.w, o.h); break;
        case 'GroundPoundSolid': ctx.fillStyle = IMG.gpsolid.complete && IMG.gpsolid.width ? ctx.createPattern(IMG.gpsolid, 'repeat') : '#f80a19'; ctx.translate(ox, oy); ctx.fillRect(0, 0, o.w, o.h); break;
        case 'JumpThrough': case 'UnmovableJumpThrough': {
          const im = t === 'JumpThrough' ? IMG.jumpthrough : IMG.ujumpthrough;
          ctx.translate(ox, oy); ctx.fillStyle = im.complete && im.width ? ctx.createPattern(im, 'repeat') : '#000'; ctx.fillRect(0, 0, o.w, o.h); break;
        }
        case 'Spike': ctx.drawImage(IMG.spike, ox, oy, o.w, o.h); break;
        case 'Spike2': ctx.drawImage(IMG.spike2, ox, oy, o.w, o.h); break;
        case 'JumpBoost': ctx.drawImage(IMG.boost, ox, oy, o.w, o.h); break;
        case 'Coin': ctx.drawImage(IMG.coin, ox, oy, o.w, o.h); break;
        case 'EndFlag': ctx.drawImage(IMG.flag, ox, oy, o.w, o.h); break;
        case 'RocketLauncher': ctx.restore(); ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.aim); ctx.drawImage(IMG.launcher, -o.hx * o.w, -o.hy * o.h, o.w, o.h); break;
        case 'ButtonTrigger': ctx.drawImage(o.pressed ? IMG.button_on : IMG.button, ox, oy, o.w, o.h); break;
        case 'Portal': ctx.drawImage(IMG.portal, ox, oy, o.w, o.h); break;
        case 'Tiledbackground': ctx.fillStyle = 'rgba(242,12,25,0.08)'; ctx.fillRect(ox, oy, o.w, o.h); break;
        case 'SpriteFontDeluxe': case 'SpriteFontDeluxeW': case 'Text': {
          const sc = o.sc || 1, fs = 15 * sc;
          ctx.fillStyle = t === 'SpriteFontDeluxeW' ? '#fff' : (o.col || MOD.colors.text || '#000'); ctx.font = fs + 'px Retron, monospace'; ctx.textBaseline = 'top';
          const al = o.al == null ? 50 : o.al; ctx.textAlign = al < 25 ? 'left' : al > 75 ? 'right' : 'center';
          const x = al < 25 ? ox : al > 75 ? ox + o.w : ox + o.w / 2;
          wrapText(ctx, o.tx || '', x, oy, o.w, fs * 1.25);
          break;
        }
        case 'LayoutNumber': ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.font = (16 * (o.sc || 1)) + 'px Retron, monospace'; ctx.textBaseline = 'top'; ctx.textAlign = 'left'; ctx.fillText(String(this.def && typeof this.def.n === 'number' ? this.def.n : o.tx), ox, oy); break;
      }
      ctx.restore();
    }
    drawPlayer(ctx, p, x, y, st) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate((p.ang || 0) * D2R); ctx.translate(0, 32); ctx.scale(p.side, 1);
      ctx.strokeStyle = '#000'; ctx.fillStyle = '#000'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const t = (p.anim || 0) * 12;
      const line = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
      if (st === 'slide') {
        ctx.beginPath(); ctx.arc(14, -14, 8, 0, 7); ctx.fill();
        line([6, -12, -12, -8]); line([-12, -8, -24, -4]); line([-12, -8, -22, -12]);
        line([4, -11, 18, -3]); line([2, -11, 16, -22]);
      } else if (st === 'dive') {
        ctx.beginPath(); ctx.arc(18, -16, 8, 0, 7); ctx.fill();
        line([10, -15, -10, -14]); line([-10, -14, -22, -10]); line([-10, -14, -22, -18]);
        line([8, -15, 26, -20]); line([8, -15, 24, -10]);
      } else if (st === 'pound') {
        ctx.beginPath(); ctx.arc(0, -40, 9, 0, 7); ctx.fill();
        line([0, -30, 0, -18]); line([0, -18, -10, -10, -4, 0]); line([0, -18, 10, -10, 4, 0]);
        line([0, -27, -12, -16]); line([0, -27, 12, -16]);
      } else if (st === 'wall') {
        ctx.beginPath(); ctx.arc(-2, -46, 9, 0, 7); ctx.fill();
        line([0, -36, 2, -20]); line([2, -20, 8, -10, 6, 0]); line([2, -20, -6, -10, -4, -2]);
        line([0, -32, 8, -44]); line([0, -32, -8, -24]);
      } else if (st === 'stun') {
        ctx.beginPath(); ctx.arc(-4, -44, 9, 0, 7); ctx.fill();
        line([-2, -34, 0, -20]); line([0, -20, -8, -10, -10, 0]); line([0, -20, 6, -10, 8, 0]);
        line([-2, -30, -14, -36]); line([-2, -30, 10, -38]);
      } else {
        const run = st === 'run';
        const spd = Math.min(1.4, Math.abs(p.dx || 0) / 330);
        const sw = run ? Math.sin(t * (0.6 + spd * 0.5)) : 0, sw2 = run ? Math.cos(t * (0.6 + spd * 0.5)) : 0;
        const bob = run ? Math.abs(sw2) * 2 : 0, lean = run ? 4 * spd : 0;
        ctx.beginPath(); ctx.arc(lean, -46 - bob, 9, 0, 7); ctx.fill();
        line([lean, -36 - bob, 0, -22 - bob]);
        if (st === 'run' || st === 'idle') {
          line([0, -22 - bob, 8 * sw, -11 + 3 * Math.max(0, -sw2), 12 * sw, 0]);
          line([0, -22 - bob, -8 * sw, -11 + 3 * Math.max(0, sw2), -12 * sw, 0]);
          const aS = run ? sw * 10 : 2;
          line([lean * 0.7, -32 - bob, -aS, -21 - bob]); line([lean * 0.7, -32 - bob, aS, -21 - bob]);
        } else if (st === 'jump') {
          line([0, -22, 8, -14, 6, -4]); line([0, -22, -6, -12, -12, -8]);
          line([0, -32, -8, -42]); line([0, -32, 10, -40]);
        } else {
          line([0, -22, 6, -12, 4, -2]); line([0, -22, -6, -12, -6, -2]);
          line([0, -32, -12, -38]); line([0, -32, 12, -38]);
        }
      }
      ctx.restore();
    }
  }

  function approach(v, t, d) { return v < t ? Math.min(t, v + d) : Math.max(t, v - d); }
  function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
  function clampA(d, m) { return Math.max(-m, Math.min(m, d)); }
  function wrapText(ctx, text, x, y, maxW, lh) {
    const words = String(text).split(/\s+/); let line = ''; let yy = y;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW + 4 && line) { ctx.fillText(line, x, yy); line = w; yy += lh; }
      else line = test;
    }
    if (line) ctx.fillText(line, x, yy);
  }

  window.OvO = { Game, Level, makeObj, updatePoly, IMG, sfx, playMusic, setAudio(s, m) { sfxOn = s; musicOn = m; if (!m && music) { music.pause(); } else if (m && musicName) { const n = musicName; musicName = ''; playMusic(n); } }, P, SOLID, JT, SPIKE, rot, wrapText };
  window.OvO.setMods = setMods; window.OvO.MOD = MOD;
  window.OvO.RIG = { makeRig, drawRig, rigIpos, RIGDEF, BODYPOS };
})();

