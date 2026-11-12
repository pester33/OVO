/* OvO Web — menus, HUD, input, custom levels, mobile support */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const E = window.OvOEditor;
  const cv = $('#game');
  const game = new OvO.Game(cv);
  game.mobile = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const editor = new E.Editor();
  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

  let progress = LS.get('ovo_progress', { done: {}, coins: {}, custom: {} });
  let opts = LS.get('ovo_opts', { sfx: true, music: true, hard: false, touch: 'auto', touchSize: 1 });
  let mine = LS.get('ovo_custom_levels', []);
  let current = null; // {kind:'main'|'custom', n, data}

  // ---------- canvas sizing ----------
  function resize() {
    const d = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(innerWidth * d); cv.height = Math.round(innerHeight * d);
    game.viewH = innerHeight < 500 ? 560 : 620;
    $('#rotateHint').hidden = !(isTouch && innerHeight > innerWidth && current && !$('#hud').hidden);
  }
  addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 200));

  // ---------- screens ----------
  const screens = { menu: '#scrMenu', levels: '#scrLevels', custom: '#scrCustom', options: '#scrOptions' };
  function show(name) {
    for (const k in screens) $(screens[k]).hidden = k !== name;
    $('#scrEditor').hidden = true;
    const playing = name === null;
    $('#hud').hidden = !playing; setTouch(playing);
    if (name === 'levels') renderLevels();
    if (name === 'custom') renderCustom();
    if (name) { game.running = false; OvO.playMusic('MenuTrack'); }
    resize();
  }
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { OvO.sfx('Click', 0.4); show(b.dataset.go); }));

  // ---------- level select ----------
  function fmt(t) { return t == null ? '' : t.toFixed(2); }
  function renderLevels() {
    const box = $('#sections'); box.innerHTML = '';
    const levels = window.OVO_LEVELS;
    for (const s of window.OVO_SECTIONS) {
      const [a, b] = s.levels; const list = levels.filter(l => l.n >= a && l.n <= b); if (!list.length) continue;
      const doneN = list.filter(l => progress.done[l.n] != null).length;
      const sec = document.createElement('div'); sec.className = 'section';
      sec.innerHTML = `<div class="section-title">${s.name}<small>${doneN}/${list.length}</small></div><div class="lvl-grid"></div>`;
      const grid = sec.querySelector('.lvl-grid');
      for (const l of list) {
        const btn = document.createElement('button'); btn.className = 'lvl' + (progress.done[l.n] != null ? ' done' : '');
        btn.innerHTML = `${l.n}${progress.coins[l.n] ? '<span class="c">©</span>' : ''}<span class="t">${fmt(progress.done[l.n])}</span>`;
        btn.onclick = () => playMain(l.n);
        grid.appendChild(btn);
      }
      box.appendChild(sec);
    }
  }
  function playMain(n) {
    const def = window.OVO_LEVELS.find(l => l.n === n); if (!def) return show('levels');
    current = { kind: 'main', n }; startLevel(def, 'Level ' + n);
  }
  function playCustom(data, fromEditor) {
    current = { kind: 'custom', data, fromEditor }; startLevel(E.toDef(data), data.name || 'Custom level');
  }
  function startLevel(def, label) {
    for (const k in screens) $(screens[k]).hidden = true;
    editor.close(); cv.hidden = false;
    $('#hud').hidden = false; $('#hudLevel').textContent = label; setTouch(true); closeDlg();
    game.hard = !!opts.hard; game.load(def); game.cam.x = game.p.x; game.cam.y = game.p.y;
    OvO.playMusic('Track1'); resize();
  }

  game.onWin = res => {
    let best = false;
    if (current.kind === 'main') {
      const prev = progress.done[current.n]; if (prev == null || res.time < prev) { progress.done[current.n] = res.time; best = prev != null; }
      if (res.coin) progress.coins[current.n] = true; LS.set('ovo_progress', progress);
    } else if (current.data.id) {
      const prev = progress.custom[current.data.id]; if (!current.fromEditor && (prev == null || res.time < prev)) { progress.custom[current.data.id] = res.time; LS.set('ovo_progress', progress); }
    }
    setTouch(false);
    const hasNext = current.kind === 'main' && window.OVO_LEVELS.some(l => l.n === current.n + 1);
    dialog(`<h2>Level complete!</h2>
      <div class="stat"><span>⏱ ${res.time.toFixed(2)}</span><span>✕ ${res.deaths}</span><span>${res.coin ? '© got' : '© —'}</span></div>
      ${best ? '<p>New best time!</p>' : ''}
      <div class="btns">
        ${current.fromEditor ? '<button class="primary" data-a="edit">Back to editor</button>' : ''}
        ${hasNext ? '<button class="primary" data-a="next">Next level ›</button>' : ''}
        <button data-a="retry">Retry</button>
        <button data-a="menu">${current.kind === 'main' ? 'Level select' : 'Custom levels'}</button>
      </div>`, {
      next: () => playMain(current.n + 1), retry: () => { closeDlg(); game.restart(); setTouch(true); },
      menu: () => leaveLevel(), edit: () => openEditor(current.data),
    });
  };
  function leaveLevel() { closeDlg(); if (current && current.fromEditor) return openEditor(current.data); show(current && current.kind === 'custom' ? 'custom' : 'levels'); current = null; }

  function pause() {
    if (!game.running || game.won) return;
    game.paused = true; setTouch(false);
    dialog(`<h2>Paused</h2><p>${$('#hudLevel').textContent}</p><div class="btns">
      <button class="primary" data-a="resume">Resume</button><button data-a="restart">Restart</button>
      ${current.fromEditor ? '<button data-a="edit">Back to editor</button>' : ''}
      <button data-a="quit">Quit</button></div>`, {
      resume: () => { closeDlg(); game.paused = false; setTouch(true); },
      restart: () => { closeDlg(); game.paused = false; game.restart(); setTouch(true); },
      edit: () => { game.paused = false; openEditor(current.data); },
      quit: () => { game.paused = false; leaveLevel(); },
    }, () => { game.paused = false; setTouch(true); });
  }
  $('#btnPause').onclick = pause;

  // HUD ticker
  setInterval(() => {
    if ($('#hud').hidden || !game.level) return;
    $('#hudTime').textContent = game.time.toFixed(2); $('#hudDeaths').textContent = game.deaths; $('#hudCoin').hidden = !game.coinGot;
  }, 50);

  // ---------- dialogs ----------
  let dlgCancel = null;
  function dialog(html, actions, onCancel) {
    $('#dlgBox').innerHTML = html; $('#dlg').hidden = false; dlgCancel = onCancel || null;
    $('#dlgBox').querySelectorAll('[data-a]').forEach(b => b.onclick = () => { OvO.sfx('Click', 0.4); const f = actions[b.dataset.a]; if (f) f(b); });
  }
  function closeDlg() { $('#dlg').hidden = true; dlgCancel = null; }
  $('#dlg').addEventListener('pointerdown', e => { if (e.target.id === 'dlg' && dlgCancel) { const f = dlgCancel; closeDlg(); f(); } });
  function promptDlg(title, value, cb, area) {
    dialog(`<h2>${title}</h2>${area ? `<textarea id="dlgIn">${value || ''}</textarea>` : `<input id="dlgIn" style="width:100%" maxlength="200">`}
      <div class="btns"><button class="primary" data-a="ok">OK</button><button data-a="cancel">Cancel</button></div>`,
      { ok: () => { const v = $('#dlgIn').value; closeDlg(); cb(v); }, cancel: () => closeDlg() });
    const i = $('#dlgIn'); if (!area) i.value = value || ''; setTimeout(() => i.focus(), 50);
  }
  function toast(msg) { dialog(`<p>${msg}</p><div class="btns"><button class="primary" data-a="ok">OK</button></div>`, { ok: closeDlg }); }

  // ---------- custom levels ----------
  function saveMine() { LS.set('ovo_custom_levels', mine); }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
  function card(data, own) {
    const c = document.createElement('div'); c.className = 'card';
    const best = data.id && progress.custom[data.id];
    c.innerHTML = `<canvas></canvas><div class="nm">${esc(data.name || 'Untitled')}</div>
      <div class="meta">${data.author ? 'by ' + esc(data.author) + ' · ' : ''}${data.objs.length} objects${best != null ? ' · best ' + best.toFixed(2) : ''}</div>
      <div class="acts"><button class="primary" data-a="play">▶ Play</button>${own ? '<button data-a="edit">Edit</button><button data-a="share">Share</button><button data-a="del" class="danger">✕</button>' : '<button data-a="copy">Copy to mine</button><button data-a="share">Share</button>'}</div>`;
    c.querySelector('[data-a=play]').onclick = () => playCustom(data);
    const on = (a, f) => { const b = c.querySelector(`[data-a=${a}]`); if (b) b.onclick = f; };
    on('edit', () => openEditor(data));
    on('share', () => shareLevel(data));
    on('copy', () => { const d = JSON.parse(JSON.stringify(data)); d.id = 'my-' + Date.now(); d.name += ' (copy)'; mine.unshift(d); saveMine(); renderCustom(); });
    on('del', () => dialog(`<h2>Delete?</h2><p>"${esc(data.name)}" will be removed.</p><div class="btns"><button class="danger" data-a="y">Delete</button><button data-a="n">Cancel</button></div>`,
      { y: () => { mine = mine.filter(m => m.id !== data.id); saveMine(); closeDlg(); renderCustom(); }, n: closeDlg }));
    requestAnimationFrame(() => E.thumb(c.querySelector('canvas'), data));
    return c;
  }
  function renderCustom() {
    const my = $('#myLevels'); my.innerHTML = '';
    if (!mine.length) my.innerHTML = '<div class="empty">No levels yet — tap “+ New level” to build one.</div>';
    mine.forEach(d => my.appendChild(card(d, true)));
    const f = $('#featuredLevels'); f.innerHTML = '';
    (window.OVO_FEATURED || []).forEach(d => f.appendChild(card(d, false)));
  }
  function shareLevel(data) {
    const code = E.encode(data);
    const url = location.origin + location.pathname + '#level=' + code;
    dialog(`<h2>Share level</h2><p>Send this code (or link) to a friend. They can paste it in “Import code”.</p>
      <textarea id="shareCode" readonly>${code}</textarea>
      <div class="btns"><button class="primary" data-a="copy">Copy code</button>${window.top === window ? '<button data-a="link">Copy link</button>' : ''}<button data-a="file">Download .json</button><button data-a="close">Close</button></div>`, {
      copy: b => copy(code, b), link: b => copy(url, b), close: closeDlg,
      file: () => { const blob = new Blob([JSON.stringify({ v: 1, name: data.name, author: data.author || '', objs: data.objs })], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (data.name || 'level').replace(/[^\w\- ]+/g, '') + '.ovo.json'; a.click(); },
    });
  }
  function copy(text, btn) {
    const done = () => { btn.textContent = 'Copied ✓'; };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => { $('#shareCode').select(); document.execCommand('copy'); done(); });
    else { $('#shareCode').select(); document.execCommand('copy'); done(); }
  }
  function importData(d) { d.id = 'my-' + Date.now(); mine.unshift(d); saveMine(); renderCustom(); return d; }
  $('#btnImport').onclick = () => promptDlg('Paste level code', '', v => {
    try { const d = importData(E.decode(v)); dialog(`<h2>Imported!</h2><p>${esc(d.name)}</p><div class="btns"><button class="primary" data-a="p">▶ Play now</button><button data-a="c">OK</button></div>`, { p: () => playCustom(d), c: closeDlg }); }
    catch (e) { toast('That code didn’t work: ' + esc(e.message)); }
  }, true);
  $('#fileImport').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => { try { importData(E.decode(t)); } catch (err) { toast('Could not read file: ' + esc(err.message)); } });
    e.target.value = '';
  };
  $('#btnNewLevel').onclick = () => {
    const d = { v: 1, id: 'my-' + Date.now(), name: 'My level ' + (mine.length + 1), author: '', objs: [
      ['Solid', 0, 480, 1280, 160, 0], ['Collider', 112, 448, 32, 64, 0], ['EndFlag', 1150, 381, 97, 199, 0]] };
    mine.unshift(d); saveMine(); openEditor(d);
  };

  // ---------- editor ----------
  function openEditor(data) {
    closeDlg(); current = null; game.running = false;
    for (const k in screens) $(screens[k]).hidden = true;
    $('#hud').hidden = true; setTouch(false); $('#rotateHint').hidden = true;
    cv.hidden = true; OvO.playMusic(null);
    editor.open(data, {
      save: d => { persist(d); editor.hint('Saved ✓'); setTimeout(() => editor.setTool(editor.tool), 1200); },
      test: d => { persist(d); playCustom(d, true); },
      exit: d => { persist(d); editor.close(); cv.hidden = false; show('custom'); },
      prompt: (t, v, cb) => promptDlg(t, v, cb),
      more: d => dialog(`<h2>Level</h2><div class="btns"><button data-a="share">Share / export</button><button data-a="clear" class="danger">Clear everything</button><button data-a="help">Controls help</button><button data-a="close">Close</button></div>`, {
        share: () => { persist(d); shareLevel(d); }, close: closeDlg,
        clear: () => { editor.snapshot(); editor.data.objs = []; closeDlg(); },
        help: () => toast('Pick a tool at the bottom, then tap/drag on the grid.<br><br>Two fingers (or right-drag / mouse wheel) to pan &amp; zoom.<br>⟳ rotates spikes, boosts and portals.<br>Keys: 1–9 tools, Q rotate, E erase, Ctrl+Z undo.'),
      }),
    });
  }
  function persist(d) {
    d = JSON.parse(JSON.stringify(d)); if (!d.id) d.id = 'my-' + Date.now();
    const i = mine.findIndex(m => m.id === d.id); if (i >= 0) mine[i] = d; else mine.unshift(d);
    saveMine(); if (editor.data) editor.data.id = d.id;
  }

  // ---------- keyboard ----------
  const KEYS = { ArrowLeft: 'l', a: 'l', A: 'l', ArrowRight: 'r', d: 'r', D: 'r', ArrowUp: 'u', w: 'u', W: 'u', ' ': 'u', z: 'u', Z: 'u', ArrowDown: 'd', s: 'd', S: 'd' };
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (!$('#hud').hidden) {
      const k = KEYS[e.key]; if (k) { if (!e.repeat) game.key(k, 1); e.preventDefault(); }
      if ((e.key === 'r' || e.key === 'R') && !game.won && $('#dlg').hidden) game.restart();
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { if ($('#dlg').hidden) pause(); else if (dlgCancel) { const f = dlgCancel; closeDlg(); f(); } }
    }
  });
  addEventListener('keyup', e => { const k = KEYS[e.key]; if (k) game.key(k, 0); });
  addEventListener('blur', () => { game.input = { l: 0, r: 0, u: 0, d: 0 }; if (!$('#hud').hidden && $('#dlg').hidden) pause(); });

  // ---------- touch controls ----------
  const touchEl = $('#touch');
  const tbtns = [...touchEl.querySelectorAll('.tbtn')];
  function touchWanted() { return opts.touch === 'on' || (opts.touch === 'auto' && isTouch); }
  function setTouch(on) {
    touchEl.hidden = !(on && touchWanted());
    if (touchEl.hidden) { tbtns.forEach(b => b.classList.remove('on')); ['l', 'r', 'u', 'd'].forEach(k => game.input[k] = 0); }
  }
  const active = new Map(); // pointerId -> {x,y}
  function refreshTouch() {
    const pressed = new Set();
    for (const p of active.values()) {
      for (const b of tbtns) {
        const r = b.getBoundingClientRect(), pad = 14;
        if (p.x >= r.left - pad && p.x <= r.right + pad && p.y >= r.top - pad && p.y <= r.bottom + pad) pressed.add(b.dataset.k);
      }
    }
    for (const b of tbtns) b.classList.toggle('on', pressed.has(b.dataset.k));
    for (const k of ['l', 'r', 'u', 'd']) game.key(k, pressed.has(k));
  }
  // listen on window so a finger can slide between buttons
  addEventListener('pointerdown', e => { if (touchEl.hidden || e.pointerType === 'mouse' && !touchEl.contains(e.target)) return; if (!e.target.closest('.tbtn')) return; active.set(e.pointerId, { x: e.clientX, y: e.clientY }); refreshTouch(); e.preventDefault(); }, { passive: false });
  addEventListener('pointermove', e => { if (!active.has(e.pointerId)) return; active.set(e.pointerId, { x: e.clientX, y: e.clientY }); refreshTouch(); });
  const end = e => { if (active.delete(e.pointerId)) refreshTouch(); };
  addEventListener('pointerup', end); addEventListener('pointercancel', end);
  // stop iOS long-press / double-tap zoom
  document.addEventListener('touchstart', e => { if (e.target.closest && e.target.closest('.tbtn')) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('dblclick', e => e.preventDefault());

  // ---------- options ----------
  function applyOpts() {
    $('#optSfx').checked = opts.sfx; $('#optMusic').checked = opts.music; $('#optHard').checked = opts.hard;
    $('#optTouch').value = opts.touch; $('#optTouchSize').value = opts.touchSize;
    touchEl.style.setProperty('--s', opts.touchSize);
    OvO.setAudio(opts.sfx, opts.music);
  }
  const saveOpts = () => { opts = { sfx: $('#optSfx').checked, music: $('#optMusic').checked, hard: $('#optHard').checked, touch: $('#optTouch').value, touchSize: +$('#optTouchSize').value }; LS.set('ovo_opts', opts); applyOpts(); };
  ['#optSfx', '#optMusic', '#optHard', '#optTouch', '#optTouchSize'].forEach(s => $(s).addEventListener('change', saveOpts));
  $('#optTouchSize').addEventListener('input', saveOpts);
  $('#btnFullscreen').onclick = toggleFS;
  function toggleFS() {
    const d = document, el = d.documentElement;
    if (!d.fullscreenElement && !d.webkitFullscreenElement) {
      (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
    } else (d.exitFullscreen || d.webkitExitFullscreen).call(d);
  }
  $('#btnResetProgress').onclick = () => dialog('<h2>Reset progress?</h2><p>Times and coins will be cleared. Your custom levels stay.</p><div class="btns"><button class="danger" data-a="y">Reset</button><button data-a="n">Cancel</button></div>',
    { y: () => { progress = { done: {}, coins: {}, custom: {} }; LS.set('ovo_progress', progress); closeDlg(); }, n: closeDlg });

  // first interaction unlocks audio on mobile
  addEventListener('pointerdown', function unlock() { removeEventListener('pointerdown', unlock); if ($('#hud').hidden) OvO.playMusic('MenuTrack'); }, { once: true });

  // ---------- boot ----------
  applyOpts(); resize();
  document.fonts && document.fonts.load('16px Retron');
  const h = location.hash;
  const params = new URLSearchParams(location.search);
  if (h.startsWith('#level=')) {
    try { const d = E.decode(decodeURIComponent(h.slice(7))); d.id = 'shared-' + Date.now(); show('custom'); playCustom(d); } catch (e) { show('menu'); }
  } else show(params.get('screen') || 'menu');
  if (params.get('play')) playMain(+params.get('play'));
  if (params.get('custom') != null) { const f = window.OVO_FEATURED[+params.get('custom')]; if (f) playCustom(f); }
  if (params.get('edit') != null) { const f = window.OVO_FEATURED[+params.get('edit')]; if (f) openEditor(JSON.parse(JSON.stringify(f))); }
  window.__ovo = { game, editor, playMain, playCustom, openEditor };
})();
