/* OvO Web — custom level format + level editor */
(function () {
  'use strict';
  const GRID = 16;

  // type -> default size / hotspot / editor behaviour
  const TYPES = {
    Solid:            { w: 16, h: 16, hx: 0, hy: 0, kind: 'rect', label: 'Block' },
    JumpThrough:      { w: 64, h: 8, hx: 0, hy: 0, kind: 'rect', fixedH: 8, label: 'Platform' },
    GroundPoundSolid: { w: 64, h: 16, hx: 0, hy: 0, kind: 'rect', label: 'Breakable' },
    Solid2:           { w: 16, h: 16, hx: 0, hy: 0, kind: 'rect', label: 'White block' },
    Spike:            { w: 32, h: 32, hx: .5, hy: .5, kind: 'sprite', rot: 1, row: 1, label: 'Spike' },
    JumpBoost:        { w: 32, h: 32, hx: .5, hy: .5, kind: 'sprite', rot: 1, label: 'Boost' },
    Portal:           { w: 8, h: 64, hx: .5, hy: .5, kind: 'sprite', rot: 1, label: 'Portal' },
    Coin:             { w: 64, h: 64, hx: .5, hy: .5, kind: 'sprite', unique: 1, label: 'Coin' },
    Collider:         { w: 32, h: 64, hx: .5, hy: .5, kind: 'sprite', unique: 1, label: 'Start' },
    EndFlag:          { w: 97, h: 199, hx: .525, hy: .497, kind: 'sprite', unique: 1, label: 'Flag' },
    Text:             { w: 288, h: 40, hx: 0, hy: 0, kind: 'text', label: 'Text' },
  };
  const TOOL_ORDER = ['Solid', 'JumpThrough', 'Spike', 'JumpBoost', 'GroundPoundSolid', 'Portal', 'Coin', 'EndFlag', 'Collider', 'Text', 'Solid2', 'move', 'erase', 'pan'];

  // ---------- format ----------
  // stored: { v:1, name, w, h, objs:[[type, x, y, w, h, angleDeg, extra?]] }
  function toDef(data) {
    let maxX = 640, maxY = 480;
    const objs = data.objs.map(r => {
      const [t, x, y, w, h, a, ex] = r; const T = TYPES[t] || TYPES.Solid;
      maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
      const e = Object.assign({}, ex || {});
      if (t === 'Text') { e.tx = e.tx || ''; e.sc = e.sc || 1; e.al = e.al == null ? 50 : e.al; }
      if (t === 'JumpBoost') { e.f = e.f || 0.7; }
      if (t === 'Portal') { e.id = e.id || 0; e.tg = e.tg == null ? (e.id ^ 1) : e.tg; }
      const type = t === 'Text' ? 'SpriteFontDeluxe' : t;
      return [type, x, y, w, h, T.hx, T.hy, a || 0, e];
    });
    const w = Math.max(data.w || 0, Math.ceil((maxX + 160) / 32) * 32), h = Math.max(data.h || 0, Math.ceil((maxY + 96) / 32) * 32);
    if (!objs.some(o => o[0] === 'Collider')) objs.push(['Collider', 96, 64, 32, 64, .5, .5, 0, {}]);
    return { n: 'custom', w, h, bg: '255,255,255', objs, name: data.name };
  }

  function encode(data) {
    const json = JSON.stringify({ v: 1, name: data.name, author: data.author || '', objs: data.objs });
    return 'OVO1-' + btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(code) {
    code = String(code).trim();
    if (code.startsWith('{')) return sanitize(JSON.parse(code));
    const m = code.match(/OVO1-([A-Za-z0-9_\-]+)/); if (!m) throw new Error('Not an OvO level code');
    let b = m[1].replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
    return sanitize(JSON.parse(decodeURIComponent(escape(atob(b)))));
  }
  function sanitize(d) {
    if (!d || !Array.isArray(d.objs)) throw new Error('Invalid level');
    const objs = d.objs.filter(r => Array.isArray(r) && TYPES[r[0]]).slice(0, 5000).map(r => {
      const o = [r[0], +r[1] || 0, +r[2] || 0, Math.max(1, Math.min(20000, +r[3] || 16)), Math.max(1, Math.min(20000, +r[4] || 16)), +r[5] || 0];
      if (r[6] && typeof r[6] === 'object') {
        const e = {}; const x = r[6];
        if (typeof x.tx === 'string') e.tx = x.tx.slice(0, 200);
        ['id', 'tg', 'f', 'sc', 'al'].forEach(k => { if (typeof x[k] === 'number') e[k] = x[k]; });
        o.push(e);
      }
      return o;
    });
    return { v: 1, name: String(d.name || 'Untitled').slice(0, 40), author: String(d.author || '').slice(0, 30), objs };
  }

  // ---------- drawing helpers ----------
  const fakeGame = { level: { time: 0 } };
  function engineObj(r) { const d = toDef({ objs: [r] }); const o = OvO.makeObj(d.objs[0]); OvO.updatePoly(o); return o; }
  function drawData(ctx, data, opts) {
    fakeGame.level.time = performance.now() / 1000;
    const def = toDef(data);
    for (const r of def.objs) {
      const o = OvO.makeObj(r);
      if (o.t === 'Collider') { drawStart(ctx, o); continue; }
      OvO.Game.prototype.drawObj.call(fakeGame, ctx, o);
      if (o.t === 'Portal' && opts && opts.labels) { ctx.fillStyle = '#000'; ctx.font = '12px Retron, monospace'; ctx.textAlign = 'center'; ctx.fillText(String(o.id), o.x, o.y - 40); }
    }
  }
  function drawStart(ctx, o) {
    ctx.save(); ctx.translate(o.x, o.y + 32); ctx.strokeStyle = '#000'; ctx.fillStyle = '#000'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -46, 9, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(0, -22); ctx.lineTo(-8, 0); ctx.moveTo(0, -22); ctx.lineTo(8, 0); ctx.moveTo(-9, -24); ctx.lineTo(0, -32); ctx.lineTo(9, -24); ctx.stroke();
    ctx.restore();
  }
  function thumb(cv, data) {
    const def = toDef(data); const r = cv.getBoundingClientRect();
    const W = cv.width = Math.round((r.width || 240) * 1.5), H = cv.height = Math.round((r.height || 110) * 1.5);
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    const s = Math.min(W / def.w, H / def.h);
    ctx.setTransform(s, 0, 0, s, (W - def.w * s) / 2, (H - def.h * s) / 2);
    drawData(ctx, data);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  function toolIcon(t) {
    const c = document.createElement('canvas'); c.width = 60; c.height = 60; const ctx = c.getContext('2d');
    const icons = {
      move: () => { ctx.font = '40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✥', 30, 32); },
      erase: () => { ctx.strokeStyle = '#f80a19'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(14, 14); ctx.lineTo(46, 46); ctx.moveTo(46, 14); ctx.lineTo(14, 46); ctx.stroke(); },
      pan: () => { ctx.font = '38px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✋', 30, 32); },
    };
    if (icons[t]) { icons[t](); return c; }
    const T = TYPES[t]; const r = [t, 0, 0, T.w, T.h, 0, t === 'Text' ? { tx: 'Aa', sc: 2.4 } : t === 'Portal' ? { id: 0 } : undefined];
    if (t === 'Solid' || t === 'GroundPoundSolid' || t === 'Solid2') { r[3] = 48; r[4] = 24; }
    if (t === 'JumpThrough') { r[3] = 48; }
    if (t === 'Text') { r[3] = 60; }
    const o = engineObj(r); const b = o.bb, bw = b[2] - b[0], bh = b[3] - b[1];
    const s = Math.min(48 / bw, 48 / bh, 1.5);
    ctx.translate(30 - (b[0] + bw / 2) * s, 30 - (b[1] + bh / 2) * s); ctx.scale(s, s);
    if (t === 'Solid2') { ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(0, 0, 48, 24); }
    if (t === 'Collider') drawStart(ctx, o); else OvO.Game.prototype.drawObj.call(fakeGame, ctx, o);
    return c;
  }

  // ---------- editor ----------
  class Editor {
    constructor() {
      this.cv = document.getElementById('editor'); this.ctx = this.cv.getContext('2d');
      this.ui = document.getElementById('scrEditor');
      this.tool = 'Solid'; this.rot = 0; this.cam = { x: 400, y: 300, z: 1 };
      this.ptrs = new Map(); this.undo = [];
      this.active = false;
      this.buildToolbar(); this.bind();
      this.loop = this.loop.bind(this);
    }
    buildToolbar() {
      const bar = document.getElementById('edTools'); bar.innerHTML = '';
      for (const t of TOOL_ORDER) {
        const b = document.createElement('button'); b.dataset.tool = t;
        b.appendChild(toolIcon(t));
        const s = document.createElement('span'); s.textContent = TYPES[t] ? TYPES[t].label : ({ move: 'Move', erase: 'Erase', pan: 'Pan' })[t]; b.appendChild(s);
        b.onclick = () => this.setTool(t); bar.appendChild(b);
      }
    }
    setTool(t) {
      this.tool = t;
      document.querySelectorAll('#edTools button').forEach(b => b.classList.toggle('sel', b.dataset.tool === t));
      const hints = {
        Solid: 'Drag to draw a block', JumpThrough: 'Drag to draw a jump-through platform', GroundPoundSolid: 'Drag to draw — break it with a ground pound',
        Solid2: 'White block (use on top of black blocks)', Spike: 'Tap to place · drag for a row · ⟳ rotates', JumpBoost: 'Tap to place · ⟳ sets direction',
        Portal: 'Place two portals — they link automatically', Coin: 'One coin per level', EndFlag: 'Touch the flag to finish', Collider: 'Where the player spawns',
        Text: 'Tap to add a sign', move: 'Drag an object to move it', erase: 'Tap or drag over objects to delete', pan: 'Drag to move around (two fingers work in any tool)',
      };
      this.hint(hints[t] || '');
    }
    hint(s) { document.getElementById('edHint').textContent = s; }
    open(data, cb) {
      this.data = JSON.parse(JSON.stringify(data)); this.cb = cb; this.undo = [];
      document.getElementById('edName').value = this.data.name || '';
      this.cv.hidden = false; this.ui.hidden = false; this.active = true; this.resize();
      // frame the level
      if (!this._keepCam) {
        const def = toDef(this.data); const z = Math.min(this.cv.width / (def.w + 100), this.cv.height / (def.h + 200), 1.4 * devicePixelRatio);
        this.cam = { x: def.w / 2, y: def.h / 2, z: Math.max(0.35 * devicePixelRatio, z) };
      }
      this._keepCam = false;
      this.setTool(this.tool); this.updateRot();
      requestAnimationFrame(this.loop);
    }
    close() { this.active = false; this.cv.hidden = true; this.ui.hidden = true; }
    resize() { const d = devicePixelRatio || 1; this.cv.width = Math.round(innerWidth * d); this.cv.height = Math.round(innerHeight * d); }
    snapshot() { this.undo.push(JSON.stringify(this.data.objs)); if (this.undo.length > 80) this.undo.shift(); }
    doUndo() { const s = this.undo.pop(); if (s) this.data.objs = JSON.parse(s); }
    updateRot() { document.getElementById('edRotVal').textContent = this.rot + '°'; }
    toWorld(cx, cy) { const d = devicePixelRatio || 1; return [(cx * d - this.cv.width / 2) / this.cam.z + this.cam.x, (cy * d - this.cv.height / 2) / this.cam.z + this.cam.y]; }
    snap(v) { return Math.round(v / GRID) * GRID; }
    hitTest(wx, wy) {
      for (let i = this.data.objs.length - 1; i >= 0; i--) {
        const o = engineObj(this.data.objs[i]); const b = o.bb;
        if (wx >= b[0] - 4 && wx <= b[2] + 4 && wy >= b[1] - 4 && wy <= b[3] + 4) return i;
      }
      return -1;
    }
    bind() {
      const cv = this.cv;
      cv.addEventListener('pointerdown', e => this.pdown(e));
      cv.addEventListener('pointermove', e => this.pmove(e));
      cv.addEventListener('pointerup', e => this.pup(e));
      cv.addEventListener('pointercancel', e => this.pup(e, true));
      cv.addEventListener('wheel', e => { e.preventDefault(); const [wx, wy] = this.toWorld(e.clientX, e.clientY); this.zoomAt(wx, wy, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
      cv.addEventListener('contextmenu', e => e.preventDefault());
      addEventListener('resize', () => this.active && this.resize());
      document.getElementById('edZoomIn').onclick = () => this.zoomAt(this.cam.x, this.cam.y, 1.25);
      document.getElementById('edZoomOut').onclick = () => this.zoomAt(this.cam.x, this.cam.y, 0.8);
      document.getElementById('edRotate').onclick = () => { this.rot = (this.rot + 90) % 360; this.updateRot(); };
      document.getElementById('edUndo').onclick = () => this.doUndo();
      document.getElementById('edName').oninput = e => { this.data.name = e.target.value; };
      document.getElementById('edSave').onclick = () => this.cb.save(this.data);
      document.getElementById('edTest').onclick = () => { this._keepCam = true; this.cb.test(this.data); };
      document.getElementById('edBack').onclick = () => this.cb.exit(this.data);
      document.getElementById('edMore').onclick = () => this.cb.more(this.data);
      addEventListener('keydown', e => {
        if (!this.active || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key === 'q' || e.key === 'Q') { this.rot = (this.rot + 90) % 360; this.updateRot(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); this.doUndo(); }
        const n = parseInt(e.key); if (n >= 1 && n <= 9) this.setTool(TOOL_ORDER[n - 1]);
        if (e.key === 'e') this.setTool('erase');
      });
    }
    zoomAt(wx, wy, f) {
      const d = devicePixelRatio || 1; const z = Math.max(0.15 * d, Math.min(4 * d, this.cam.z * f)); f = z / this.cam.z;
      this.cam.x = wx - (wx - this.cam.x) / f; this.cam.y = wy - (wy - this.cam.y) / f; this.cam.z = z;
    }
    pdown(e) {
      this.cv.setPointerCapture(e.pointerId);
      this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.ptrs.size === 2) { // start pinch: cancel current action
        if (this.act && this.act.snap) this.data.objs = JSON.parse(this.act.snap);
        this.act = { type: 'pinch' }; this.pinchPrev = this.pinchInfo(); return;
      }
      if (this.ptrs.size > 2) return;
      const [wx, wy] = this.toWorld(e.clientX, e.clientY);
      const t = (e.button === 1 || e.button === 2) ? 'pan' : this.tool;
      if (t === 'pan') { this.act = { type: 'pan', lx: e.clientX, ly: e.clientY }; return; }
      const snap = JSON.stringify(this.data.objs);
      if (t === 'erase') { this.act = { type: 'erase', snap, did: false }; this.eraseAt(wx, wy); return; }
      if (t === 'move') {
        const i = this.hitTest(wx, wy); if (i < 0) { this.act = { type: 'pan', lx: e.clientX, ly: e.clientY }; return; }
        const r = this.data.objs.splice(i, 1)[0]; this.data.objs.push(r);
        this.act = { type: 'move', snap, r, ox: r[1] - wx, oy: r[2] - wy }; return;
      }
      const T = TYPES[t];
      if (T.kind === 'rect') { const x = Math.floor(wx / GRID) * GRID, y = Math.floor(wy / GRID) * GRID; this.act = { type: 'rect', snap, t, x0: x, y0: y, x1: x + GRID, y1: y + GRID }; this.previewRect(wx, wy); }
      else if (T.kind === 'text') {
        this.act = null;
        this.cb.prompt('Sign text', '', txt => { if (!txt) return; this.undo.push(snap); this.data.objs.push(['Text', this.snap(wx - 144), this.snap(wy), 288, 40, 0, { tx: txt, sc: 1, al: 50 }]); });
      } else {
        this.act = { type: 'sprite', snap, t, placed: new Set() }; this.placeSprite(t, wx, wy);
      }
    }
    pinchInfo() { const [a, b] = [...this.ptrs.values()]; return { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) }; }
    pmove(e) {
      if (!this.ptrs.has(e.pointerId)) { this.hover = this.toWorld(e.clientX, e.clientY); return; }
      const prev = this.ptrs.get(e.pointerId); this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.hover = this.toWorld(e.clientX, e.clientY);
      const a = this.act; if (!a) return;
      const d = devicePixelRatio || 1;
      if (a.type === 'pinch' && this.ptrs.size >= 2) {
        const p = this.pinchInfo(), q = this.pinchPrev;
        this.cam.x -= (p.cx - q.cx) * d / this.cam.z; this.cam.y -= (p.cy - q.cy) * d / this.cam.z;
        const [wx, wy] = this.toWorld(p.cx, p.cy); if (q.d > 10) this.zoomAt(wx, wy, p.d / q.d);
        this.pinchPrev = p; return;
      }
      const [wx, wy] = this.toWorld(e.clientX, e.clientY);
      if (a.type === 'pan') { this.cam.x -= (e.clientX - a.lx) * d / this.cam.z; this.cam.y -= (e.clientY - a.ly) * d / this.cam.z; a.lx = e.clientX; a.ly = e.clientY; }
      else if (a.type === 'rect') this.previewRect(wx, wy);
      else if (a.type === 'sprite' && TYPES[a.t].row) this.placeSprite(a.t, wx, wy);
      else if (a.type === 'erase') this.eraseAt(wx, wy);
      else if (a.type === 'move') { a.r[1] = Math.max(0, this.snap(wx + a.ox)); a.r[2] = Math.max(0, this.snap(wy + a.oy)); a.moved = true; }
    }
    pup(e, cancel) {
      this.ptrs.delete(e.pointerId);
      const a = this.act;
      if (a && a.type === 'pinch') { if (this.ptrs.size === 0) this.act = null; return; }
      if (!a) return;
      if (a.type === 'rect' && !cancel) {
        const T = TYPES[a.t]; let x = Math.min(a.x0, a.x1), y = Math.min(a.y0, a.y1), w = Math.abs(a.x1 - a.x0), h = Math.abs(a.y1 - a.y0);
        if (T.fixedH) h = T.fixedH;
        if (w >= 8 && h >= 4 && x >= 0 && y >= 0) { this.undo.push(a.snap); this.data.objs.push([a.t, x, y, w, h, 0]); }
      }
      if ((a.type === 'sprite' && a.placed.size) || (a.type === 'erase' && a.did) || (a.type === 'move' && a.moved)) this.undo.push(a.snap);
      this.act = null; this.rectPrev = null;
    }
    previewRect(wx, wy) {
      const a = this.act; const x = Math.floor(wx / GRID) * GRID, y = Math.floor(wy / GRID) * GRID;
      a.x1 = x >= a.x0 ? x + GRID : x; a.y1 = y >= a.y0 ? y + GRID : y;
      if (a.x1 === a.x0) a.x1 += GRID; if (a.y1 === a.y0) a.y1 += GRID;
    }
    placeSprite(t, wx, wy) {
      const T = TYPES[t], a = this.act;
      const step = t === 'Spike' ? 32 : GRID;
      let x = Math.round(wx / step) * step, y = Math.round(wy / step) * step;
      if (t === 'Spike') { x = Math.floor(wx / 32) * 32 + 16; y = Math.floor(wy / 32) * 32 + 16; }
      if (x < 0 || y < 0) return;
      const key = x + ',' + y; if (a.placed.has(key)) return; a.placed.add(key);
      if (T.unique) this.data.objs = this.data.objs.filter(r => r[0] !== t);
      // don't stack identical sprites
      this.data.objs = this.data.objs.filter(r => !(r[0] === t && r[1] === x && r[2] === y));
      const ex = t === 'Portal' ? (() => { const n = this.data.objs.filter(r => r[0] === 'Portal').length; return { id: n, tg: n ^ 1 }; })() : undefined;
      const r = [t, x, y, T.w, T.h, T.rot ? this.rot : 0]; if (ex) r.push(ex);
      this.data.objs.push(r);
    }
    eraseAt(wx, wy) { const i = this.hitTest(wx, wy); if (i >= 0) { this.data.objs.splice(i, 1); this.act.did = true; } }
    loop() {
      if (!this.active) return;
      requestAnimationFrame(this.loop);
      const ctx = this.ctx, W = this.cv.width, H = this.cv.height, c = this.cam;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#eee'; ctx.fillRect(0, 0, W, H);
      ctx.setTransform(c.z, 0, 0, c.z, W / 2 - c.x * c.z, H / 2 - c.y * c.z);
      const def = toDef(this.data);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, def.w, def.h);
      // grid
      const x0 = Math.max(0, Math.floor((c.x - W / 2 / c.z) / 32) * 32), x1 = c.x + W / 2 / c.z, y0 = Math.max(0, Math.floor((c.y - H / 2 / c.z) / 32) * 32), y1 = c.y + H / 2 / c.z;
      ctx.lineWidth = 1 / c.z; ctx.strokeStyle = 'rgba(0,0,0,0.07)'; ctx.beginPath();
      for (let x = x0; x <= Math.min(x1, def.w); x += 32) { ctx.moveTo(x, Math.max(0, y0)); ctx.lineTo(x, Math.min(y1, def.h)); }
      for (let y = y0; y <= Math.min(y1, def.h); y += 32) { ctx.moveTo(Math.max(0, x0), y); ctx.lineTo(Math.min(x1, def.w), y); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2 / c.z; ctx.setLineDash([8 / c.z, 6 / c.z]); ctx.strokeRect(0, 0, def.w, def.h); ctx.setLineDash([]);
      ctx.imageSmoothingEnabled = false;
      drawData(ctx, this.data, { labels: true });
      const a = this.act;
      if (a && a.type === 'rect') {
        const T = TYPES[a.t]; const x = Math.min(a.x0, a.x1), y = Math.min(a.y0, a.y1), w = Math.abs(a.x1 - a.x0), h = T.fixedH || Math.abs(a.y1 - a.y0);
        ctx.globalAlpha = 0.5; drawData(ctx, { objs: [[a.t, x, y, w, h, 0]] }); ctx.globalAlpha = 1;
        ctx.strokeStyle = '#2a7cff'; ctx.lineWidth = 2 / c.z; ctx.strokeRect(x, y, w, h);
      } else if (this.hover && !a && TYPES[this.tool] && TYPES[this.tool].kind === 'sprite' && matchMedia('(hover:hover)').matches) {
        const T = TYPES[this.tool]; let [wx, wy] = this.hover;
        let x = Math.round(wx / GRID) * GRID, y = Math.round(wy / GRID) * GRID;
        if (this.tool === 'Spike') { x = Math.floor(wx / 32) * 32 + 16; y = Math.floor(wy / 32) * 32 + 16; }
        ctx.globalAlpha = 0.35; drawData(ctx, { objs: [[this.tool, x, y, T.w, T.h, T.rot ? this.rot : 0, this.tool === 'Portal' ? { id: 0 } : undefined]] }); ctx.globalAlpha = 1;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  window.OvOEditor = { TYPES, toDef, encode, decode, sanitize, thumb, Editor };
})();
