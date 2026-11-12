/* OvO Web — custom level format + Geometry Dash–style level editor */
(function () {
  'use strict';
  const GRID = 16, D2R = Math.PI / 180;

  // type -> default size / hotspot
  const TYPES = {
    Solid:            { w: 32, h: 32, hx: 0, hy: 0, label: 'Block' },
    Solid2:           { w: 32, h: 32, hx: 0, hy: 0, label: 'White block' },
    SolidMove:        { w: 32, h: 32, hx: 0, hy: 0, label: 'Red block' },
    JumpThrough:      { w: 64, h: 8, hx: 0, hy: 0, label: 'Platform' },
    GroundPoundSolid: { w: 64, h: 16, hx: 0, hy: 0, label: 'Breakable' },
    Tiledbackground:  { w: 128, h: 128, hx: 0, hy: 0, label: 'Gravity zone' },
    Spike:            { w: 32, h: 32, hx: .5, hy: .5, label: 'Spike' },
    Spike2:           { w: 32, h: 32, hx: .5, hy: .5, label: 'White spike' },
    JumpBoost:        { w: 32, h: 32, hx: .5, hy: .5, label: 'Boost' },
    Portal:           { w: 8, h: 64, hx: .5, hy: .5, label: 'Portal' },
    Coin:             { w: 64, h: 64, hx: .5, hy: .5, unique: 1, label: 'Coin' },
    Collider:         { w: 32, h: 64, hx: .5, hy: .5, unique: 1, label: 'Start' },
    EndFlag:          { w: 97, h: 199, hx: .525, hy: .497, unique: 1, label: 'Flag' },
    MoveTrigger:      { w: 32, h: 32, hx: .5, hy: .5, label: 'Move trigger' },
    Text:             { w: 288, h: 40, hx: 0, hy: 0, label: 'Text' },
  };

  // ---------- format ----------
  // stored: { v:1, name, objs:[[type, x, y, w, h, angleDeg, extra?]] }   extra.g = group id
  function toDef(data) {
    let maxX = 640, maxY = 480;
    const objs = data.objs.map(r => {
      const [t, x, y, w, h, a, ex] = r; const T = TYPES[t] || TYPES.Solid;
      maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
      const e = Object.assign({}, ex || {});
      if (t === 'Text') { e.tx = e.tx || ''; e.sc = e.sc || 1; e.al = e.al == null ? 50 : e.al; }
      if (t === 'JumpBoost') { e.f = e.f || 0.7; }
      if (t === 'Portal') { e.id = e.id || 0; e.tg = e.tg == null ? (e.id ^ 1) : e.tg; }
      if (t === 'MoveTrigger') { e.inv = 1; e.tg = e.tg || 1; }
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
    const objs = d.objs.filter(r => Array.isArray(r) && TYPES[r[0]]).slice(0, 8000).map(r => {
      const o = [r[0], +r[1] || 0, +r[2] || 0, Math.max(1, Math.min(20000, +r[3] || 16)), Math.max(1, Math.min(20000, +r[4] || 16)), +r[5] || 0];
      if (r[6] && typeof r[6] === 'object') {
        const e = {}; const x = r[6];
        if (typeof x.tx === 'string') e.tx = x.tx.slice(0, 200);
        if (typeof x.ease === 'string' && /^(linear|in|out|inout)$/.test(x.ease)) e.ease = x.ease;
        ['id', 'tg', 'f', 'sc', 'al', 'g', 'mx', 'my', 'dur', 'touch'].forEach(k => { if (typeof x[k] === 'number' && isFinite(x[k])) e[k] = x[k]; });
        o.push(e);
      }
      return o;
    });
    return { v: 1, name: String(d.name || 'Untitled').slice(0, 40), author: String(d.author || '').slice(0, 30), objs };
  }

  // ---------- geometry on stored objects ----------
  const isRect = t => (TYPES[t] || TYPES.Solid).hx === 0;
  function center(r) {
    if (!isRect(r[0])) return [r[1], r[2]];
    const a = (r[5] || 0) * D2R, c = Math.cos(a), s = Math.sin(a), hw = r[3] / 2, hh = r[4] / 2;
    return [r[1] + hw * c - hh * s, r[2] + hw * s + hh * c];
  }
  function setCenter(r, cx, cy) {
    if (!isRect(r[0])) { r[1] = cx; r[2] = cy; return; }
    const a = (r[5] || 0) * D2R, c = Math.cos(a), s = Math.sin(a), hw = r[3] / 2, hh = r[4] / 2;
    r[1] = cx - (hw * c - hh * s); r[2] = cy - (hw * s + hh * c);
  }
  const round2 = v => Math.round(v * 100) / 100;
  function tidy(r) { r[1] = round2(r[1]); r[2] = round2(r[2]); r[3] = round2(r[3]); r[4] = round2(r[4]); r[5] = round2(((r[5] % 360) + 540) % 360 - 180); }
  function makeFromCenter(t, cx, cy, w, h, a, ex) { const r = [t, 0, 0, w, h, a || 0]; if (ex) r.push(JSON.parse(JSON.stringify(ex))); setCenter(r, cx, cy); tidy(r); return r; }
  function engineObj(r) { const d = toDef({ objs: [r] }); const o = OvO.makeObj(d.objs[0]); OvO.updatePoly(o); return o; }
  function inPoly(pts, x, y) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function pickPoly(o) {
    if (o.t === 'Collider') return [[o.x - 16, o.y - 40], [o.x + 16, o.y - 40], [o.x + 16, o.y + 32], [o.x - 16, o.y + 32]];
    if (o.t === 'MoveTrigger') return [[o.x - 16, o.y - 16], [o.x + 16, o.y - 16], [o.x + 16, o.y + 16], [o.x - 16, o.y + 16]];
    if (o.t === 'JumpThrough' || o.t === 'UnmovableJumpThrough') { // easier to tap thin platforms
      const a = o.a, c = Math.cos(a), s = Math.sin(a);
      return [[0, -6], [o.w, -6], [o.w, o.h + 6], [0, o.h + 6]].map(([u, v]) => [o.x + u * c - v * s, o.y + u * s + v * c]);
    }
    return o.poly;
  }

  // ---------- drawing helpers ----------
  const fakeGame = { level: { time: 0 } };
  let idleRig = null;
  function drawStart(ctx, o) {
    const RIG = OvO.RIG;
    if (!idleRig) {
      idleRig = RIG.makeRig(0, 0); const once = {}; let tk = 0;
      for (let i = 0; i < 90; i++) { tk++; window.OvORigAnimate(idleRig, { State: 'idle', Side: 1, Angle: 0, Skin: '', ipx: () => 0, ipy: () => 8 }, 1 / 60, i / 60, id => { const r = once[id] !== tk - 1; once[id] = tk; return r; }, RIG.rigIpos); }
    }
    RIG.drawRig(ctx, idleRig, o.x, o.y, ctx.globalAlpha);
  }
  function drawTrigger(ctx, o, opts) {
    if (opts.lines && !o.touch) {
      ctx.save(); ctx.strokeStyle = 'rgba(0,120,255,0.45)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(o.x, opts.top); ctx.lineTo(o.x, opts.bot); ctx.stroke(); ctx.restore();
    }
    ctx.save(); ctx.translate(o.x, o.y);
    ctx.fillStyle = '#fff'; ctx.fillRect(-16, -16, 32, 32);
    ctx.strokeStyle = '#0a7cff'; ctx.lineWidth = 3; ctx.strokeRect(-16, -16, 32, 32);
    ctx.fillStyle = '#0a7cff'; ctx.font = '9px Retron, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('MOVE', 0, -6); ctx.fillText('G' + (o.tg || 1), 0, 6);
    ctx.restore();
  }
  function drawEngineObj(ctx, o, opts) {
    opts = opts || {};
    if (o.t === 'Collider') return drawStart(ctx, o);
    if (o.t === 'MoveTrigger') return drawTrigger(ctx, o, opts);
    OvO.Game.prototype.drawObj.call(fakeGame, ctx, o);
    if (o.t === 'Tiledbackground' && o.poly) { // show which way gravity points inside the zone
      let x = 0, y = 0; for (const p of o.poly) { x += p[0]; y += p[1]; } x /= 4; y /= 4;
      ctx.save(); ctx.translate(x, y); ctx.rotate(o.a + Math.PI / 2); ctx.strokeStyle = 'rgba(242,12,25,.7)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.lineTo(6, -7); ctx.moveTo(14, 0); ctx.lineTo(6, 7); ctx.stroke(); ctx.restore();
    }
    if (o.t === 'Portal' && opts.labels) { ctx.fillStyle = '#000'; ctx.font = '11px Retron, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(o.id + '→' + o.tg, o.x, o.y - 40); }
  }
  function drawData(ctx, data, opts) {
    fakeGame.level.time = performance.now() / 1000;
    const def = toDef(data);
    for (const r of def.objs) { const o = OvO.makeObj(r); OvO.updatePoly(o); drawEngineObj(ctx, o, opts); }
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

  // ---------- palette (Build mode) ----------
  const P = (t, w, h, a, ex, label) => ({ t, w, h, a: a || 0, ex, label });
  const CATS = [
    { name: 'Blocks', items: [
      P('Solid', 32, 32, 0, null, 'Block'), P('Solid', 16, 16, 0, null, 'Small'), P('Solid', 64, 64, 0, null, 'Big'),
      P('Solid', 64, 16, 0, null, 'Slab'), P('Solid', 128, 16, 0, null, 'Long'), P('Solid', 16, 64, 0, null, 'Pillar'),
      P('Solid', 64, 16, -45, null, 'Ramp 45'), P('Solid', 64, 16, 45, null, 'Ramp 45'), P('Solid', 64, 16, -22.5, null, 'Ramp 22'), P('Solid', 64, 16, 22.5, null, 'Ramp 22'),
      P('Solid2', 32, 32, 0, null, 'White'), P('SolidMove', 32, 32, 0, null, 'Red') ] },
    { name: 'Platforms', items: [
      P('JumpThrough', 64, 8, 0, null, 'Platform'), P('JumpThrough', 128, 8, 0, null, 'Long'), P('JumpThrough', 32, 8, 0, null, 'Short'),
      P('GroundPoundSolid', 64, 16, 0, null, 'Breakable'), P('GroundPoundSolid', 32, 16, 0, null, 'Break S') ] },
    { name: 'Hazards', items: [
      P('Spike', 32, 32, 0, null, 'Spike'), P('Spike', 32, 32, 90, null, 'Spike →'), P('Spike', 32, 32, 180, null, 'Spike ↓'), P('Spike', 32, 32, -90, null, 'Spike ←'),
      P('Spike', 16, 16, 0, null, 'Mini'), P('Spike2', 32, 32, 0, null, 'White') ] },
    { name: 'Gameplay', items: [
      P('Collider', 32, 64, 0, null, 'Start'), P('EndFlag', 97, 199, 0, null, 'Flag'), P('Coin', 64, 64, 0, null, 'Coin'),
      P('JumpBoost', 32, 32, 0, null, 'Boost'), P('JumpBoost', 32, 32, 45, null, 'Boost ↗'), P('JumpBoost', 32, 32, 90, null, 'Boost →'),
      P('Portal', 8, 64, 0, null, 'Portal') ] },
    { name: 'Triggers', items: [
      P('MoveTrigger', 32, 32, 0, { tg: 1, mx: 0, my: -64, dur: 1, ease: 'inout', touch: 0 }, 'Move'),
      P('Tiledbackground', 128, 128, 180, null, 'Gravity ↑'), P('Tiledbackground', 128, 128, 90, null, 'Gravity ←'), P('Tiledbackground', 128, 128, -90, null, 'Gravity →'),
      P('Text', 288, 40, 0, { tx: 'Text', sc: 1, al: 50 }, 'Text') ] },
  ];
  function itemIcon(it, size) {
    const c = document.createElement('canvas'); c.width = c.height = size * 2; const ctx = c.getContext('2d'); ctx.scale(2, 2);
    const r = makeFromCenter(it.t, 0, 0, it.w, it.h, it.a, it.t === 'Text' ? { tx: 'Aa', sc: 2 } : it.ex);
    const o = engineObj(r); const b = o.bb.slice(); let bw = b[2] - b[0], bh = b[3] - b[1];
    if (it.t === 'Collider') { bw = 34; bh = 72; b[0] = -17; b[1] = -40; }
    if (it.t === 'MoveTrigger') { bw = bh = 34; b[0] = b[1] = -17; }
    if (it.t === 'Text') { bw = 60; b[0] = -30; }
    const s = Math.min((size - 8) / bw, (size - 8) / bh, 1.6);
    ctx.translate(size / 2 - (b[0] + bw / 2) * s, size / 2 - (b[1] + bh / 2) * s); ctx.scale(s, s);
    if (it.t === 'Solid2') { ctx.strokeStyle = '#000'; ctx.lineWidth = 2 / s; ctx.strokeRect(o.bb[0], o.bb[1], bw, bh); }
    drawEngineObj(ctx, o, {});
    return c;
  }

  // ---------- editor ----------
  class Editor {
    constructor() {
      this.cv = document.getElementById('editor'); this.ctx = this.cv.getContext('2d');
      this.ui = document.getElementById('scrEditor');
      this.mode = 'build'; this.cat = 0; this.item = CATS[0].items[0];
      this.swipe = false; this.step = 16; this.cam = { x: 400, y: 300, z: 1 };
      this.sel = new Set(); this.undo = []; this.redo = []; this.clip = null; this.trail = null;
      this.ptrs = new Map(); this.active = false; this.shift = false;
      this.buildUI(); this.bind();
      this.loop = this.loop.bind(this);
    }
    // ----- UI -----
    buildUI() {
      const $ = id => document.getElementById(id); this.$ = $;
      document.querySelectorAll('.gd-mode').forEach(b => b.onclick = () => this.setMode(b.dataset.mode));
      $('gdSwipe').onclick = () => { this.swipe = !this.swipe; this.refreshToggles(); };
      $('gdZoomIn').onclick = () => this.zoomAt(this.cam.x, this.cam.y, 1.25);
      $('gdZoomOut').onclick = () => this.zoomAt(this.cam.x, this.cam.y, 0.8);
      $('gdUndo').onclick = () => this.doUndo(); $('gdRedo').onclick = () => this.doRedo();
      $('gdTrash').onclick = () => this.deleteSel();
      $('gdPlay').onclick = () => this.playtest();
      $('gdMenu').onclick = () => this.cb.menu(this.data);
      $('gdPrev').onclick = () => this.scrollPanel(-1); $('gdNext').onclick = () => this.scrollPanel(1);
      this.renderPanel();
    }
    scrollPanel(d) { const g = this.$('gdGrid'); g.scrollBy({ left: d * g.clientWidth * 0.9, behavior: 'smooth' }); }
    setMode(m) { this.mode = m; this.renderPanel(); }
    refreshToggles() {
      this.$('gdSwipe').classList.toggle('on', this.swipe);
      document.querySelectorAll('.gd-mode').forEach(b => b.classList.toggle('on', b.dataset.mode === this.mode));
      const st = this.$('gdStep'); if (st) st.textContent = 'Step ' + this.step;
      const info = this.$('gdInfo'); if (info) info.textContent = this.selInfo();
    }
    selInfo() {
      if (!this.sel.size) return 'Tap an object to select it · Swipe on = box select · drag a selection to move it';
      const gs = new Set([...this.sel].map(r => (r[6] && r[6].g) || 0));
      return this.sel.size + ' selected' + (gs.size === 1 && !gs.has(0) ? ' · group ' + [...gs][0] : '');
    }
    renderPanel() {
      const tabs = this.$('gdTabs'), grid = this.$('gdGrid'); tabs.innerHTML = ''; grid.innerHTML = '';
      if (this.mode === 'build') {
        CATS.forEach((c, i) => { const b = document.createElement('button'); b.textContent = c.name; b.className = i === this.cat ? 'on' : ''; b.onclick = () => { this.cat = i; this.item = CATS[i].items[0]; this.renderPanel(); }; tabs.appendChild(b); });
        for (const it of CATS[this.cat].items) {
          const b = document.createElement('button'); b.className = 'gd-obj' + (it === this.item ? ' on' : '');
          b.appendChild(itemIcon(it, 44)); const s = document.createElement('span'); s.textContent = it.label; b.appendChild(s);
          b.onclick = () => { this.item = it; grid.querySelectorAll('.gd-obj').forEach(x => x.classList.remove('on')); b.classList.add('on'); };
          grid.appendChild(b);
        }
      } else if (this.mode === 'edit') {
        const info = document.createElement('span'); info.id = 'gdInfo'; info.className = 'gd-info'; tabs.appendChild(info);
        const B = (label, fn, cls, title) => { const b = document.createElement('button'); b.className = 'gd-ed ' + (cls || ''); b.innerHTML = label; if (title) b.title = title; b.onclick = fn; grid.appendChild(b); return b; };
        B('▲', () => this.moveSel(0, -this.step), '', 'Move up (W)'); B('▼', () => this.moveSel(0, this.step), '', 'Move down (S)');
        B('◀', () => this.moveSel(-this.step, 0), '', 'Move left (A)'); B('▶', () => this.moveSel(this.step, 0), '', 'Move right (D)');
        const st = B('Step 16', () => { const L = [2, 8, 16, 32, 160]; this.step = L[(L.indexOf(this.step) + 1) % L.length]; this.refreshToggles(); }, 'wide', 'Move step in pixels'); st.id = 'gdStep';
        B('⟲<small>90°</small>', () => this.rotSel(-90), '', 'Rotate left (Q)'); B('⟳<small>90°</small>', () => this.rotSel(90), '', 'Rotate right (E)');
        B('⟲<small>45°</small>', () => this.rotSel(-45)); B('⟳<small>45°</small>', () => this.rotSel(45));
        B('⇋<small>Flip X</small>', () => this.flipSel(true)); B('⇵<small>Flip Y</small>', () => this.flipSel(false));
        B('＋<small>Scale</small>', () => this.scaleSel(1.25)); B('－<small>Scale</small>', () => this.scaleSel(0.8));
        B('W＋', () => this.stretchSel(this.step, 0), '', 'Wider'); B('W－', () => this.stretchSel(-this.step, 0), '', 'Narrower');
        B('H＋', () => this.stretchSel(0, this.step), '', 'Taller'); B('H－', () => this.stretchSel(0, -this.step), '', 'Shorter');
        B('Copy', () => this.copySel(), 'wide'); B('Paste', () => this.paste(), 'wide'); B('Copy +<br>Paste', () => this.duplicate(), 'wide', 'Duplicate (Ctrl+D)');
        B('Group<br>ID', () => this.groupSel(), 'wide hl'); B('Edit<br>Object', () => this.editObject(), 'wide hl');
        B('Select<br>All', () => { this.sel = new Set(this.data.objs); this.refreshToggles(); }, 'wide');
        B('Deselect', () => { this.sel.clear(); this.refreshToggles(); }, 'wide'); B('Delete', () => this.deleteSel(), 'wide danger');
      } else {
        const info = document.createElement('span'); info.className = 'gd-info'; info.textContent = 'Tap an object to delete it · turn on Swipe to delete while dragging'; tabs.appendChild(info);
        const B = (label, fn) => { const b = document.createElement('button'); b.className = 'gd-ed wide'; b.innerHTML = label; b.onclick = fn; grid.appendChild(b); };
        B('Delete<br>selected', () => this.deleteSel());
        B('Delete all<br>of type', () => { if (!this.sel.size) return this.hint('Select an object in Edit mode first'); const ts = new Set([...this.sel].map(r => r[0])); this.snapshot(); this.data.objs = this.data.objs.filter(r => !ts.has(r[0])); this.sel.clear(); });
        B('Clear<br>trail', () => { this.trail = null; });
      }
      this.refreshToggles();
    }
    hint(s) { const h = this.$('gdHint'); h.textContent = s; clearTimeout(this._ht); this._ht = setTimeout(() => { h.textContent = ''; }, 2400); }

    // ----- lifecycle -----
    open(data, cb) {
      const same = this.data && data && this.data.id && this.data.id === data.id && this._keepCam;
      this.data = JSON.parse(JSON.stringify(data)); this.cb = cb;
      if (!same) { this.undo = []; this.redo = []; }
      this.sel.clear();
      this.cv.hidden = false; this.ui.hidden = false; this.active = true; this.resize();
      if (!this._keepCam) {
        const def = toDef(this.data); const d = devicePixelRatio || 1;
        const st = this.data.objs.find(r => r[0] === 'Collider');
        this.cam = { x: st ? st[1] + 300 : def.w / 2, y: st ? st[2] : def.h / 2, z: Math.min(1.2, Math.max(0.5, this.cv.height / d / 560)) * d };
        this.trail = null;
      }
      this._keepCam = false;
      this.renderPanel();
      requestAnimationFrame(this.loop);
    }
    close() { this.active = false; this.cv.hidden = true; this.ui.hidden = true; }
    resize() { const d = devicePixelRatio || 1; this.cv.width = Math.round(innerWidth * d); this.cv.height = Math.round(innerHeight * d); }
    playtest() { this._keepCam = true; this.cb.test(this.data); }
    snapshot() { this.undo.push(JSON.stringify(this.data.objs)); if (this.undo.length > 150) this.undo.shift(); this.redo = []; }
    doUndo() { const s = this.undo.pop(); if (!s) return this.hint('Nothing to undo'); this.redo.push(JSON.stringify(this.data.objs)); this.data.objs = JSON.parse(s); this.sel.clear(); this.refreshToggles(); }
    doRedo() { const s = this.redo.pop(); if (!s) return this.hint('Nothing to redo'); this.undo.push(JSON.stringify(this.data.objs)); this.data.objs = JSON.parse(s); this.sel.clear(); this.refreshToggles(); }

    // ----- selection operations -----
    selCenter() { let x = 0, y = 0, n = 0; for (const r of this.sel) { const c = center(r); x += c[0]; y += c[1]; n++; } return [x / n, y / n]; }
    need() { if (!this.sel.size) { this.hint('Select something first (tap it in Edit mode)'); return false; } return true; }
    moveSel(dx, dy) { if (!this.need()) return; this.snapshot(); for (const r of this.sel) { r[1] = round2(r[1] + dx); r[2] = round2(r[2] + dy); } }
    rotSel(d) {
      if (!this.need()) return; this.snapshot(); const [px, py] = this.selCenter(); const a = d * D2R, c = Math.cos(a), s = Math.sin(a);
      for (const r of this.sel) { const [x, y] = center(r); const nx = px + (x - px) * c - (y - py) * s, ny = py + (x - px) * s + (y - py) * c; r[5] = (r[5] || 0) + d; setCenter(r, nx, ny); tidy(r); }
    }
    flipSel(horiz) {
      if (!this.need()) return; this.snapshot(); const [px, py] = this.selCenter();
      for (const r of this.sel) { const [x, y] = center(r); r[5] = horiz ? -(r[5] || 0) : 180 - (r[5] || 0); setCenter(r, horiz ? 2 * px - x : x, horiz ? y : 2 * py - y); tidy(r); }
    }
    scaleSel(k) {
      if (!this.need()) return; this.snapshot(); const [px, py] = this.selCenter();
      for (const r of this.sel) { const [x, y] = center(r); r[3] = Math.max(2, r[3] * k); r[4] = Math.max(2, r[4] * k); if (r[0] === 'Text' && r[6]) r[6].sc = round2((r[6].sc || 1) * k); setCenter(r, px + (x - px) * k, py + (y - py) * k); tidy(r); }
    }
    stretchSel(dw, dh) {
      if (!this.need()) return; this.snapshot();
      for (const r of this.sel) { const c = center(r); r[3] = Math.max(2, r[3] + dw); r[4] = Math.max(2, r[4] + dh); setCenter(r, c[0], c[1]); tidy(r); }
    }
    copySel() { if (!this.need()) return; this.clip = JSON.stringify([...this.sel]); this.hint('Copied ' + this.sel.size + ' object' + (this.sel.size > 1 ? 's' : '')); }
    paste() {
      if (!this.clip) return this.hint('Copy something first');
      this.snapshot(); const objs = JSON.parse(this.clip);
      let x = 0, y = 0; for (const r of objs) { const c = center(r); x += c[0]; y += c[1]; } x /= objs.length; y /= objs.length;
      const dx = Math.round((this.cam.x - x) / GRID) * GRID, dy = Math.round((this.cam.y - y) / GRID) * GRID;
      for (const r of objs) { r[1] += dx; r[2] += dy; tidy(r); this.data.objs.push(r); }
      this.sel = new Set(objs); this.setMode('edit');
    }
    duplicate() {
      if (!this.need()) return; this.snapshot(); const objs = JSON.parse(JSON.stringify([...this.sel]));
      for (const r of objs) this.data.objs.push(r); this.sel = new Set(objs); this.hint('Duplicated — move the copy with the arrows'); this.refreshToggles();
    }
    deleteSel() { if (!this.need()) return; this.snapshot(); this.data.objs = this.data.objs.filter(r => !this.sel.has(r)); this.sel.clear(); this.refreshToggles(); }
    nextGroup() { let m = 0; for (const r of this.data.objs) if (r[6] && r[6].g) m = Math.max(m, r[6].g); return m + 1; }
    groupSel() {
      if (!this.need()) return;
      const cur = [...this.sel].map(r => (r[6] && r[6].g) || 0)[0];
      this.cb.form('Group ID', `<p class="small">Objects that share a group ID move together when a Move trigger targets that group. 0 removes the group.</p>
        <label class="fl">Group <input type="number" id="f_g" min="0" max="999" value="${cur || this.nextGroup()}"></label>`, f => {
        const g = Math.max(0, Math.min(999, parseInt(f.f_g) || 0)); this.snapshot();
        for (const r of this.sel) { if (!r[6]) r.push({}); if (g) r[6].g = g; else delete r[6].g; }
        this.refreshToggles(); this.hint(g ? 'Group ' + g + ' set on ' + this.sel.size + ' object' + (this.sel.size > 1 ? 's' : '') : 'Group removed');
      });
    }
    editObject() {
      if (!this.need()) return;
      const r = [...this.sel][0], e = r[6] || {}, t = r[0];
      const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      if (t === 'MoveTrigger') {
        const groups = [...new Set(this.data.objs.filter(o => o[0] !== 'MoveTrigger' && o[6] && o[6].g).map(o => o[6].g))].sort((a, b) => a - b);
        this.cb.form('Move trigger', `
          <label class="fl">Target group <input type="number" id="f_tg" min="1" max="999" value="${e.tg || 1}"></label>
          <p class="small">Groups in this level: ${groups.length ? groups.join(', ') : 'none yet — select objects in Edit mode and press Group ID'}</p>
          <label class="fl">Move X (blocks) <input type="number" id="f_mx" step="0.5" value="${(e.mx || 0) / 32}"></label>
          <label class="fl">Move Y (blocks, − is up) <input type="number" id="f_my" step="0.5" value="${(e.my || 0) / 32}"></label>
          <label class="fl">Time (seconds) <input type="number" id="f_dur" step="0.1" min="0" value="${e.dur == null ? 1 : e.dur}"></label>
          <label class="fl">Easing <select id="f_ease">${['linear', 'in', 'out', 'inout'].map(x => `<option value="${x}" ${x === (e.ease || 'linear') ? 'selected' : ''}>${{ linear: 'None', in: 'Ease in', out: 'Ease out', inout: 'Ease in-out' }[x]}</option>`).join('')}</select></label>
          <label class="fl">Touch triggered <input type="checkbox" id="f_touch" ${e.touch ? 'checked' : ''}></label>
          <p class="small">Otherwise it fires when the player passes the blue dashed line. 1 block = 32 px.</p>`, f => {
          this.snapshot();
          for (const o of this.sel) if (o[0] === 'MoveTrigger') {
            if (!o[6]) o.push({});
            Object.assign(o[6], { tg: Math.max(1, parseInt(f.f_tg) || 1), mx: Math.round((parseFloat(f.f_mx) || 0) * 32), my: Math.round((parseFloat(f.f_my) || 0) * 32), dur: Math.max(0, parseFloat(f.f_dur) || 0), ease: f.f_ease || 'linear', touch: f.f_touch ? 1 : 0 });
          }
        });
      } else if (t === 'Text') {
        this.cb.form('Text', `<label class="fl">Text <input id="f_tx" maxlength="200" value="${esc(e.tx || '')}"></label>
          <label class="fl">Size <input type="number" id="f_sc" step="0.25" min="0.25" max="8" value="${e.sc || 1}"></label>`, f => {
          this.snapshot(); if (!r[6]) r.push({}); r[6].tx = f.f_tx; r[6].sc = Math.max(0.25, Math.min(8, parseFloat(f.f_sc) || 1));
        });
      } else if (t === 'Portal') {
        this.cb.form('Portal', `<p class="small">Entering a portal sends you out of the portal whose ID equals its target.</p>
          <label class="fl">ID <input type="number" id="f_id" min="0" value="${e.id || 0}"></label>
          <label class="fl">Target ID <input type="number" id="f_tg" min="0" value="${e.tg == null ? (e.id || 0) ^ 1 : e.tg}"></label>`, f => {
          this.snapshot(); if (!r[6]) r.push({}); r[6].id = parseInt(f.f_id) || 0; r[6].tg = parseInt(f.f_tg) || 0;
        });
      } else if (t === 'JumpBoost') {
        this.cb.form('Boost', `<label class="fl">Strength <input type="number" id="f_f" step="0.05" min="0.1" max="3" value="${e.f || 0.7}"></label><p class="small">0.7 is the normal boost.</p>`, f => {
          this.snapshot(); for (const o of this.sel) if (o[0] === 'JumpBoost') { if (!o[6]) o.push({}); o[6].f = Math.max(0.1, Math.min(3, parseFloat(f.f_f) || 0.7)); }
        });
      } else this.hint('This object has no settings — use Group ID, or select a trigger, text, portal or boost');
    }

    // ----- input -----
    viewCY() { const p = document.querySelector('.gd-panel'); const d = devicePixelRatio || 1; return (this.cv.height - (p ? p.offsetHeight * d : 0)) / 2; }
    toWorld(cx, cy) { const d = devicePixelRatio || 1; return [(cx * d - this.cv.width / 2) / this.cam.z + this.cam.x, (cy * d - this.viewCY()) / this.cam.z + this.cam.y]; }
    zoomAt(wx, wy, f) {
      const d = devicePixelRatio || 1; const z = Math.max(0.12 * d, Math.min(4 * d, this.cam.z * f)); f = z / this.cam.z;
      this.cam.x = wx - (wx - this.cam.x) / f; this.cam.y = wy - (wy - this.cam.y) / f; this.cam.z = z;
    }
    hitTest(wx, wy) {
      const def = toDef({ objs: this.data.objs });
      for (let i = this.data.objs.length - 1; i >= 0; i--) {
        const o = OvO.makeObj(def.objs[i]); OvO.updatePoly(o);
        if (inPoly(pickPoly(o), wx, wy)) return this.data.objs[i];
      }
      return null;
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
      addEventListener('keyup', e => { if (e.key === 'Shift') this.shift = false; });
      addEventListener('keydown', e => {
        if (!this.active || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || !document.getElementById('dlg').hidden) return;
        const k = e.key, ctrl = e.ctrlKey || e.metaKey;
        if (k === 'Shift') this.shift = true;
        if (ctrl && (k === 'z' || k === 'Z')) { e.preventDefault(); return e.shiftKey ? this.doRedo() : this.doUndo(); }
        if (ctrl && (k === 'y' || k === 'Y')) { e.preventDefault(); return this.doRedo(); }
        if (ctrl && (k === 'c' || k === 'C')) { e.preventDefault(); return this.copySel(); }
        if (ctrl && (k === 'v' || k === 'V')) { e.preventDefault(); return this.paste(); }
        if (ctrl && (k === 'd' || k === 'D')) { e.preventDefault(); return this.duplicate(); }
        if (ctrl && (k === 'a' || k === 'A')) { e.preventDefault(); this.sel = new Set(this.data.objs); this.setMode('edit'); return; }
        if (ctrl) return;
        if (k === '1') this.setMode('build'); else if (k === '2') this.setMode('edit'); else if (k === '3') this.setMode('delete');
        else if (k === 'Delete' || k === 'Backspace') this.deleteSel();
        else if (k === 'Enter') this.playtest();
        else if (k === 'Escape') { this.sel.clear(); this.refreshToggles(); }
        else if (this.sel.size) {
          const st = e.shiftKey ? 2 : this.step;
          if (k === 'w' || k === 'W' || k === 'ArrowUp') { e.preventDefault(); this.moveSel(0, -st); }
          else if (k === 's' || k === 'S' || k === 'ArrowDown') { e.preventDefault(); this.moveSel(0, st); }
          else if (k === 'a' || k === 'A' || k === 'ArrowLeft') { e.preventDefault(); this.moveSel(-st, 0); }
          else if (k === 'd' || k === 'D' || k === 'ArrowRight') { e.preventDefault(); this.moveSel(st, 0); }
          else if (k === 'q' || k === 'Q') this.rotSel(e.shiftKey ? -45 : -90);
          else if (k === 'e' || k === 'E') this.rotSel(e.shiftKey ? 45 : 90);
        }
      });
    }
    swipeOn() { return this.swipe || this.shift; }
    pdown(e) {
      this.cv.setPointerCapture(e.pointerId);
      this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.ptrs.size === 2) { if (this.act && this.act.snap && this.act.any !== false) { this.data.objs = JSON.parse(this.act.snap); this.sel.clear(); } this.act = { type: 'pinch' }; this.pinchPrev = this.pinchInfo(); return; }
      if (this.ptrs.size > 2) return;
      const [wx, wy] = this.toWorld(e.clientX, e.clientY);
      const base = { sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, wx, wy, moved: false };
      if (e.button === 1 || e.button === 2) { this.act = Object.assign(base, { type: 'pan' }); return; }
      if (this.mode === 'edit') {
        const hit = this.hitTest(wx, wy);
        if (hit && this.sel.has(hit) && !this.swipeOn()) { this.act = Object.assign(base, { type: 'drag', snap: JSON.stringify(this.data.objs), ox: 0, oy: 0, hit }); return; }
        if (this.swipeOn()) { this.act = Object.assign(base, { type: 'box', bx: wx, by: wy }); return; }
      }
      if (this.swipeOn() && this.mode === 'build') { this.act = Object.assign(base, { type: 'paint', snap: JSON.stringify(this.data.objs), placed: new Set(), any: false }); this.placeAt(wx, wy, this.act); return; }
      if (this.swipeOn() && this.mode === 'delete') { this.act = Object.assign(base, { type: 'erase', snap: JSON.stringify(this.data.objs), any: false }); this.eraseAt(wx, wy, this.act); return; }
      this.act = Object.assign(base, { type: 'tap' }); // becomes a pan if the finger moves
    }
    pinchInfo() { const [a, b] = [...this.ptrs.values()]; return { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) }; }
    pmove(e) {
      this.hover = this.toWorld(e.clientX, e.clientY);
      if (!this.ptrs.has(e.pointerId)) return;
      this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const a = this.act; if (!a) return; const d = devicePixelRatio || 1;
      if (a.type === 'pinch') {
        if (this.ptrs.size < 2) return;
        const p = this.pinchInfo(), q = this.pinchPrev;
        this.cam.x -= (p.cx - q.cx) * d / this.cam.z; this.cam.y -= (p.cy - q.cy) * d / this.cam.z;
        const [wx, wy] = this.toWorld(p.cx, p.cy); if (q.d > 10) this.zoomAt(wx, wy, p.d / q.d);
        this.pinchPrev = p; return;
      }
      const [wx, wy] = this.toWorld(e.clientX, e.clientY);
      if (Math.hypot(e.clientX - a.sx, e.clientY - a.sy) > 7) a.moved = true;
      if (a.type === 'tap' && a.moved) a.type = 'pan';
      if (a.type === 'pan') { this.cam.x -= (e.clientX - a.lx) * d / this.cam.z; this.cam.y -= (e.clientY - a.ly) * d / this.cam.z; }
      else if (a.type === 'paint') this.placeAt(wx, wy, a);
      else if (a.type === 'erase') this.eraseAt(wx, wy, a);
      else if (a.type === 'box') { a.ex = wx; a.ey = wy; }
      else if (a.type === 'drag' && a.moved) {
        const st = this.step < 16 ? this.step : GRID;
        const dx = Math.round((wx - a.wx) / st) * st, dy = Math.round((wy - a.wy) / st) * st;
        if (dx !== a.ox || dy !== a.oy) { for (const r of this.sel) { r[1] = round2(r[1] + dx - a.ox); r[2] = round2(r[2] + dy - a.oy); } a.ox = dx; a.oy = dy; }
      }
      a.lx = e.clientX; a.ly = e.clientY;
    }
    pup(e, cancel) {
      this.ptrs.delete(e.pointerId);
      const a = this.act;
      if (a && a.type === 'pinch') { if (!this.ptrs.size) this.act = null; return; }
      this.act = null; if (!a || cancel) return;
      if (a.type === 'tap') this.tap(a.wx, a.wy, e.shiftKey);
      else if ((a.type === 'paint' || a.type === 'erase') && a.any) { this.undo.push(a.snap); this.redo = []; }
      else if (a.type === 'drag') { if (a.ox || a.oy) { this.undo.push(a.snap); this.redo = []; } else if (!a.moved) this.tap(a.wx, a.wy, e.shiftKey); }
      else if (a.type === 'box') {
        if (a.ex == null || !a.moved) return this.tap(a.wx, a.wy, true);
        const x0 = Math.min(a.bx, a.ex), x1 = Math.max(a.bx, a.ex), y0 = Math.min(a.by, a.ey), y1 = Math.max(a.by, a.ey);
        for (const r of this.data.objs) { const c = center(r); if (c[0] >= x0 && c[0] <= x1 && c[1] >= y0 && c[1] <= y1) this.sel.add(r); }
        this.refreshToggles();
      }
    }
    tap(wx, wy, add) {
      if (this.mode === 'build') { const snap = JSON.stringify(this.data.objs); const act = { placed: new Set(), any: false }; this.placeAt(wx, wy, act); if (act.any) { this.undo.push(snap); this.redo = []; } }
      else if (this.mode === 'edit') {
        const hit = this.hitTest(wx, wy);
        if (!hit) { if (!add) this.sel.clear(); }
        else if (add) { this.sel.has(hit) ? this.sel.delete(hit) : this.sel.add(hit); }
        else this.sel = new Set([hit]);
        this.refreshToggles();
      } else {
        const hit = this.hitTest(wx, wy);
        if (hit) { this.snapshot(); this.data.objs = this.data.objs.filter(r => r !== hit); this.sel.delete(hit); this.refreshToggles(); }
      }
    }
    snapPos(it, wx, wy) {
      let cx, cy;
      if (it.a % 90 === 0) {
        const sw = (it.a % 180 === 0) ? it.w : it.h, sh = (it.a % 180 === 0) ? it.h : it.w;
        const g = sw < GRID || sh < GRID ? 8 : GRID;
        cx = Math.round((wx - sw / 2) / g) * g + sw / 2; cy = Math.round((wy - sh / 2) / g) * g + sh / 2;
        if (it.t === 'EndFlag') { cy = Math.round((wy + 99.5) / GRID) * GRID - 99.5; cx = Math.round(wx / GRID) * GRID; }
        if (it.t === 'Collider') { cx = Math.round(wx / GRID) * GRID; cy = Math.round((wy + 32) / GRID) * GRID - 32; }
      } else { cx = Math.round(wx / 8) * 8; cy = Math.round(wy / 8) * 8; }
      return [cx, cy];
    }
    placeAt(wx, wy, act) {
      const it = this.item; const [cx, cy] = this.snapPos(it, wx, wy);
      if (cx < 0 || cy < 0) return;
      const key = Math.round(cx) + ',' + Math.round(cy); if (act.placed.has(key)) return; act.placed.add(key);
      if (this.data.objs.some(r => r[0] === it.t && r[3] === it.w && Math.abs((r[5] || 0) - it.a) < 1 && Math.abs(center(r)[0] - cx) < 1 && Math.abs(center(r)[1] - cy) < 1)) return;
      const T = TYPES[it.t];
      if (T.unique) this.data.objs = this.data.objs.filter(r => r[0] !== it.t);
      let ex = it.ex ? JSON.parse(JSON.stringify(it.ex)) : null;
      if (it.t === 'Portal') { const n = this.data.objs.filter(r => r[0] === 'Portal').length; ex = { id: n, tg: n ^ 1 }; }
      if (it.t === 'MoveTrigger') ex.tg = Math.max(1, this.nextGroup() - 1);
      const r = makeFromCenter(it.t, cx, cy, it.w, it.h, it.a, ex);
      this.data.objs.push(r); act.any = true;
      if (it.t === 'Text' && !this.swipeOn()) { this.sel = new Set([r]); setTimeout(() => this.editObject(), 0); }
    }
    eraseAt(wx, wy, act) { const hit = this.hitTest(wx, wy); if (hit) { this.data.objs = this.data.objs.filter(r => r !== hit); this.sel.delete(hit); act.any = true; } }

    // ----- render -----
    loop() {
      if (!this.active) return;
      requestAnimationFrame(this.loop);
      const ctx = this.ctx, W = this.cv.width, H = this.cv.height, c = this.cam;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#e9e9e9'; ctx.fillRect(0, 0, W, H);
      const VC = this.viewCY();
      ctx.setTransform(c.z, 0, 0, c.z, W / 2 - c.x * c.z, VC - c.y * c.z);
      const def = toDef(this.data);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, def.w, def.h);
      const vx0 = c.x - W / 2 / c.z, vx1 = c.x + W / 2 / c.z, vy0 = c.y - VC / c.z, vy1 = c.y + (H - VC) / c.z;
      ctx.lineWidth = 1 / c.z; ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.beginPath();
      if (c.z > 0.3) {
        for (let x = Math.max(0, Math.floor(vx0 / 32) * 32); x <= Math.min(vx1, def.w); x += 32) { ctx.moveTo(x, Math.max(0, vy0)); ctx.lineTo(x, Math.min(vy1, def.h)); }
        for (let y = Math.max(0, Math.floor(vy0 / 32) * 32); y <= Math.min(vy1, def.h); y += 32) { ctx.moveTo(Math.max(0, vx0), y); ctx.lineTo(Math.min(vx1, def.w), y); }
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2 / c.z; ctx.setLineDash([8 / c.z, 6 / c.z]); ctx.strokeRect(0, 0, def.w, def.h); ctx.setLineDash([]);
      ctx.imageSmoothingEnabled = true;
      fakeGame.level.time = performance.now() / 1000;
      const showG = this.mode === 'edit', d = devicePixelRatio || 1;
      for (let i = 0; i < def.objs.length; i++) {
        const o = OvO.makeObj(def.objs[i]); OvO.updatePoly(o);
        const vis = o.t === 'Text' || o.t === 'MoveTrigger' || o.t === 'Collider' || !(o.bb[2] < vx0 || o.bb[0] > vx1 || o.bb[3] < vy0 || o.bb[1] > vy1);
        if (!vis) continue;
        drawEngineObj(ctx, o, { labels: true, lines: true, top: vy0, bot: vy1 });
        const r = this.data.objs[i];
        if (r && this.sel.has(r)) {
          const pts = pickPoly(o);
          ctx.fillStyle = 'rgba(0,210,60,0.45)'; ctx.strokeStyle = '#00b030'; ctx.lineWidth = 2 / c.z;
          ctx.beginPath(); pts.forEach((p, k) => k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        if (showG && r && r[6] && r[6].g && r[0] !== 'MoveTrigger') {
          ctx.fillStyle = '#0a7cff'; ctx.font = Math.max(9, 11 * d / c.z) + 'px Retron, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
          ctx.fillText('G' + r[6].g, o.bb[0] + 1, o.bb[1] + 1);
        }
      }
      if (this.trail && this.trail.length) {
        ctx.fillStyle = 'rgba(0,150,255,0.55)';
        for (let i = 0; i < this.trail.length; i++) { const p = this.trail[i]; ctx.fillRect(p[0] - 2, p[1] - 2, 4, 4); }
      }
      const a = this.act;
      if (a && a.type === 'box' && a.ex != null) {
        ctx.fillStyle = 'rgba(0,210,60,0.12)'; ctx.strokeStyle = '#00b030'; ctx.lineWidth = 2 / c.z; ctx.setLineDash([6 / c.z, 4 / c.z]);
        ctx.fillRect(a.bx, a.by, a.ex - a.bx, a.ey - a.by); ctx.strokeRect(a.bx, a.by, a.ex - a.bx, a.ey - a.by); ctx.setLineDash([]);
      }
      if (this.mode === 'build' && this.hover && !a && matchMedia('(hover:hover)').matches) {
        const it = this.item; const [cx, cy] = this.snapPos(it, this.hover[0], this.hover[1]);
        if (cx >= 0 && cy >= 0) { ctx.globalAlpha = 0.4; drawEngineObj(ctx, engineObj(makeFromCenter(it.t, cx, cy, it.w, it.h, it.a, it.ex)), {}); ctx.globalAlpha = 1; }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  window.OvOEditor = { TYPES, CATS, toDef, encode, decode, sanitize, thumb, Editor, center };
})();
