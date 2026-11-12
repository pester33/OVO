/* OvO Web — online custom levels (upload / browse / play / like) via Supabase */
(function () {
  'use strict';
  const URL_ = 'https://fowocvidnvzlxuanslmx.supabase.co', KEY = 'sb_publishable_CBDMUiz2sFBeZjtSod743g_sCIvFa-_';
  const HEAD = { apikey: KEY, 'Content-Type': 'application/json' };
  async function sb(path, opts) {
    let r;
    try { r = await fetch(URL_ + '/rest/v1' + path, Object.assign({ headers: HEAD }, opts)); }
    catch (e) { throw new Error('Can’t reach the level database from here. (On the claude.ai page outside connections are blocked — use the GitHub Pages site.)'); }
    if (!r.ok) { let t = ''; try { t = (await r.json()).message; } catch (e) {} throw new Error(t || ('Database error ' + r.status + (r.status === 404 ? ' — has the SQL been run?' : ''))); }
    return r.status === 204 ? null : r.json();
  }
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  let liked = LS.get('ovo_liked', {}), sort = 'new', ui = null;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function list(q) {
    const order = sort === 'top' ? 'likes.desc,plays.desc' : sort === 'plays' ? 'plays.desc' : 'created_at.desc';
    return sb('/levels?select=id,created_at,name,author,description,plays,likes,data&hidden=eq.false&order=' + order + '&limit=48' +
      (q ? '&or=(name.ilike.*' + encodeURIComponent(q.replace(/[*,()]/g, '')) + '*,author.ilike.*' + encodeURIComponent(q.replace(/[*,()]/g, '')) + '*)' : ''));
  }
  const upload = (row) => sb('/levels', { method: 'POST', headers: Object.assign({ Prefer: 'return=representation' }, HEAD), body: JSON.stringify(row) });
  const rpc = (fn, id) => sb('/rpc/' + fn, { method: 'POST', body: JSON.stringify({ level_id: id }) }).catch(() => {});

  async function render() {
    const box = document.getElementById('onlineLevels'); if (!box) return;
    box.innerHTML = '<div class="empty">Loading online levels…</div>';
    try {
      const rows = await list(document.getElementById('onlineSearch').value.trim());
      box.innerHTML = rows.length ? '' : '<div class="empty">No levels uploaded yet — press Upload on one of your levels to be the first!</div>';
      for (const r of rows) {
        let data; try { data = window.OvOEditor.sanitize(r.data); } catch (e) { continue; }
        data.id = 'online-' + r.id; data.name = r.name; data.author = r.author;
        const c = document.createElement('div'); c.className = 'card';
        c.innerHTML = `<canvas></canvas><div class="nm">${esc(r.name)}</div>
          <div class="meta">${r.author ? 'by ' + esc(r.author) + ' · ' : ''}▶ ${r.plays} · ♥ ${r.likes}</div>
          ${r.description ? `<div class="meta">${esc(r.description)}</div>` : ''}
          <div class="acts"><button class="primary" data-a="play">▶ Play</button><button data-a="like">${liked[r.id] ? '♥ Liked' : '♡ Like'}</button><button data-a="save">Copy to mine</button></div>`;
        c.querySelector('[data-a=play]').onclick = () => { rpc('level_played', r.id); ui.play(data); };
        c.querySelector('[data-a=like]').onclick = (e) => {
          if (liked[r.id]) return; liked[r.id] = 1; LS.set('ovo_liked', liked); rpc('level_liked', r.id);
          e.target.textContent = '♥ Liked'; c.querySelector('.meta').innerHTML = c.querySelector('.meta').innerHTML.replace(/♥ \d+/, '♥ ' + (r.likes + 1));
        };
        c.querySelector('[data-a=save]').onclick = () => { ui.copyToMine(data); };
        box.appendChild(c);
        requestAnimationFrame(() => window.OvOEditor.thumb(c.querySelector('canvas'), data));
      }
    } catch (e) { box.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  }
  function uploadDialog(data) {
    if (!data.objs.some(o => o[0] === 'EndFlag')) return ui.toast('Add a flag to your level before uploading it.');
    ui.dialog(`<h2>Upload level</h2><p class="small">Everyone will be able to play it. Only the database owner can remove it. Beat it yourself first!</p>
      <label class="fl">Name <input id="upName" maxlength="40" value="${esc(data.name || '')}"></label>
      <label class="fl">Your name <input id="upAuthor" maxlength="30" value="${esc(LS.get('ovo_author', ''))}"></label>
      <label class="fl">Description <input id="upDesc" maxlength="200" placeholder="optional"></label>
      <div class="btns"><button class="primary" data-a="ok">Upload</button><button data-a="c">Cancel</button></div>`, {
      c: ui.closeDlg,
      ok: async (b) => {
        const name = document.getElementById('upName').value.trim(), author = document.getElementById('upAuthor').value.trim(), description = document.getElementById('upDesc').value.trim();
        if (!name) return; LS.set('ovo_author', author);
        b.textContent = 'Uploading…'; b.disabled = true;
        try {
          const clean = window.OvOEditor.sanitize({ name, author, objs: data.objs });
          await upload({ name, author, description, data: { v: 1, name, author, objs: clean.objs } });
          ui.closeDlg(); ui.toast('Uploaded! It’s now in Online levels.'); render();
        } catch (e) { ui.closeDlg(); ui.toast('Couldn’t upload: ' + esc(e.message)); }
      },
    });
  }
  function init(h) {
    ui = h;
    document.getElementById('onlineSearchBtn').onclick = () => render();
    document.getElementById('onlineSearch').onkeydown = e => { if (e.key === 'Enter') render(); };
    document.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => { sort = b.dataset.sort; document.querySelectorAll('[data-sort]').forEach(x => x.classList.toggle('on', x === b)); render(); });
  }
  window.OvOOnline = { init, render, uploadDialog };
})();
