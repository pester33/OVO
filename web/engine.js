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
    if (o.tri) { // spike triangle, slightly shrunk for fairness
      const k = 0.18;
      local = [[ox + o.w * 0.5, oy + o.h * (0.08 + k)], [ox + o.w * (1 - k), oy + o.h * 0.98], [ox + o.w * k, oy + o.h * 0.98]];
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
      this.rockets = []; this.coin = null; this.flags = []; this.portals = [];
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
        if (['JumpBoost', 'Portal', 'ButtonTrigger', 'Coin', 'EndFlag'].includes(o.t)) this.triggers.push(o);
      }
      if (!this.start) this.start = { x: 100, y: 100 };
      this.setupAreas();
      this.grid = new Grid(192);
      this.dynamic = [];
      for (const o of this.solids.concat(this.hazards)) (o.pin ? this.dynamic : (this.grid.add(o), null));
      this.dynamic = this.solids.concat(this.hazards).filter(o => o.pin);
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
    near(x0, y0, x1, y1) {
      const out = []; this.stamp++;
      this.grid.query(x0, y0, x1, y1, out, this.stamp);
      for (const o of this.dynamic) if (!o.gone && bbHit(o.bb, x0, y0, x1, y1)) out.push(o);
      return out;
    }
  }

  // ---------- Game ----------
  class Game {
    constructor(canvas) {
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      this.input = { l: 0, r: 0, u: 0, d: 0 };
      this.prevInput = { u: 0, d: 0 };
      this.running = false; this.paused = false;
      this.cam = { x: 0, y: 0 }; this.particles = [];
      this.onWin = null; this.onDeath = null;
      this.acc = 0; this.last = 0;
      this.hard = false;
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }
    load(def, meta) {
      this.def = def; this.meta = meta || {};
      this.level = new Level(def, { hard: this.hard });
      this.deaths = 0; this.time = 0; this.coinGot = false; this.won = false;
      this.spawn(true);
      this.running = true; this.paused = false;
    }
    restart() { if (!this.def) return; this.level = new Level(this.def, { hard: this.hard }); this.spawn(true); this.time = 0; this.won = false; this.coinGot = false; }
    spawn(snapCam) {
      const s = this.level.start;
      this.p = { x: s.x, y: s.y + 32 - P.h / 2, vx: 0, vy: 0, h: P.h, side: 1, st: 'normal', g: false, gObj: null, wall: 0,
        coyote: 0, buf: 0, ign: 0, slideT: 0, maxS: P.maxSpeed, poundT: 0, stun: 0, anim: 0, dead: 0, portalCd: 0, boostCd: new Map(), air: 0 };
      if (snapCam) { this.cam.x = this.p.x; this.cam.y = this.p.y; }
    }
    // ---- main loop ----
    loop(ts) {
      requestAnimationFrame(this.loop);
      const dt = Math.min(0.05, (ts - (this.last || ts)) / 1000); this.last = ts;
      if (this.running && !this.paused && this.level) {
        this.acc += dt; const h = 1 / 240; let n = 0;
        while (this.acc >= h && n < 14) { this.step(h); this.acc -= h; n++; }
        if (n >= 14) this.acc = 0;
      }
      this.render(dt);
    }
    pressed(k) { return this.input[k] && !this.prevInput[k]; }
    step(dt) {
      const L = this.level, p = this.p, I = this.input;
      L.time += dt;
      // edge detection on raw input once per step
      const jumpEdge = I.u && !this.prevInput.u, downEdge = I.d && !this.prevInput.d;
      this.prevInput.u = I.u; this.prevInput.d = I.d;
      // moving areas
      const gObj = p.g ? p.gObj : null; let footBefore = null;
      if (gObj && gObj.pin) footBefore = { lx: 0, ly: 0, ...(() => { const r = rot(p.x - gObj.x, p.y + p.h / 2 - gObj.y, -gObj.a); return { lx: r[0], ly: r[1] }; })() };
      L.stepAreas(dt);
      if (footBefore && !p.dead) { const r = rot(footBefore.lx, footBefore.ly, gObj.a); p.x = gObj.x + r[0]; p.y = gObj.y + r[1] - p.h / 2; }
      this.stepLaunchers(dt);
      this.stepParticles(dt);
      if (p.dead) { p.dead -= dt; if (p.dead <= 0) { this.level = new Level(this.def, { hard: this.hard }); this.spawn(false); } return; }
      if (this.won) return;
      this.time += dt;

      const inX = (I.r ? 1 : 0) - (I.l ? 1 : 0);
      if (jumpEdge) p.buf = P.buffer; else p.buf = Math.max(0, p.buf - dt);
      p.coyote = p.g ? P.coyote : Math.max(0, p.coyote - dt);
      p.ign = Math.max(0, p.ign - dt); p.portalCd = Math.max(0, p.portalCd - dt); p.stun = Math.max(0, p.stun - dt);
      if (!p.g) p.air += dt; else p.air = 0;

      // ---- special moves ----
      if (downEdge && p.stun <= 0) {
        if (p.g && p.st === 'normal' && Math.abs(p.vx) > 60) this.startSlide(Math.sign(p.vx), Math.abs(p.vx));
        else if (!p.g && (p.st === 'normal' || p.st === 'long')) {
          if (inX !== 0 || Math.abs(p.vx) > 90) this.startDive(inX || Math.sign(p.vx));
          else this.startPound();
        } else if (!p.g && p.st === 'dive') this.startPound();
      }

      // jumping
      if (p.buf > 0 && p.stun <= 0 && p.st !== 'pound') {
        if (p.g || p.coyote > 0) {
          if (p.st === 'slide') { // long jump
            const sp = Math.min(660, Math.max(Math.abs(p.vx), P.maxSpeed) * 1.5);
            p.maxS = 660; p.vx = p.side * sp; p.vy = -P.jump * 0.75; this.setH(P.h); p.st = 'long'; sfx('Superjump', 0.4);
          } else { p.vy = -P.jump; p.st = p.st === 'dive' ? 'normal' : p.st; sfx('jump', 0.35); }
          p.g = false; p.coyote = 0; p.buf = 0; p.jumped = true;
        } else if (p.wall && (p.st === 'normal' || p.st === 'long' || p.st === 'dive')) {
          this.setH(P.h);
          p.vx = -p.wall * Math.max(P.maxSpeed, Math.min(Math.abs(p.vx), 450)); p.maxS = Math.max(p.maxS, Math.abs(p.vx));
          p.vy = -P.jump * 0.9; p.side = -p.wall; p.ign = 0.16; p.st = 'normal'; p.buf = 0; sfx('Walljump', 0.4);
          this.puff(p.x + p.wall * P.w / 2, p.y, 5);
        }
      }

      // ---- horizontal ----
      if (p.st === 'normal' || p.st === 'long') {
        if (p.g && p.st === 'normal') p.maxS = Math.max(P.maxSpeed, p.maxS - 900 * dt);
        const ms = p.maxS;
        if (p.ign <= 0 && p.stun <= 0 && inX) {
          p.side = inX;
          if (Math.sign(p.vx) !== inX && p.vx !== 0) p.vx += inX * (P.accel + P.decel) * dt;
          else p.vx += inX * P.accel * dt;
          if (Math.abs(p.vx) > ms) p.vx = Math.sign(p.vx) * ms;
        } else if (p.ign <= 0) {
          const dec = p.st === 'long' ? 0 : (p.g ? P.decel : P.decel);
          p.vx = approach(p.vx, 0, dec * dt);
        }
        if (Math.abs(p.vx) > ms) p.vx = Math.sign(p.vx) * ms;
      } else if (p.st === 'slide') {
        p.slideT -= dt; p.vx = approach(p.vx, 0, 260 * dt);
        if ((p.slideT <= 0 || Math.abs(p.vx) < 110) && this.canStand()) { this.setH(P.h); p.st = 'normal'; p.maxS = Math.max(P.maxSpeed, Math.abs(p.vx)); }
        if (!p.g && p.air > 0.06) { p.st = 'dive'; }
      } else if (p.st === 'pound') {
        p.poundT += dt;
        p.vx = 0;
        if (p.poundT < 0.16) { p.vy = -260 * (1 - p.poundT / 0.16); }
        else if (p.vy < 600) p.vy = 600;
      }

      // ---- vertical ----
      const g = p.st === 'pound' && p.poundT >= 0.16 ? P.gravity * 2.2 : (p.st === 'pound' ? 0 : P.gravity);
      p.vy += g * dt;
      const mf = p.st === 'pound' ? 2400 : P.maxFall;
      if (p.vy > mf) p.vy = mf;
      if (!p.g && p.wall && p.vy > 0 && (p.st === 'normal' || p.st === 'long') && inX !== -p.wall) {
        if (p.vy > P.wallSlide) p.vy = approach(p.vy, P.wallSlide, 5000 * dt);
        p.side = p.wall;
        if (Math.random() < 0.08) this.puff(p.x + p.wall * P.w / 2, p.y + p.h / 2 - 6, 1);
      }

      // ---- integrate & collide ----
      const wasG = p.g;
      p.x += p.vx * dt; p.y += p.vy * dt;
      this.collide(wasG && !p.jumped && p.st !== 'pound', dt);
      p.jumped = false;

      // landing transitions
      if (p.g && !wasG) {
        if (p.st === 'dive') { this.startSlide(p.side, Math.abs(p.vx), true); }
        else if (p.st === 'long') { p.st = 'normal'; }
        else if (p.st === 'pound') {
          if (p.gObj && p.gObj.t === 'GroundPoundSolid') { this.breakSolid(p.gObj); p.g = false; p.vy = 700; }
          else { p.st = 'normal'; p.stun = 0.12; sfx('Pound', 0.5); this.shake = 0.15; this.puff(p.x, p.y + p.h / 2, 10); }
        } else if (p.vy > 0 || true) this.puff(p.x, p.y + p.h / 2, 2);
      }
      this.wallCheck();

      // ---- hazards / triggers ----
      this.checkHazards();
      this.checkTriggers(dt);
      if (p.y > L.h + 500) this.die();
      p.anim += dt * (p.g ? Math.abs(p.vx) / 40 : 4);
    }
    setH(h) { const p = this.p; if (p.h === h) return; p.y += (p.h - h) / 2; p.h = h; }
    canStand() {
      const p = this.p; const cy = p.y + p.h / 2 - P.h / 2;
      for (const o of this.level.near(p.x - P.w / 2, cy - P.h / 2, p.x + P.w / 2, cy + P.h / 2)) {
        if (o.gone || !SOLID.has(o.t)) continue;
        const r = satBox(p.x, cy - 1, P.w / 2 - 1, P.h / 2 - 1, o); if (r) return false;
      }
      return true;
    }
    startSlide(dir, speed, fromDive) {
      const p = this.p; p.st = 'slide'; p.side = dir || p.side;
      const sp = fromDive ? Math.max(speed, 300) : Math.max(speed * 1.12, 380);
      p.maxS = Math.max(p.maxS, sp); p.vx = p.side * Math.min(sp, 700); p.slideT = fromDive ? 0.5 : 0.8;
      this.setH(P.hSmall); sfx('Slide', 0.35);
    }
    startDive(dir) {
      const p = this.p; p.st = 'dive'; p.side = dir || p.side;
      const sp = Math.min(660, Math.max(Math.abs(p.vx), P.maxSpeed) * 1.25);
      p.maxS = 660; p.vx = p.side * sp; p.vy = Math.min(p.vy, -P.jump * 0.35);
      this.setH(P.hSmall); sfx('Plunge', 0.4);
    }
    startPound() { const p = this.p; p.st = 'pound'; p.poundT = 0; p.vx = 0; this.setH(P.h); sfx('PrePound', 0.4); }
    breakSolid(o) {
      o.gone = true; sfx('Pound', 0.6); this.shake = 0.2;
      for (let i = 0; i < 16; i++) this.particles.push({ x: o.bb[0] + Math.random() * (o.bb[2] - o.bb[0]), y: o.bb[1] + Math.random() * (o.bb[3] - o.bb[1]), vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 300, life: 0.8, c: '#f80a19', s: 6 });
    }
    collide(snap, dt) {
      const p = this.p, L = this.level;
      p.g = false;
      const hw = P.w / 2;
      for (let it = 0; it < 4; it++) {
        const hh = p.h / 2;
        const list = L.near(p.x - hw - 2, p.y - hh - 2, p.x + hw + 2, p.y + hh + 10);
        let hit = false;
        for (const o of list) {
          if (o.gone || !(SOLID.has(o.t) || JT.has(o.t))) continue;
          if (!bbHit(o.bb, p.x - hw, p.y - hh, p.x + hw, p.y + hh)) continue;
          const r = satBox(p.x, p.y, hw, hh, o); if (!r) continue;
          if (JT.has(o.t)) { if (!(r.ny < -0.5 && p.vy >= -1 && r.d <= Math.max(8, p.vy * dt * 2 + 6))) continue; }
          if (r.ny < -0.55) { // ground: resolve vertically (keeps us still on slopes)
            const d = r.d / -r.ny; if (d > 40) continue;
            p.y -= d + 0.01; if (p.vy > 0) p.vy = 0; p.g = true; p.gObj = o; p.gN = r;
          } else {
            p.x += r.nx * (r.d + 0.01); p.y += r.ny * (r.d + 0.01);
            const vn = p.vx * r.nx + p.vy * r.ny; if (vn < 0) { p.vx -= vn * r.nx; p.vy -= vn * r.ny; }
          }
          hit = true;
        }
        if (!hit) break;
      }
      if (!p.g && snap && p.vy >= 0) { // stick to ground on downhill slopes
        const dy = Math.abs(p.vx) * dt * 1.2 + 2; const oy = p.y; p.y += dy;
        const hh = p.h / 2; let found = false;
        for (const o of L.near(p.x - hw, p.y - hh, p.x + hw, p.y + hh)) {
          if (o.gone || !(SOLID.has(o.t) || JT.has(o.t))) continue;
          const r = satBox(p.x, p.y, hw, hh, o);
          if (r && r.ny < -0.55) { const d = r.d / -r.ny; if (d <= dy + 1) { p.y -= d + 0.01; found = true; p.g = true; p.gObj = o; p.vy = 0; } }
        }
        if (!found) p.y = oy;
      }
    }
    wallCheck() {
      const p = this.p, L = this.level; p.wall = 0;
      if (p.g) return;
      const hw = P.w / 2, hh = p.h / 2 - 6;
      for (const s of [-1, 1]) {
        const cx = p.x + s * 3;
        for (const o of L.near(cx - hw, p.y - hh, cx + hw, p.y + hh)) {
          if (o.gone || !SOLID.has(o.t) || o.t === 'Solid3' && false) continue;
          const r = satBox(cx, p.y, hw, hh, o);
          if (r && Math.abs(r.nx) > 0.7 && Math.sign(r.nx) === -s) { p.wall = s; break; }
        }
        if (p.wall) break;
      }
    }
    checkHazards() {
      const p = this.p, L = this.level, hw = P.w / 2 - 2, hh = p.h / 2 - 2;
      for (const o of L.near(p.x - hw, p.y - hh, p.x + hw, p.y + hh)) {
        if (o.gone || !SPIKE.has(o.t)) continue;
        if (satBox(p.x, p.y, hw, hh, o)) { this.die(); return; }
      }
      for (const r of L.rockets) if (Math.abs(r.x - p.x) < hw + 8 && Math.abs(r.y - p.y) < hh + 6) { r.dead = true; this.explode(r.x, r.y); this.die(); return; }
    }
    checkTriggers(dt) {
      const p = this.p, L = this.level;
      const x0 = p.x - P.w / 2, x1 = p.x + P.w / 2, y0 = p.y - p.h / 2, y1 = p.y + p.h / 2;
      for (const [o, t] of p.boostCd) { if (t - dt <= 0) p.boostCd.delete(o); else p.boostCd.set(o, t - dt); }
      for (const o of L.triggers) {
        if (o.gone) continue;
        if (o.t === 'JumpBoost') {
          if (p.boostCd.has(o)) continue;
          if (Math.hypot(o.x - p.x, o.y - p.y) > 14 + Math.max(P.w / 2, p.h / 2) * 0.9) continue;
          if (!bbHit([o.x - 12, o.y - 12, o.x + 12, o.y + 12], x0, y0, x1, y1)) continue;
          const dx = Math.sin(o.a), dy = -Math.cos(o.a); const mag = P.jump * (0.4 + (o.f || 0.7));
          const along = p.vx * dx + p.vy * dy; p.vx += (mag - along) * dx; p.vy += (mag - along) * dy;
          if (Math.abs(dx) > 0.3) { p.maxS = Math.max(p.maxS, Math.abs(p.vx)); p.ign = 0.1; }
          if (o.dc) { p.st = 'long'; p.maxS = Math.max(p.maxS, Math.abs(p.vx)); }
          if (p.st === 'pound' || p.st === 'slide' || p.st === 'dive') { p.st = 'normal'; this.setH(P.h); }
          p.g = false; p.boostCd.set(o, 0.25); sfx('JumpBoost', 0.45); this.puff(o.x, o.y, 6);
        } else if (o.t === 'Coin') {
          if (bbHit([o.x - 18, o.y - 18, o.x + 18, o.y + 18], x0, y0, x1, y1)) { o.gone = true; this.coinGot = true; sfx('coin1', 0.5); this.puff(o.x, o.y, 12, '#000'); }
        } else if (o.t === 'EndFlag') {
          if (bbHit([o.x - 30, o.bb[1], o.x + 30, o.bb[3]], x0, y0, x1, y1)) this.win();
        } else if (o.t === 'ButtonTrigger') {
          if (!o.pressed && bbHit(o.bb, x0, y0, x1, y1)) { o.pressed = true; L.trigger(o.id); sfx('Button', 0.5); }
        } else if (o.t === 'Portal') {
          if (p.portalCd > 0) continue;
          const r = satBox(p.x, p.y, P.w / 2, p.h / 2, o); if (!r) continue;
          const out = L.portals.find(q => q.id === o.tg && q !== o); if (!out) continue;
          let sp = Math.hypot(p.vx, p.vy);
          let ang;
          if (o.fa) ang = o.fan * D2R; else ang = Math.atan2(p.vy, p.vx) + (out.a - o.a) + (o.inv ? Math.PI : 0);
          if (o.fs) sp = o.fsp;
          // exit on the side of out-portal the velocity points to
          const nx = Math.cos(out.a), ny = Math.sin(out.a);
          let vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp;
          let sgn = vx * nx + vy * ny >= 0 ? 1 : -1;
          p.x = out.x + nx * sgn * 26; p.y = out.y + ny * sgn * 26;
          p.vx = vx; p.vy = vy; p.maxS = Math.max(p.maxS, Math.abs(vx)); if (p.st === 'normal' && Math.abs(vx) > P.maxSpeed) p.st = 'long';
          p.portalCd = 0.25; sfx('Transition', 0.3);
        }
      }
    }
    stepLaunchers(dt) {
      const L = this.level, p = this.p;
      for (const o of L.launchers) {
        if (!o.on) continue;
        const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy);
        if (d < 520 && !p.dead) {
          const want = Math.atan2(dy, dx); o.aim += clampA(angDiff(want, o.aim), Math.PI * dt);
          o.cool -= dt;
          if (o.cool <= 0) { o.cool = 2; const sp = o.sp > 0 ? o.sp : 180; L.rockets.push({ x: o.x + Math.cos(o.aim) * 30, y: o.y + Math.sin(o.aim) * 30, a: o.aim, sp, life: 7 }); sfx('Rocket-2', 0.25); }
        }
      }
      for (const r of L.rockets) {
        if (!p.dead) r.a += clampA(angDiff(Math.atan2(p.y - r.y, p.x - r.x), r.a), Math.PI * dt);
        r.x += Math.cos(r.a) * r.sp * dt; r.y += Math.sin(r.a) * r.sp * dt; r.life -= dt;
        if (Math.random() < 0.3) this.particles.push({ x: r.x - Math.cos(r.a) * 14, y: r.y - Math.sin(r.a) * 14, vx: 0, vy: 0, life: 0.4, c: '#999', s: 4 });
        for (const o of L.near(r.x - 4, r.y - 4, r.x + 4, r.y + 4)) {
          if (!o.gone && SOLID.has(o.t) && satBox(r.x, r.y, 4, 4, o)) { r.dead = true; this.explode(r.x, r.y); break; }
        }
        if (r.life <= 0) { r.dead = true; this.explode(r.x, r.y); }
      }
      L.rockets = L.rockets.filter(r => !r.dead);
    }
    explode(x, y) { for (let i = 0; i < 12; i++) this.particles.push({ x, y, vx: (Math.random() - 0.5) * 400, vy: (Math.random() - 0.5) * 400, life: 0.5, c: i % 2 ? '#f80a19' : '#000', s: 5 }); }
    puff(x, y, n, c) { for (let i = 0; i < n; i++) this.particles.push({ x, y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 120, life: 0.35 + Math.random() * 0.2, c: c || '#000', s: 3 }); }
    stepParticles(dt) {
      for (const q of this.particles) { q.vy += (q.g || 600) * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; if (q.rs) q.r += q.rs * dt; }
      this.particles = this.particles.filter(q => q.life > 0);
    }
    die() {
      const p = this.p; if (p.dead || this.won) return;
      p.dead = 0.7; this.deaths++; sfx('Death', 0.5); this.shake = 0.25;
      // body parts fly off like the original ragdoll
      const parts = [[0, -20, 'head'], [0, 0, 'line'], [-6, 8, 'line'], [6, 8, 'line'], [-8, -6, 'line'], [8, -6, 'line']];
      for (const [ox, oy, k] of parts) this.particles.push({ x: p.x + ox, y: p.y + oy, vx: p.vx * 0.4 + (Math.random() - 0.5) * 500, vy: p.vy * 0.3 - 200 - Math.random() * 300, life: 1.2, c: '#000', s: 4, kind: k, r: 0, rs: (Math.random() - 0.5) * 20, g: 1500 });
      if (this.onDeath) this.onDeath();
    }
    win() {
      if (this.won) return; this.won = true; sfx('Transition', 0.5);
      for (let i = 0; i < 30; i++) this.particles.push({ x: this.p.x, y: this.p.y, vx: (Math.random() - 0.5) * 600, vy: -Math.random() * 600, life: 1.2, c: '#000', s: 4 });
      if (this.onWin) setTimeout(() => this.onWin({ time: this.time, deaths: this.deaths, coin: this.coinGot }), 650);
    }

    // ---------- rendering ----------
    viewScale() {
      const W = this.cv.width, H = this.cv.height;
      return Math.min(H / (this.viewH || 620), W / 760);
    }
    render(dt) {
      const cv = this.cv, ctx = this.ctx;
      const W = cv.width, H = cv.height;
      if (!this.level) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); return; }
      const L = this.level, p = this.p;
      const s = this.viewScale(); const vw = W / s, vh = H / s;
      // camera
      if (!p.dead) {
        const tx = p.x + p.vx * 0.22, ty = p.y + Math.max(-60, Math.min(80, p.vy * 0.08));
        const k = 1 - Math.exp(-dt * 7);
        this.cam.x += (tx - this.cam.x) * k; this.cam.y += (ty - this.cam.y) * k;
      }
      let cx = this.cam.x, cy = this.cam.y;
      const m = 40;
      cx = L.w + 2 * m > vw ? Math.max(vw / 2 - m, Math.min(L.w + m - vw / 2, cx)) : L.w / 2;
      cy = L.h + 2 * m > vh ? Math.max(vh / 2 - m, Math.min(L.h + m - vh / 2, cy)) : L.h / 2;
      if (this.shake > 0) { this.shake -= dt; cx += (Math.random() - 0.5) * 10; cy += (Math.random() - 0.5) * 10; }
      this.camView = { cx, cy, s, vw, vh };
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = L.bg; ctx.fillRect(0, 0, W, H);
      ctx.setTransform(s, 0, 0, s, W / 2 - cx * s, H / 2 - cy * s);
      ctx.imageSmoothingEnabled = false;
      const vx0 = cx - vw / 2 - 64, vy0 = cy - vh / 2 - 64, vx1 = cx + vw / 2 + 64, vy1 = cy + vh / 2 + 64;
      // outside-of-level shade
      ctx.fillStyle = 'rgba(0,0,0,0.035)';
      ctx.fillRect(vx0, vy0, vx1 - vx0, Math.max(0, -vy0));
      for (const o of L.objs) {
        if (o.gone || o.inv && o.t !== 'Portal') continue;
        if (!o.bb || !bbHit(o.bb, vx0, vy0, vx1, vy1)) { if (o.bb || !o.tx) continue; }
        this.drawObj(ctx, o);
      }
      for (const r of L.rockets) { ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.a); ctx.drawImage(IMG.rocket, -16, -8); ctx.restore(); }
      if (!p.dead && !(this.won && this.p)) this.drawPlayer(ctx, p);
      else if (this.won) this.drawPlayer(ctx, p);
      for (const q of this.particles) {
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
        case 'Solid': case 'UnmovableSolid': ctx.fillStyle = '#000'; ctx.fillRect(ox, oy, o.w, o.h); break;
        case 'Solid2': ctx.fillStyle = '#fff'; ctx.fillRect(ox, oy, o.w, o.h); break;
        case 'SolidMove': ctx.fillStyle = '#ff0000'; ctx.fillRect(ox, oy, o.w, o.h); break;
        case 'GroundPoundSolid': ctx.fillStyle = '#f80a19'; ctx.fillRect(ox, oy, o.w, o.h); ctx.fillStyle = 'rgba(255,255,255,.35)';
          for (let x = ox + 4; x < ox + o.w; x += 12) ctx.fillRect(x, oy + 2, 4, Math.max(2, o.h - 4)); break;
        case 'JumpThrough': case 'UnmovableJumpThrough': ctx.fillStyle = '#000'; ctx.fillRect(ox, oy, o.w, 2);
          for (let y = oy + 3; y < oy + o.h; y += 3) ctx.fillRect(ox, y, o.w, 1); break;
        case 'Spike': ctx.drawImage(IMG.spike, ox, oy, o.w, o.h); break;
        case 'Spike2': ctx.drawImage(IMG.spike2, ox, oy, o.w, o.h); break;
        case 'JumpBoost': ctx.drawImage(IMG.boost, ox, oy, o.w, o.h); break;
        case 'Coin': { const b = Math.sin(this.level.time * 3) * 4; ctx.drawImage(IMG.coin, ox, oy + b, o.w, o.h); break; }
        case 'EndFlag': ctx.drawImage(IMG.flag, ox, oy, o.w, o.h); break;
        case 'RocketLauncher': ctx.restore(); ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.aim); ctx.drawImage(IMG.launcher, -o.hx * o.w, -o.hy * o.h, o.w, o.h); break;
        case 'ButtonTrigger': if (!o.inv) ctx.drawImage(o.pressed ? IMG.button_on : IMG.button, ox, oy, o.w, o.h); break;
        case 'Portal': { ctx.fillStyle = 'hsl(' + ((o.id * 67) % 360) + ',85%,55%)'; ctx.fillRect(ox, oy, o.w, o.h); ctx.globalAlpha = 0.25; ctx.fillRect(ox - 6, oy, o.w + 12, o.h); break; }
        case 'Tiledbackground': ctx.fillStyle = 'rgba(242,12,25,0.08)'; ctx.fillRect(ox, oy, o.w, o.h); break;
        case 'SpriteFontDeluxe': case 'SpriteFontDeluxeW': case 'Text': {
          const sc = o.sc || 1, fs = 15 * sc;
          ctx.fillStyle = t === 'SpriteFontDeluxeW' ? '#fff' : (o.col || '#000'); ctx.font = fs + 'px Retron, monospace'; ctx.textBaseline = 'top';
          const al = o.al == null ? 50 : o.al; ctx.textAlign = al < 25 ? 'left' : al > 75 ? 'right' : 'center';
          const x = al < 25 ? ox : al > 75 ? ox + o.w : ox + o.w / 2;
          wrapText(ctx, o.tx || '', x, oy, o.w, fs * 1.25);
          break;
        }
        case 'LayoutNumber': ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.font = (16 * (o.sc || 1)) + 'px Retron, monospace'; ctx.textBaseline = 'top'; ctx.textAlign = 'left'; ctx.fillText(String(this.def && typeof this.def.n === 'number' ? this.def.n : o.tx), ox, oy); break;
      }
      ctx.restore();
    }
    drawPlayer(ctx, p) {
      ctx.save();
      const feet = p.y + p.h / 2;
      ctx.translate(p.x, feet); ctx.scale(p.side, 1);
      ctx.strokeStyle = '#000'; ctx.fillStyle = '#000'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const t = p.anim, run = p.g && Math.abs(p.vx) > 20;
      const line = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
      if (p.st === 'slide' || p.st === 'dive') {
        // body horizontal
        const lean = p.st === 'dive' ? -6 : 0;
        ctx.beginPath(); ctx.arc(16, -12 + lean, 8, 0, 7); ctx.fill();
        line([8, -10 + lean, -12, -8]);
        line([-12, -8, -24, -4]); line([-12, -8, -22, -12]);
        line([4, -10 + lean, 20, -2]); line([2, -10 + lean, 18, -20 + lean]);
      } else if (p.st === 'pound') {
        ctx.beginPath(); ctx.arc(0, -46, 9, 0, 7); ctx.fill();
        line([0, -36, 0, -22]); line([0, -22, -10, -14, -4, -4]); line([0, -22, 10, -14, 4, -4]);
        line([0, -32, -12, -40]); line([0, -32, 12, -40]);
      } else if (!p.g && p.wall && p.vy > 0) {
        ctx.scale(-1, 1);
        ctx.beginPath(); ctx.arc(-2, -46, 9, 0, 7); ctx.fill();
        line([0, -36, 2, -20]); line([2, -20, -6, -10, -8, 0]); line([2, -20, 10, -10, 8, -2]);
        line([0, -32, -10, -44]); line([0, -32, 10, -26]);
      } else {
        const sw = run ? Math.sin(t) : (p.g ? 0 : 0.6);
        const sw2 = run ? Math.cos(t) : 0;
        const bob = run ? Math.abs(Math.cos(t)) * 2 : 0;
        const lean = run ? Math.min(6, Math.abs(p.vx) / 60) : 0;
        ctx.beginPath(); ctx.arc(lean, -46 - bob, 9, 0, 7); ctx.fill();
        line([lean, -36 - bob, 0, -22 - bob]);
        if (p.g) {
          line([0, -22 - bob, 8 * sw, -11 + 3 * Math.max(0, -sw2), 12 * sw, 0]);
          line([0, -22 - bob, -8 * sw, -11 + 3 * Math.max(0, sw2), -12 * sw, 0]);
        } else {
          line([0, -22, 8, -14, 6, -4]); line([0, -22, -6, -12, -12, -8]);
        }
        const aSw = run ? sw * 10 : (p.g ? 2 : -8);
        line([lean * 0.7, -32 - bob, -aSw, -22 - bob]); line([lean * 0.7, -32 - bob, aSw, -22 - bob + (p.g ? 0 : -14)]);
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
})();
