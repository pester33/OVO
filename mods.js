/* OvO Web — community Game Mods (data-only JSON mods, shared through Supabase) */
(function () {
  'use strict';
  const SUPABASE_URL = 'https://fowocvidnvzlxuanslmx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_CBDMUiz2sFBeZjtSod743g_sCIvFa-_'; // publishable key: safe in the browser, access is limited by RLS
  const API = SUPABASE_URL + '/rest/v1';
  const HEAD = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };

  const EXAMPLE = {
    name: 'Moon Gravity',
    author: 'Pester',
    version: '1.0',
    description: 'Floaty jumps, a dark night sky and one bonus level.',
    physics: { gravity: 0.5, jump: 0.85, speed: 1.1 },
    colors: { background: '#10131c', solid: '#d8d8d8', text: '#ffffff' },
    levels: [
      { name: 'Moonwalk', objs: [
        ['Solid', 0, 480, 1400, 160, 0], ['Collider', 112, 448, 32, 64, 0],
        ['Spike', 560, 464, 32, 32, 0], ['Spike', 592, 464, 32, 32, 0], ['Spike', 624, 464, 32, 32, 0], ['Spike', 656, 464, 32, 32, 0],
        ['EndFlag', 1260, 381, 97, 199, 0] ] },
    ],
  };

  // ---------- validation (mods are data only: nothing in a mod can run code) ----------
  const clamp = (v, a, b, d) => { v = Number(v); return isFinite(v) ? Math.max(a, Math.min(b, v)) : d; };
  const COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  function validate(raw) {
    let m = raw;
    if (typeof raw === 'string') { try { m = JSON.parse(raw); } catch (e) { throw new Error('That isn’t valid JSON: ' + e.message); } }
    if (!m || typeof m !== 'object' || Array.isArray(m)) throw new Error('A mod must be a JSON object { ... }');
    const out = {
      name: String(m.name || '').trim().slice(0, 40), author: String(m.author || '').trim().slice(0, 30),
      version: String(m.version || '1.0').slice(0, 12), description: String(m.description || '').slice(0, 300),
      physics: {}, colors: {}, levels: [], megahack: null,
    };
    if (!out.name) throw new Error('The mod needs a "name"');
    const ph = m.physics || {};
    ['gravity', 'jump', 'speed'].forEach(k => { if (ph[k] != null) out.physics[k] = clamp(ph[k], 0.25, 3, 1); });
    const co = m.colors || {};
    ['background', 'solid', 'text'].forEach(k => { if (co[k] != null) { if (!COLOR.test(String(co[k]))) throw new Error(`colors.${k} must look like "#1a2b3c"`); out.colors[k] = String(co[k]); } });
    if (m.levels != null) {
      if (!Array.isArray(m.levels)) throw new Error('"levels" must be a list');
      out.levels = m.levels.slice(0, 20).map((l, i) => { try { return window.OvOEditor.sanitize(l); } catch (e) { throw new Error(`levels[${i}]: ${e.message}`); } });
    }
    if (m.megahack && typeof m.megahack === 'object') {
      const h = m.megahack, mh = {};
      ['noclip', 'infJump', 'practice', 'hitboxes', 'trail', 'info', 'hideHud', 'clickTp', 'safe'].forEach(k => { if (typeof h[k] === 'boolean') mh[k] = h[k]; });
      if (h.speed != null) mh.speed = clamp(h.speed, 0.1, 3, 1);
      if (h.zoom != null) mh.zoom = clamp(h.zoom, 0.3, 2.5, 1);
      if (Object.keys(mh).length) out.megahack = mh;
    }
    if (!Object.keys(out.physics).length && !Object.keys(out.colors).length && !out.levels.length && !out.megahack) throw new Error('The mod doesn’t change anything — add "physics", "colors" or "levels"');
    if (JSON.stringify(out).length > 200000) throw new Error('The mod is too big (200 KB max)');
    return out;
  }

  // ---------- local install state ----------
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  let installed = LS.get('ovo_mods', []); // [{key, id?, on, mod}]
  const save = () => LS.set('ovo_mods', installed);
  function active() { return installed.filter(x => x.on).map(x => x.mod); }
  function apply() {
    const merged = { gravity: 1, jump: 1, speed: 1, colors: {} };
    for (const m of active()) { for (const k of ['gravity', 'jump', 'speed']) if (m.physics[k]) merged[k] *= m.physics[k]; Object.assign(merged.colors, m.colors); }
    for (const k of ['gravity', 'jump', 'speed']) merged[k] = clamp(merged[k], 0.25, 3, 1);
    window.OvO.setMods(merged);
  }
  function modLevels() { const out = []; for (const m of active()) m.levels.forEach((l, i) => out.push(Object.assign({}, l, { id: 'mod-' + m.name + '-' + i, author: l.author || m.author, fromMod: m.name }))); return out; }
  function install(mod, id) {
    const key = id || ('local-' + mod.name);
    installed = installed.filter(x => x.key !== key && !(x.mod.name === mod.name && x.mod.author === mod.author));
    installed.unshift({ key, id: id || null, on: true, mod }); save(); apply(); preset(mod);
  }

  function preset(mod) { if (mod.megahack && window.OvOMH) window.OvOMH.applyPreset(mod.megahack); }

  // ---------- Supabase (REST) ----------
  async function sb(path, opts) {
    let r;
    try { r = await fetch(API + path, Object.assign({ headers: HEAD }, opts)); }
    catch (e) { throw new Error('Can’t reach the mod database from here. (If you’re on the claude.ai page, open the GitHub Pages version — this page blocks outside connections.)'); }
    if (!r.ok) { let t = ''; try { t = (await r.json()).message; } catch (e) {} throw new Error(t || ('Database error ' + r.status + (r.status === 404 ? ' — has the SQL been run?' : ''))); }
    return r.status === 204 ? null : r.json();
  }
  const listMods = (q) => sb('/mods?select=id,created_at,name,author,description,version,downloads,data&hidden=eq.false&order=created_at.desc&limit=60' + (q ? '&name=ilike.*' + encodeURIComponent(q.replace(/[*,()]/g, '')) + '*' : ''));
  const publishMod = (m) => sb('/mods', { method: 'POST', headers: Object.assign({ Prefer: 'return=representation' }, HEAD), body: JSON.stringify({ name: m.name, author: m.author, description: m.description, version: m.version, data: m }) });
  const countDownload = (id) => sb('/rpc/mod_downloaded', { method: 'POST', body: JSON.stringify({ mod_id: id }) }).catch(() => {});

  // ---------- screen ----------
  let ui = null;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  function summary(m) {
    const bits = [];
    const p = m.physics; if (p.gravity) bits.push('gravity ×' + p.gravity); if (p.jump) bits.push('jump ×' + p.jump); if (p.speed) bits.push('speed ×' + p.speed);
    if (Object.keys(m.colors).length) bits.push('colours');
    if (m.levels.length) bits.push(m.levels.length + ' level' + (m.levels.length > 1 ? 's' : ''));
    if (m.megahack) bits.push('Mega Hack preset');
    return bits.join(' · ');
  }
  function renderInstalled() {
    const box = document.getElementById('modsInstalled'); box.innerHTML = '';
    if (!installed.length) { box.innerHTML = '<div class="empty">No mods installed yet. Install one from the community list, or install your own JSON.</div>'; return; }
    for (const it of installed) {
      const c = document.createElement('div'); c.className = 'card mod';
      c.innerHTML = `<div class="nm">${esc(it.mod.name)} <small>v${esc(it.mod.version)}</small></div>
        <div class="meta">${it.mod.author ? 'by ' + esc(it.mod.author) + ' · ' : ''}${esc(summary(it.mod))}</div>
        ${it.mod.description ? `<div class="desc">${esc(it.mod.description)}</div>` : ''}
        <div class="acts"><button class="${it.on ? 'primary' : ''}" data-a="toggle">${it.on ? 'ON' : 'OFF'}</button><button data-a="json">View JSON</button>${it.id ? '' : '<button data-a="pub">Publish</button>'}<button class="danger" data-a="rm">Remove</button></div>`;
      c.querySelector('[data-a=toggle]').onclick = () => { it.on = !it.on; save(); apply(); if (it.on) preset(it.mod); renderInstalled(); };
      c.querySelector('[data-a=rm]').onclick = () => { installed = installed.filter(x => x !== it); save(); apply(); renderInstalled(); };
      c.querySelector('[data-a=json]').onclick = () => ui.dialog(`<h2>${esc(it.mod.name)}</h2><textarea readonly id="modJson">${esc(JSON.stringify(it.mod, null, 2))}</textarea><div class="btns"><button data-a="ok" class="primary">Close</button></div>`, { ok: ui.closeDlg });
      const pb = c.querySelector('[data-a=pub]'); if (pb) pb.onclick = () => confirmPublish(it.mod, it);
      box.appendChild(c);
    }
  }
  async function renderCommunity(q) {
    const box = document.getElementById('modsCommunity'); box.innerHTML = '<div class="empty">Loading community mods…</div>';
    try {
      const rows = await listMods(q);
      box.innerHTML = rows.length ? '' : '<div class="empty">No mods published yet — be the first! Use “Publish a mod”.</div>';
      for (const r of rows) {
        let mod; try { mod = validate(r.data); } catch (e) { continue; }
        const have = installed.some(x => x.id === r.id);
        const c = document.createElement('div'); c.className = 'card mod';
        c.innerHTML = `<div class="nm">${esc(mod.name)} <small>v${esc(mod.version)}</small></div>
          <div class="meta">${mod.author ? 'by ' + esc(mod.author) + ' · ' : ''}${esc(summary(mod))} · ⬇ ${r.downloads}</div>
          ${mod.description ? `<div class="desc">${esc(mod.description)}</div>` : ''}
          <div class="acts"><button class="primary" data-a="get">${have ? 'Installed ✓' : 'Install'}</button></div>`;
        c.querySelector('[data-a=get]').onclick = (ev) => { install(mod, r.id); countDownload(r.id); ev.target.textContent = 'Installed ✓'; renderInstalled(); };
        box.appendChild(c);
      }
    } catch (e) { box.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  }
  function confirmPublish(mod, it) {
    ui.dialog(`<h2>Publish mod?</h2><p><b>${esc(mod.name)}</b>${mod.author ? ' by ' + esc(mod.author) : ''}</p><p class="small">It will be public in the community list for everyone. Only the database owner can remove it.</p>
      <div class="btns"><button class="primary" data-a="y">Publish</button><button data-a="n">Cancel</button></div>`, {
      n: ui.closeDlg,
      y: async (b) => {
        b.textContent = 'Publishing…'; b.disabled = true;
        try { const rows = await publishMod(mod); if (it && rows && rows[0]) { it.id = rows[0].id; it.key = rows[0].id; save(); } ui.closeDlg(); ui.toast('Published! It’s now in the community list.'); renderInstalled(); renderCommunity(); }
        catch (e) { ui.closeDlg(); ui.toast('Couldn’t publish: ' + esc(e.message)); }
      },
    });
  }
  function installDialog(publishAfter) {
    ui.dialog(`<h2>${publishAfter ? 'Publish a mod' : 'Install mod JSON'}</h2><p class="small">Paste your mod JSON below, or load a .json file. See Instructions for the format.</p>
      <textarea id="modIn" placeholder='{ "name": "My mod", "physics": { "gravity": 0.8 } }'></textarea>
      <div class="btns"><button class="primary" data-a="ok">${publishAfter ? 'Check & publish' : 'Install'}</button><label class="filebtn">Load .json file<input type="file" id="modFile" accept=".json,application/json" hidden></label><button data-a="ex">Paste the example</button><button data-a="c">Cancel</button></div>`, {
      c: ui.closeDlg,
      ex: () => { document.getElementById('modIn').value = JSON.stringify(EXAMPLE, null, 2); },
      ok: () => {
        let mod; try { mod = validate(document.getElementById('modIn').value); } catch (e) { return ui.toast(esc(e.message)); }
        if (publishAfter) return confirmPublish(mod, null);
        install(mod); ui.closeDlg(); renderInstalled(); ui.toast(`Installed “${esc(mod.name)}” and turned it on.`);
      },
    });
    document.getElementById('modFile').onchange = e => { const f = e.target.files[0]; if (f) f.text().then(t => { document.getElementById('modIn').value = t; }); };
  }
  function instructions() {
    ui.dialog(`<h2>Making a mod</h2><div class="instr">
      <p>A mod is a JSON file. It can change <b>physics</b>, <b>colors</b> and add <b>levels</b>. Mods are data only: they can’t run code, so installing one is always safe.</p>
      <p><b>Fields</b></p>
      <ul>
        <li><code>name</code> (required), <code>author</code>, <code>version</code>, <code>description</code></li>
        <li><code>physics.gravity</code>, <code>physics.jump</code>, <code>physics.speed</code>: multipliers from 0.25 to 3 (1 = normal)</li>
        <li><code>colors.background</code>, <code>colors.solid</code>, <code>colors.text</code>: hex colours like <code>"#10131c"</code></li>
        <li><code>megahack</code>: turns Mega Hack options on when the mod is installed or switched ON — <code>noclip</code>, <code>infJump</code>, <code>practice</code>, <code>hitboxes</code>, <code>trail</code>, <code>info</code>, <code>hideHud</code>, <code>clickTp</code>, <code>safe</code> (true/false), <code>speed</code> (0.1–3), <code>zoom</code> (0.3–2.5)</li>
        <li><code>levels</code>: a list of levels (up to 20). The easiest way to get one: build it in the editor, then Share → Download .json, and paste its <code>name</code> and <code>objs</code> here.</li>
      </ul>
      <p><b>Install</b>: press “Install from JSON”, paste the mod and press Install. Installed mods can be turned ON/OFF; several mods stack (physics multiply, later colours win). Mod levels show up in Custom levels.</p>
      <p><b>Share</b>: press Publish on an installed mod (or “Publish a mod”) to add it to the community list.</p>
      <p><b>Example</b></p></div>
      <textarea readonly id="modEx">${esc(JSON.stringify(EXAMPLE, null, 2))}</textarea>
      <div class="btns"><button class="primary" data-a="copy">Copy example</button><button data-a="ok">Close</button></div>`, {
      ok: ui.closeDlg,
      copy: (b) => { const t = document.getElementById('modEx'); (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).catch(() => { t.select(); document.execCommand('copy'); }); b.textContent = 'Copied ✓'; },
    });
  }
  function init(h) {
    ui = h; apply();
    document.getElementById('modsInstall').onclick = () => installDialog(false);
    document.getElementById('modsPublish').onclick = () => installDialog(true);
    document.getElementById('modsHelp').onclick = instructions;
    document.getElementById('modsRefresh').onclick = () => renderCommunity(document.getElementById('modsSearch').value.trim());
    document.getElementById('modsSearch').onkeydown = e => { if (e.key === 'Enter') renderCommunity(e.target.value.trim()); };
  }
  function open() { renderInstalled(); renderCommunity(); }

  window.OvOMods = { init, open, validate, modLevels, apply, EXAMPLE, active };
})();
