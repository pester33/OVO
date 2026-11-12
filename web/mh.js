/* OvO Web — "Mega Hack" mod menu (Tab to open, or the MH button on touch screens) */
(function () {
  'use strict';
  const DEF = { noclip: false, infJump: false, speedOn: false, speedVal: 1, practice: false, hitboxes: false, trail: false, info: false,
    hideHud: false, zoomOn: false, zoomVal: 1, clickTp: false, safe: true, pos: {} };
  let S; try { S = Object.assign({}, DEF, JSON.parse(localStorage.getItem('ovo_mh') || '{}')); } catch (e) { S = Object.assign({}, DEF); }
  const save = () => { try { localStorage.setItem('ovo_mh', JSON.stringify(S)); } catch (e) {} };
  const H = window.OvOHack = {};
  function sync() {
    H.noclip = S.noclip; H.infJump = S.infJump; H.speed = S.speedOn ? S.speedVal : 1; H.practice = S.practice;
    H.hitboxes = S.hitboxes; H.trail = S.trail; H.zoom = S.zoomOn ? S.zoomVal : 1; H.safe = S.safe;
    document.body.classList.toggle('mh-hidehud', S.hideHud);
    const cp = document.getElementById('mhCp'); if (cp) cp.hidden = !(S.practice && !document.getElementById('hud').hidden);
    const info = document.getElementById('mhInfo'); if (info) info.hidden = !S.info;
    const active = S.noclip || S.infJump || (S.speedOn && S.speedVal !== 1) || S.clickTp;
    const ind = document.getElementById('mhInd'); if (ind) ind.hidden = !active || document.getElementById('hud').hidden;
  }

  // ---------- UI ----------
  const WINDOWS = [
    { id: 'player', title: 'Player', x: 20, y: 70, items: [
      { k: 'noclip', label: 'Noclip', tip: 'Spikes and rockets can’t kill you' },
      { k: 'infJump', label: 'Infinite jump', tip: 'Jump again in mid-air' },
      { k: 'speedOn', label: 'Speedhack', slider: { k: 'speedVal', min: 0.1, max: 3, step: 0.05, fmt: v => v.toFixed(2) + 'x' }, tip: 'Game speed' },
    ] },
    { id: 'practice', title: 'Practice', x: 20, y: 270, items: [
      { k: 'practice', label: 'Practice mode', tip: 'Respawn at your last checkpoint' },
      { btn: 'Place checkpoint (Z)', act: () => checkpoint(true) },
      { btn: 'Remove checkpoint (X)', act: () => checkpoint(false) },
    ] },
    { id: 'display', title: 'Display', x: 250, y: 70, items: [
      { k: 'hitboxes', label: 'Show hitboxes' },
      { k: 'trail', label: 'Show trail' },
      { k: 'info', label: 'Show info' },
      { k: 'hideHud', label: 'Hide HUD' },
      { k: 'zoomOn', label: 'Zoom hack', slider: { k: 'zoomVal', min: 0.3, max: 2.5, step: 0.05, fmt: v => v.toFixed(2) + 'x' } },
    ] },
    { id: 'level', title: 'Level', x: 480, y: 70, items: [
      { k: 'clickTp', label: 'Click to teleport', tip: 'Click / tap the level to teleport there' },
      { btn: 'Restart level (R)', act: () => { const g = game(); if (g && g.level) g.restart(); } },
      { btn: 'Instant complete', act: () => { const g = game(); if (g && g.level && !g.won) { g.cheated = true; g.win(); close(); } } },
    ] },
    { id: 'universal', title: 'Universal', x: 480, y: 270, items: [
      { k: 'safe', label: 'Safe mode', tip: 'Runs with cheats don’t save times or coins' },
      { btn: 'Turn everything off', act: () => { Object.assign(S, DEF, { pos: S.pos }); save(); render(); sync(); } },
      { note: 'Tab opens/closes this menu' },
    ] },
  ];
  const game = () => window.__ovo && window.__ovo.game;
  let root;
  function build() {
    root = document.createElement('div'); root.id = 'mh'; root.hidden = true;
    root.innerHTML = '<div class="mh-head">MEGA HACK <span>OvO web</span><button id="mhClose">×</button></div>';
    document.body.appendChild(root);
    for (const w of WINDOWS) {
      const el = document.createElement('div'); el.className = 'mh-win'; el.dataset.id = w.id;
      const pos = S.pos[w.id] || { x: w.x, y: w.y }; el.style.left = pos.x + 'px'; el.style.top = pos.y + 'px';
      el.innerHTML = `<div class="mh-title">${w.title}</div><div class="mh-body"></div>`;
      root.appendChild(el); drag(el, w.id);
    }
    root.querySelector('#mhClose').onclick = close;
    render();
    // extra HUD bits
    document.getElementById('hud').querySelector('.hud-left').insertAdjacentHTML('beforeend',
      '<button class="icon" id="mhBtn" aria-label="Mega Hack">MH</button><span id="mhInd" class="mh-ind" title="Cheats active" hidden>●</span>');
    document.getElementById('mhBtn').onclick = () => (root.hidden ? openMenu() : close());
    document.body.insertAdjacentHTML('beforeend', '<div id="mhCp" hidden><button data-cp="1">＋ CP</button><button data-cp="0">－ CP</button></div><pre id="mhInfo" hidden></pre>');
    document.querySelectorAll('#mhCp button').forEach(b => b.onclick = () => checkpoint(b.dataset.cp === '1'));
  }
  function render() {
    for (const w of WINDOWS) {
      const body = root.querySelector(`.mh-win[data-id=${w.id}] .mh-body`); body.innerHTML = '';
      for (const it of w.items) {
        const row = document.createElement('div'); row.className = 'mh-row';
        if (it.k) {
          row.innerHTML = `<label title="${it.tip || ''}"><input type="checkbox" ${S[it.k] ? 'checked' : ''}><span>${it.label}</span></label>`;
          row.querySelector('input').onchange = e => { S[it.k] = e.target.checked; save(); sync(); e.target.blur(); };
          if (it.slider) {
            const sl = it.slider, wrap = document.createElement('div'); wrap.className = 'mh-slider';
            wrap.innerHTML = `<input type="range" min="${sl.min}" max="${sl.max}" step="${sl.step}" value="${S[sl.k]}"><b>${sl.fmt(S[sl.k])}</b>`;
            const r = wrap.querySelector('input'), b = wrap.querySelector('b');
            r.oninput = () => { S[sl.k] = +r.value; b.textContent = sl.fmt(S[sl.k]); save(); sync(); };
            row.appendChild(wrap);
          }
        } else if (it.btn) { row.innerHTML = `<button>${it.btn}</button>`; row.querySelector('button').onclick = it.act; }
        else if (it.note) { row.innerHTML = `<small>${it.note}</small>`; }
        body.appendChild(row);
      }
    }
  }
  function drag(el, id) {
    const t = el.querySelector('.mh-title'); let st = null;
    t.addEventListener('pointerdown', e => { st = { x: e.clientX, y: e.clientY, l: el.offsetLeft, t: el.offsetTop }; t.setPointerCapture(e.pointerId); });
    t.addEventListener('pointermove', e => { if (!st) return; const x = Math.max(0, Math.min(innerWidth - 60, st.l + e.clientX - st.x)), y = Math.max(0, Math.min(innerHeight - 30, st.t + e.clientY - st.y)); el.style.left = x + 'px'; el.style.top = y + 'px'; });
    t.addEventListener('pointerup', () => { if (!st) return; st = null; S.pos[id] = { x: el.offsetLeft, y: el.offsetTop }; save(); });
  }
  function openMenu() {
    root.hidden = false; const g = game(); if (g && g.running && !g.won) { root._paused = !g.paused; g.paused = true; }
    // keep windows on screen on small displays
    root.querySelectorAll('.mh-win').forEach(el => { if (el.offsetLeft > innerWidth - 80) el.style.left = Math.max(0, innerWidth - el.offsetWidth - 10) + 'px'; if (el.offsetTop > innerHeight - 60) el.style.top = Math.max(40, innerHeight - el.offsetHeight - 10) + 'px'; });
  }
  function close() { if (document.activeElement && root.contains(document.activeElement)) document.activeElement.blur(); root.hidden = true; const g = game(); if (g && root._paused) { g.paused = false; root._paused = false; } sync(); }
  function flash(msg) { let f = document.getElementById('mhFlash'); if (!f) { f = document.createElement('div'); f.id = 'mhFlash'; document.body.appendChild(f); } f.textContent = msg; f.classList.add('on'); clearTimeout(f._t); f._t = setTimeout(() => f.classList.remove('on'), 1100); }
  function checkpoint(add) {
    const g = game(); if (!g || !g.level || document.getElementById('hud').hidden) return;
    if (!S.practice) { S.practice = true; save(); render(); sync(); }
    if (add) { if (g.saveCheckpoint()) flash('Checkpoint ' + g.checkpoints.length); }
    else if (g.checkpoints.length) { g.checkpoints.pop(); flash('Checkpoint removed'); }
  }

  // ---------- keys, teleport, info ----------
  addEventListener('keydown', e => {
    const typing = (e.target.tagName === 'INPUT' && !/^(checkbox|range)$/.test(e.target.type)) || /^(TEXTAREA|SELECT)$/.test(e.target.tagName);
    if (typing) return;
    if (e.key === 'Tab') { e.preventDefault(); root.hidden ? openMenu() : close(); return; }
    if (document.getElementById('hud').hidden) return;
    if (!S.practice || e.repeat) return;
    if (e.key === 'z' || e.key === 'Z') checkpoint(true);
    if (e.key === 'x' || e.key === 'X') checkpoint(false);
  });
  addEventListener('pointerdown', e => {
    if (!S.clickTp || e.target.id !== 'game') return;
    const g = game(); if (!g || !g.view || !g.p || g.p.dead) return;
    const d = Math.min(2, devicePixelRatio || 1), v = g.view;
    const wx = (e.clientX * d - v.W / 2) / v.s + v.cx, wy = (e.clientY * d - v.H / 2) / v.s + v.cy;
    g.p.x = wx; g.p.y = wy; g.p.dx = 0; g.p.dy = 0; g.prevPos = { x: wx, y: wy }; g.cheated = true;
  });
  let fps = 60, last = performance.now();
  (function infoLoop() {
    requestAnimationFrame(infoLoop);
    const now = performance.now(); fps = fps * 0.9 + (1000 / Math.max(1, now - last)) * 0.1; last = now;
    if (!S.info) return; const el = document.getElementById('mhInfo'); const g = game();
    if (!el || !g || !g.p || document.getElementById('hud').hidden) { if (el) el.textContent = ''; return; }
    const p = g.p;
    el.textContent = `FPS ${fps.toFixed(0)}\nX ${p.x.toFixed(0)}  Y ${p.y.toFixed(0)}\nSpeed ${Math.hypot(p.dx, p.dy).toFixed(0)}\nState ${g.p.ost || ''}\nGravity ${Math.round(p.G)}°\nAttempt time ${g.time.toFixed(2)}\nNoclip hits ${g.ncHits || 0}\nCheckpoints ${(g.checkpoints || []).length}${g.cheated ? '\nCHEATS USED' : ''}`;
  })();
  setInterval(sync, 400);

  function applyPreset(p) {
    ['noclip', 'infJump', 'practice', 'hitboxes', 'trail', 'info', 'hideHud', 'clickTp', 'safe'].forEach(k => { if (typeof p[k] === 'boolean') S[k] = p[k]; });
    if (p.speed != null) { S.speedOn = p.speed !== 1; S.speedVal = p.speed; }
    if (p.zoom != null) { S.zoomOn = p.zoom !== 1; S.zoomVal = p.zoom; }
    save(); if (root) render(); sync();
  }
  window.OvOMH = { init() { build(); sync(); }, settings: S, open: openMenu, close, applyPreset };
})();
