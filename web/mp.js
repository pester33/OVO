/* OvO Web — Multiplayer mod: rooms, live ghosts and races over Supabase Realtime (broadcast) */
(function () {
  'use strict';
  const HOST = 'fowocvidnvzlxuanslmx.supabase.co', KEY = 'sb_publishable_CBDMUiz2sFBeZjtSod743g_sCIvFa-_';
  const COLORS = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6', '#9a6324', '#469990', '#000075'];
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // ---------- transports ----------
  // Minimal Supabase Realtime (Phoenix channels) client: public broadcast channel, no database needed.
  function realtimeTransport() {
    let ws = null, topic = '', ref = 0, hb = null, onMsg = null, onStatus = null, closed = false, retry = 0;
    const send = (o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
    function open() {
      ws = new WebSocket(`wss://${HOST}/realtime/v1/websocket?apikey=${encodeURIComponent(KEY)}&vsn=1.0.0`);
      ws.onopen = () => {
        retry = 0;
        send({ topic, event: 'phx_join', payload: { config: { broadcast: { self: false, ack: false }, presence: { key: '' }, private: false } }, ref: String(++ref), join_ref: '1' });
        clearInterval(hb); hb = setInterval(() => send({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++ref) }), 25000);
      };
      ws.onmessage = (e) => {
        let m; try { m = JSON.parse(e.data); } catch (err) { return; }
        if (m.event === 'phx_reply' && m.topic === topic && m.payload) {
          if (m.payload.status === 'ok') onStatus('connected'); else onStatus('error', (m.payload.response && (m.payload.response.reason || m.payload.response.message)) || 'join refused');
        } else if (m.event === 'broadcast' && m.payload && m.payload.event === 'm') onMsg(m.payload.payload);
        else if (m.event === 'phx_error' || m.event === 'system' && m.payload && m.payload.status === 'error') onStatus('error', (m.payload && m.payload.message) || 'channel error');
      };
      ws.onclose = () => { clearInterval(hb); if (closed) return; onStatus('reconnecting'); setTimeout(() => !closed && open(), Math.min(8000, 1000 * Math.pow(2, retry++))); };
      ws.onerror = () => onStatus('error', 'Can’t connect to the multiplayer server (on the claude.ai page outside connections are blocked — use the GitHub Pages site).');
    }
    return {
      connect(room, msg, status) { topic = 'realtime:ovo-room-' + room; onMsg = msg; onStatus = status; closed = false; onStatus('connecting'); open(); },
      send(obj) { send({ topic, event: 'broadcast', payload: { type: 'broadcast', event: 'm', payload: obj }, ref: String(++ref) }); },
      close() { closed = true; clearInterval(hb); try { send({ topic, event: 'phx_leave', payload: {}, ref: String(++ref) }); ws && ws.close(); } catch (e) {} },
    };
  }
  // Local test transport (same browser, other tabs): enable with ?mpfake=1
  function fakeTransport() {
    let bc = null;
    return {
      connect(room, msg, status) { bc = new BroadcastChannel('ovo-mp-' + room); bc.onmessage = e => msg(e.data); setTimeout(() => status('connected'), 50); },
      send(o) { bc && bc.postMessage(o); }, close() { bc && bc.close(); bc = null; },
    };
  }

  // ---------- state ----------
  const me = { id: Math.random().toString(36).slice(2, 10), name: LS.get('ovo_mp_name', 'Player' + Math.floor(Math.random() * 900 + 100)), color: COLORS[Math.floor(Math.random() * COLORS.length)] };
  let tr = null, room = '', status = 'offline', peers = new Map(), race = null, ui = null, sendT = 0, lastHi = 0;
  const fake = /[?&]mpfake=1/.test(location.search) || LS.get('ovo_mp_fake', false);

  function join(code) {
    leave(true);
    room = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); if (!room) return;
    LS.set('ovo_mp_room', room);
    tr = fake ? fakeTransport() : realtimeTransport();
    tr.connect(room, onMsg, (s, why) => { status = s; if (s === 'connected') hello(); if (why) ui && ui.toast(esc(why)); renderLobby(); });
    renderLobby();
  }
  function leave(silent) { if (tr) { tr.send({ k: 'bye', id: me.id }); tr.close(); } tr = null; room = ''; status = 'offline'; peers.clear(); race = null; if (!silent) renderLobby(); hud(); }
  const send = (o) => { if (tr && status === 'connected') tr.send(Object.assign({ id: me.id, n: me.name, c: me.color }, o)); };
  function hello() { send({ k: 'hi', lv: levelId() }); lastHi = performance.now(); }

  function levelId() { const c = window.__ovo && window.__ovo.current && window.__ovo.current(); if (!c || document.getElementById('hud').hidden) return null; return c.kind === 'main' ? 'm' + c.n : 'c:' + (c.data.id || c.data.name); }

  function onMsg(m) {
    if (!m || m.id === me.id) return;
    let p = peers.get(m.id);
    if (!p) { p = { id: m.id, rig: null, ix: m.x || 0, iy: m.y || 0 }; peers.set(m.id, p); if (m.k !== 'bye') hello(); }
    p.name = String(m.n || '?').slice(0, 16); p.color = /^#[0-9a-f]{6}$/i.test(m.c) ? m.c : '#555'; p.seen = performance.now();
    if (m.k === 'bye') { peers.delete(m.id); renderLobby(); hud(); return; }
    if (m.k === 'hi') { p.lv = m.lv || null; renderLobby(); hud(); }
    if (m.k === 'p') { const jump = p.lv !== m.lv || Math.hypot(m.x - p.ix, m.y - p.iy) > 400; Object.assign(p, { lv: m.lv, x: +m.x, y: +m.y, s: m.s < 0 ? -1 : 1, st: String(m.st || 'idle'), a: +m.a || 0, f: String(m.f || 'stand'), dead: !!m.d }); if (jump || !p.rig) { p.ix = p.x; p.iy = p.y; p.rig = OvO.RIG.makeRig(p.x, p.y); p.tick = 0; p.once = {}; } }
    if (m.k === 'race') startRace(m, false);
    if (m.k === 'fin' && race && m.rid === race.rid) { race.results.set(m.id, { name: p.name, color: p.color, t: +m.t, d: +m.d }); raceBoard(); }
  }

  // ---------- race ----------
  function startRace(spec, local) {
    race = { rid: spec.rid, lv: spec.lv, results: new Map(), startedBy: local ? me.name : (spec.n || '?') };
    if (local) send(Object.assign({ k: 'race' }, spec));
    ui.closeDlg(); let n = 3;
    const ov = document.getElementById('mpCount'); ov.hidden = false; ov.textContent = n;
    const tick = setInterval(() => {
      n--; if (n > 0) { ov.textContent = n; return; }
      clearInterval(tick); ov.textContent = 'GO!'; setTimeout(() => { ov.hidden = true; }, 600);
      if (spec.lv.kind === 'main') ui.playMain(spec.lv.n); else ui.playCustom(Object.assign(window.OvOEditor.sanitize(spec.lv.data), { id: 'race-' + spec.rid }));
      race.lid = levelId(); raceBoard();
    }, 1000);
  }
  function onFinish(res) {
    if (!race || !race.lid || race.lid !== levelId()) return;
    race.results.set(me.id, { name: me.name + ' (you)', color: me.color, t: res.time, d: res.deaths });
    send({ k: 'fin', rid: race.rid, t: res.time, d: res.deaths }); raceBoard();
  }
  function raceBoard() {
    const el = document.getElementById('mpBoard'); if (!race) { el.hidden = true; return; }
    const rows = [...race.results.values()].sort((a, b) => a.t - b.t);
    el.hidden = false;
    el.innerHTML = `<b>Race</b> <button id="mpBoardX">×</button>` + (rows.length ? rows.map((r, i) => `<div><span style="color:${r.color}">●</span> ${i + 1}. ${esc(r.name)} — ${r.t.toFixed(2)}s</div>`).join('') : '<div class="small">Nobody has finished yet</div>');
    document.getElementById('mpBoardX').onclick = () => { race = null; el.hidden = true; };
  }

  // ---------- per-frame: send my state, draw others ----------
  function frame(game, dt) {
    if (!tr || status !== 'connected') return;
    const now = performance.now();
    const lv = levelId(); sendT += dt;
    if (lv && game.p && sendT >= 0.1) {
      sendT = 0; const p = game.p;
      send({ k: 'p', lv, x: Math.round(p.x), y: Math.round(p.y), s: p.side, st: p.ost || 'idle', a: Math.round(p.ang), f: p.frame, d: p.dead ? 1 : 0 });
    }
  }
  function draw(ctx, game) {
    const lv = levelId(); if (!lv) return;
    const RIG = OvO.RIG;
    for (const p of peers.values()) {
      if (p.lv !== lv || !p.rig || p.dead) continue;
      p.ix += (p.x - p.ix) * 0.25; p.iy += (p.y - p.iy) * 0.25;
      const R = p.rig; p.tick++;
      for (const n in RIG.RIGDEF) R[n].mir = p.s < 0 ? -1 : 1;
      const a = p.a * Math.PI / 180, by = RIG.BODYPOS[p.f] || 8, bx = p.ix - Math.sin(a) * by, byy = p.iy + Math.cos(a) * by;
      window.OvORigAnimate(R, { State: p.st, Side: p.s, Angle: ((p.a % 360) + 360) % 360, Skin: '', ipx: () => bx, ipy: () => byy }, 1 / 60, performance.now() / 1000,
        id => { const r = p.once[id] !== p.tick - 1; p.once[id] = p.tick; return r; }, RIG.rigIpos);
      RIG.drawRig(ctx, R, 0, 0, 0.75);
      ctx.save(); ctx.font = '12px Retron, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      const w = ctx.measureText(p.name).width + 10; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(p.ix - w / 2, p.iy - 74, w, 16);
      ctx.fillStyle = p.color; ctx.fillText(p.name, p.ix, p.iy - 59); ctx.restore();
    }
  }

  // ---------- UI ----------
  function hud() {
    const el = document.getElementById('mpHud'); if (!el) return;
    const lv = levelId(); const here = [...peers.values()].filter(p => p.lv && p.lv === lv).length;
    el.hidden = !tr || document.getElementById('hud').hidden;
    el.textContent = `👥 ${peers.size + 1} · room ${room}` + (lv ? ` · ${here} here` : '');
  }
  function renderLobby() {
    const st = document.getElementById('mpStatus'); if (!st) return;
    const txt = { offline: 'Not in a room', connecting: 'Connecting…', reconnecting: 'Reconnecting…', connected: 'Connected to room ' + room, error: 'Connection problem' }[status] || status;
    st.textContent = txt; st.className = 'mp-status ' + status;
    document.getElementById('mpLeave').hidden = !tr;
    document.getElementById('mpRoomBox').hidden = !tr;
    const list = document.getElementById('mpPlayers');
    const where = lv => !lv ? 'in menus' : lv[0] === 'm' ? 'playing Level ' + lv.slice(1) : 'playing a custom level';
    list.innerHTML = `<div><span style="color:${me.color}">●</span> ${esc(me.name)} (you)</div>` + [...peers.values()].map(p => `<div><span style="color:${p.color}">●</span> ${esc(p.name)} <small>${where(p.lv)}</small></div>`).join('');
    hud();
  }
  function fillRaceSelect() {
    const sel = document.getElementById('mpRaceLevel'); const mine = LS.get('ovo_custom_levels', []);
    sel.innerHTML = window.OVO_LEVELS.map(l => `<option value="m:${l.n}">Level ${l.n}</option>`).join('') +
      mine.map((l, i) => `<option value="c:${i}">Custom: ${esc(l.name)}</option>`).join('') +
      (window.OVO_FEATURED || []).map((l, i) => `<option value="f:${i}">Featured: ${esc(l.name)}</option>`).join('');
  }
  function init(h) {
    ui = h;
    document.getElementById('mpName').value = me.name;
    document.getElementById('mpName').onchange = e => { me.name = e.target.value.trim().slice(0, 16) || me.name; LS.set('ovo_mp_name', me.name); hello(); renderLobby(); };
    document.getElementById('mpCode').value = LS.get('ovo_mp_room', '');
    document.getElementById('mpJoin').onclick = () => join(document.getElementById('mpCode').value);
    document.getElementById('mpCreate').onclick = () => { const c = Math.random().toString(36).slice(2, 7).toUpperCase(); document.getElementById('mpCode').value = c; join(c); };
    document.getElementById('mpLeave').onclick = () => leave();
    document.getElementById('mpRace').onclick = () => {
      if (!tr || status !== 'connected') return ui.toast('Join a room first.');
      const v = document.getElementById('mpRaceLevel').value, [t, i] = v.split(':');
      let lv;
      if (t === 'm') lv = { kind: 'main', n: +i };
      else { const src = t === 'c' ? LS.get('ovo_custom_levels', [])[+i] : window.OVO_FEATURED[+i]; if (!src) return; lv = { kind: 'custom', data: { name: src.name, objs: src.objs } }; }
      if (lv.kind === 'custom' && JSON.stringify(lv).length > 200000) return ui.toast('That level is too big to send in a race.');
      startRace({ rid: Math.random().toString(36).slice(2, 9), lv, n: me.name }, true);
    };
    document.getElementById('mpCopy').onclick = (e) => { const t = room; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { e.target.textContent = 'Copied ✓'; }).catch(() => {}); };
    addEventListener('beforeunload', () => { if (tr) tr.send({ k: 'bye', id: me.id }); });
    setInterval(() => {
      hud(); if (!tr || status !== 'connected') return;
      const now = performance.now();
      if (now - lastHi > 2500) hello();
      for (const [id, p] of peers) if (now - p.seen > 7000) { peers.delete(id); renderLobby(); }
    }, 1000);
    // rejoin last room automatically if the multiplayer mod is on
    if (LS.get('ovo_mp_on', false) && LS.get('ovo_mp_room', '')) join(LS.get('ovo_mp_room', ''));
  }
  function openLobby() { fillRaceSelect(); renderLobby(); document.getElementById('mpRoomCode').textContent = room || '—'; }
  setInterval(() => { const el = document.getElementById('mpRoomCode'); if (el) el.textContent = room || '—'; }, 500);

  window.OvOMP = { init, openLobby, frame, draw, onFinish, join, leave, get room() { return room; }, get status() { return status; }, peers, me };
})();
