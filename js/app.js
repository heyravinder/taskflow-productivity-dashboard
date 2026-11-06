/* TaskFlow – Smart Productivity Dashboard */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const KEY = 'taskflow:v1', PR = { High: 0, Medium: 1, Low: 2 };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------- State ---------- */
let S = { tasks: [], cats: ['Work', 'Personal', 'Study'], dark: false, goal: 3, name: 'Ravinder' };
try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Storage unavailable', 1); } };
const sel = new Set();
let view = 'dash', editId = null, delId = null, calD = new Date(), charts = {};

/* ---------- Helpers ---------- */
const live = () => S.tasks.filter(t => !t.arch);
const isOver = t => t.status !== 'done' && t.due && new Date(t.due) < new Date();
const fmt = d => d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'No due date';
const day = d => new Date(d).toDateString();
const subPct = t => t.subs.length ? Math.round(t.subs.filter(s => s.d).length / t.subs.length * 100) : null;
let lastUndo = null;
function toast(m, err, undo) {
  const e = document.createElement('div'); e.className = 'toast' + (err ? ' e' : ''); e.textContent = m;
  if (undo) { lastUndo = undo; const b = document.createElement('button'); b.textContent = 'Undo'; b.className = 'ub'; b.onclick = () => { undo(); lastUndo = null; e.remove(); }; e.append(b); }
  $('#toasts').append(e); setTimeout(() => e.remove(), undo ? 6000 : 2800);
}
const icons = () => window.lucide && lucide.createIcons();

/* ---------- Task actions ---------- */
function setStatus(t, st) {
  const was = t.status; t.status = st;
  if (st === 'done' && was !== 'done') {
    t.doneAt = Date.now(); t.subs.forEach(s => s.d = true);
    if (t.repeat && t.due) { // recurring: spawn next occurrence
      const n = new Date(t.due); t.repeat === 'day' ? n.setDate(n.getDate() + 1) : t.repeat === 'week' ? n.setDate(n.getDate() + 7) : n.setMonth(n.getMonth() + 1);
      S.tasks.push({ ...t, id: uid(), status: 'todo', doneAt: null, due: n.toISOString().slice(0, 16), created: Date.now(), subs: t.subs.map(s => ({ ...s, d: false })) });
      toast('Next ' + t.repeat + 'ly task created');
    }
  } else if (st !== 'done') t.doneAt = null;
}
function act(a, id, i) {
  const t = S.tasks.find(x => x.id === id); if (!t) return;
  if (a === 'tog') { setStatus(t, t.status === 'done' ? 'todo' : 'done'); toast(t.status === 'done' ? 'Task completed 🎉' : 'Task reopened'); }
  if (a === 'pick') { sel.has(id) ? sel.delete(id) : sel.add(id); return render(); }
  if (a === 'edit') return openForm(t);
  if (a === 'dup') { S.tasks.push({ ...t, id: uid(), title: t.title + ' (copy)', status: 'todo', doneAt: null, created: Date.now(), subs: t.subs.map(s => ({ ...s })) }); toast('Task duplicated'); }
  if (a === 'del') { delId = id; return $('#cf').classList.add('on'); }
  if (a === 'arch') { t.arch = true; toast('Task archived'); }
  if (a === 'res') { t.arch = false; toast('Task restored'); }
  if (a === 'sub') t.subs[i].d = !t.subs[i].d;
  save(); render();
}

/* ---------- Rendering ---------- */
function card(t, arch, pick) {
  const p = subPct(t), done = t.status === 'done';
  return `<div class="task ${t.pri} ${done ? 'done' : ''}" draggable="${!arch}" data-id="${t.id}">
  ${pick ? `<input type="checkbox" data-a="pick" ${sel.has(t.id) ? 'checked' : ''} aria-label="Select task">` : ''}${arch ? '' : `<input type="checkbox" ${done ? 'checked' : ''} data-a="tog" aria-label="Complete">`}
  <div><h4>${esc(t.title)}</h4>${t.desc ? `<div class="muted">${esc(t.desc)}</div>` : ''}
  <span class="tag">${esc(t.cat)}</span><span class="tag">${t.pri}</span>${t.repeat ? `<span class="tag">↻ ${t.repeat}</span>` : ''}
  <span class="tag ${isOver(t) ? 'er' : ''}">${isOver(t) ? 'Overdue · ' : ''}${fmt(t.due)}</span>
  ${p !== null ? `<div class="bar sm" title="${p}% subtasks done"><i style="width:${p}%"></i></div>` : ''}
  ${t.subs.map((s, i) => `<label class="sub" ${arch ? '' : 'draggable="true"'} data-i="${i}"><input type="checkbox" ${s.d ? 'checked' : ''} data-a="sub" data-i="${i}">${esc(s.t)}</label>`).join('')}</div>
  <div class="act">${arch ? `<button data-a="res" title="Restore" aria-label="Restore"><i data-lucide="rotate-ccw"></i></button>` : `<button data-a="edit" title="Edit" aria-label="Edit"><i data-lucide="pencil"></i></button><button data-a="dup" title="Duplicate" aria-label="Duplicate"><i data-lucide="copy"></i></button>${done ? `<button data-a="arch" title="Archive" aria-label="Archive"><i data-lucide="archive"></i></button>` : ''}`}<button data-a="del" title="Delete" aria-label="Delete"><i data-lucide="trash-2"></i></button></div></div>`;
}
const empty = m => `<div class="empty"><i data-lucide="inbox"></i><p>${m}</p></div>`;

function streak() {
  const days = new Set(S.tasks.filter(t => t.doneAt).map(t => day(t.doneAt))); let n = 0, d = new Date();
  if (!days.has(day(d))) d.setDate(d.getDate() - 1);
  while (days.has(day(d))) { n++; d.setDate(d.getDate() - 1); } return n;
}
function filtered() {
  const q = $('#q').value.toLowerCase(), fs = $('#fs').value, fp = $('#fp').value, fc = $('#fc').value, fr = $('#fr').value, now = new Date();
  let r = live().filter(t => (!q || (t.title + t.desc).toLowerCase().includes(q)) && (!fp || t.pri === fp) && (!fc || t.cat === fc) &&
    (!fs || (fs === 'over' ? isOver(t) : t.status === fs)));
  if (fr) r = r.filter(t => { if (!t.due) return false; const d = new Date(t.due), diff = (d - now) / 864e5;
    return fr === 'day' ? day(d) === day(now) : fr === 'week' ? diff > -1 && diff < 7 : d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const so = $('#so').value;
  return r.sort((a, b) => so === 'pri' ? PR[a.pri] - PR[b.pri] : so === 'name' ? a.title.localeCompare(b.title) : (a.due || '9').localeCompare(b.due || '9'));
}
function render() {
  const L = live(), done = L.filter(t => t.status === 'done').length, od = L.filter(isOver).length, pc = L.length ? Math.round(done / L.length * 100) : 0;
  $('#hi').textContent = `Welcome back, ${S.name || 'there'} 👋`; $('#av').textContent = (S.name || '?')[0].toUpperCase(); $('#name').value = S.name;
  $('#cards').innerHTML = [['Total', L.length, 'list'], ['Completed', done, 'check'], ['Pending', L.length - done, 'clock'], ['Overdue', od, 'alert-triangle']]
    .map(c => `<div class="stat"><span>${c[0]}</span><b>${c[1]}</b></div>`).join('');
  $('#pp').textContent = pc + '%'; $('#pb').style.width = pc + '%';
  const today = S.tasks.filter(t => t.doneAt && day(t.doneAt) === day(Date.now())).length, gp = Math.min(100, Math.round(today / S.goal * 100));
  $('#gb').style.width = gp + '%'; $('#gt').textContent = `${today} / ${S.goal} tasks completed today`; $('#goal').value = S.goal;
  const s = streak(); $('#streak').textContent = `🔥 ${s} day${s === 1 ? '' : 's'}`;
  $('#up').innerHTML = L.filter(t => t.status !== 'done' && t.due).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4).map(t => card(t)).join('') || empty('Nothing upcoming. Add a task!');
  const cats = $('#fc'), cv = cats.value; cats.innerHTML = '<option value="">All categories</option>' + S.cats.map(c => `<option>${esc(c)}</option>`).join(''); cats.value = cv;
  $('#c').innerHTML = S.cats.map(c => `<option>${esc(c)}</option>`).join('');
  const f = filtered(); $('#list').innerHTML = f.map(t => card(t, 0, 1)).join('') || empty('No tasks match. Create one or clear filters.');
  $('#kan').innerHTML = [['todo', 'To Do'], ['progress', 'In Progress'], ['done', 'Completed']].map(([k, n]) => {
    const ts = f.filter(t => t.status === k); return `<div class="col" data-col="${k}"><b>${n} (${ts.length})</b><br><br>${ts.map(t => card(t)).join('') || '<p class="muted">Drop tasks here</p>'}</div>`; }).join('');
  $('#alist').innerHTML = S.tasks.filter(t => t.arch).map(t => card(t, 1)).join('') || empty('No archived tasks.');
  $('#bulk').innerHTML = sel.size ? `<b>${sel.size} selected</b><button class="btn" data-b="done">Complete</button><button class="btn" data-b="arch">Archive</button><button class="btn" data-b="del">Delete</button><button class="btn" data-b="clr">Clear</button>` : '';
  $('#bulk').className = sel.size ? 'panel row bulk' : '';
  insights(); renderCal(); if (view === 'stats') renderCharts(); icons();
}
function insights() {
  const hc = {}, L = S.tasks.filter(t => t.doneAt); L.forEach(t => hc[day(t.doneAt)] = (hc[day(t.doneAt)] || 0) + 1);
  let h = '';
  const st = new Date(); st.setDate(st.getDate() - 34);
  for (let i = 0; i < 35; i++) { const x = new Date(st); x.setDate(st.getDate() + i); const c = hc[x.toDateString()] || 0; h += `<i style="opacity:${c ? Math.min(1, .25 + c * .25) : .12}" title="${x.toDateString()}: ${c} done"></i>`; }
  $('#heat').innerHTML = h;
  const w = { High: 3, Medium: 2, Low: 1 }, pts = L.reduce((a, t) => a + w[t.pri], 0), wd = {};
  L.forEach(t => { const k = new Date(t.doneAt).toLocaleDateString([], { weekday: 'long' }); wd[k] = (wd[k] || 0) + 1; });
  const best = Object.entries(wd).sort((a, b) => b[1] - a[1])[0], dd = L.filter(t => t.due), ot = dd.length ? Math.round(dd.filter(t => t.doneAt <= new Date(t.due)).length / dd.length * 100) : null;
  $('#ins').innerHTML = `<b>Insights</b><p class="muted">Productivity score: <b>${pts}</b> pts (High=3, Medium=2, Low=1)<br>Most productive day: <b>${best ? best[0] : '—'}</b><br>On-time completion: <b>${ot === null ? '—' : ot + '%'}</b><br>Total completed: <b>${L.length}</b></p>`;
}
function renderCal() {
  const y = calD.getFullYear(), m = calD.getMonth(), first = new Date(y, m, 1).getDay(), n = new Date(y, m + 1, 0).getDate();
  $('#ct').textContent = calD.toLocaleString([], { month: 'long', year: 'numeric' });
  let h = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="h">${d}</div>`).join('') + '<div style="visibility:hidden"></div>'.repeat(first);
  for (let d = 1; d <= n; d++) { const ts = live().filter(t => t.due && day(t.due) === new Date(y, m, d).toDateString());
    h += `<div class="${new Date(y, m, d).toDateString() === new Date().toDateString() ? 'td' : ''}">${d}${ts.map(t => `<em title="${esc(t.title)}">${esc(t.title)}</em>`).join('')}</div>`; }
  $('#cal').innerHTML = h;
}
function renderCharts() {
  if (!window.Chart) return; Object.values(charts).forEach(c => c.destroy());
  const lab = [], val = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); lab.push(d.toLocaleDateString([], { weekday: 'short' })); val.push(S.tasks.filter(t => t.doneAt && day(t.doneAt) === d.toDateString()).length); }
  charts.a = new Chart($('#c1'), { type: 'bar', data: { labels: lab, datasets: [{ data: val, backgroundColor: '#5b5bf0', borderRadius: 6 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
  charts.b = new Chart($('#c2'), { type: 'doughnut', data: { labels: S.cats, datasets: [{ data: S.cats.map(c => live().filter(t => t.cat === c).length), backgroundColor: ['#5b5bf0', '#16a34a', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899'] }] } });
}

/* ---------- Form ---------- */
function openForm(t) {
  editId = t?.id || null; $('#mt').textContent = t ? 'Edit task' : 'New task'; render();
  $('#t').value = t?.title || ''; $('#d').value = t?.desc || ''; $('#c').value = t?.cat || S.cats[0]; $('#p').value = t?.pri || 'Medium';
  $('#due').value = t?.due || ''; $('#r').value = t?.repeat || ''; $('#s').value = t ? t.subs.map(s => s.t).join('\n') : '';
  $('#m').classList.add('on'); $('#t').focus();
}
$('#f').onsubmit = e => {
  e.preventDefault(); const title = $('#t').value.trim();
  if (!title) return toast('Title is required', 1);
  const old = S.tasks.find(x => x.id === editId), subs = $('#s').value.split('\n').map(x => x.trim()).filter(Boolean).map(t => ({ t, d: old?.subs.find(s => s.t === t)?.d || false }));
  const data = { title, desc: $('#d').value.trim(), cat: $('#c').value, pri: $('#p').value, due: $('#due').value, repeat: $('#r').value, subs };
  if (old) Object.assign(old, data); else S.tasks.push({ id: uid(), status: 'todo', created: Date.now(), arch: false, doneAt: null, ...data });
  save(); render(); $('#m').classList.remove('on'); toast(old ? 'Task updated' : 'Task added');
};
$('#nc').onclick = () => { const n = prompt('New category name')?.trim(); if (n && !S.cats.includes(n)) { S.cats.push(n); save(); render(); $('#c').value = n; } };
$('#x').onclick = () => $('#m').classList.remove('on');
$('#cn').onclick = () => $('#cf').classList.remove('on');
$('#ok').onclick = () => {
  const gone = S.tasks.filter(t => delId === 'bulk' ? sel.has(t.id) : t.id === delId);
  S.tasks = S.tasks.filter(t => !gone.includes(t)); sel.clear(); save(); render(); $('#cf').classList.remove('on');
  toast(`Deleted ${gone.length} task${gone.length > 1 ? 's' : ''}`, 0, () => { S.tasks.push(...gone); save(); render(); toast('Restored'); });
};

/* ---------- Events ---------- */
document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; if (b.type === 'checkbox' && b.dataset.a === 'tog') { /* handled by click */ } act(b.dataset.a, b.closest('.task').dataset.id, b.dataset.i); });
$$('nav button').forEach(b => b.onclick = () => { view = b.dataset.v; $$('nav button,.view').forEach(x => x.classList.remove('on')); b.classList.add('on'); $('#v-' + view).classList.add('on'); $('#side').classList.remove('open'); render(); });
['q', 'fs', 'fp', 'fc', 'so', 'fr'].forEach(i => $('#' + i).oninput = render);
$('#add').onclick = () => openForm(); $('#menu').onclick = () => $('#side').classList.toggle('open');
$('#pm').onclick = () => { calD.setMonth(calD.getMonth() - 1); renderCal(); icons(); }; $('#nm').onclick = () => { calD.setMonth(calD.getMonth() + 1); renderCal(); };
$('#name').oninput = e => { S.name = e.target.value; save(); $('#hi').textContent = `Welcome back, ${S.name || 'there'} 👋`; $('#av').textContent = (S.name || '?')[0].toUpperCase(); };
$('#goal').oninput = e => { S.goal = Math.max(1, +e.target.value || 1); save(); render(); };
const theme = () => { document.documentElement.dataset.theme = S.dark ? 'dark' : 'light'; $('#theme').innerHTML = `<i data-lucide="${S.dark ? 'sun' : 'moon'}"></i>`; icons(); };
$('#theme').onclick = () => { S.dark = !S.dark; save(); theme(); };
document.addEventListener('click', e => { const b = e.target.closest('[data-b]'); if (!b) return; const k = b.dataset.b;
  if (k === 'del') { delId = 'bulk'; return $('#cf').classList.add('on'); }
  S.tasks.filter(t => sel.has(t.id)).forEach(t => k === 'done' ? setStatus(t, 'done') : k === 'arch' ? t.arch = true : 0);
  if (k !== 'clr') toast('Bulk action applied'); sel.clear(); save(); render(); });
// drag & drop (Kanban)
let drag = null;
let sd = null; // subtask being dragged
document.addEventListener('dragstart', e => {
  const s = e.target.closest?.('.sub'); if (s) { sd = { id: s.closest('.task').dataset.id, i: +s.dataset.i }; return; }
  const t = e.target.closest?.('.task'); if (t) drag = t.dataset.id; });
document.addEventListener('dragend', () => { sd = null; drag = null; $$('.col').forEach(c => c.classList.remove('over')); });
document.addEventListener('dragover', e => { if (sd && e.target.closest?.('.sub')) e.preventDefault();
  const c = e.target.closest?.('.col'); if (c && drag) { e.preventDefault(); c.classList.add('over'); } });
document.addEventListener('dragleave', e => e.target.closest?.('.col')?.classList.remove('over'));
document.addEventListener('drop', e => {
  const s = e.target.closest?.('.sub');
  if (sd && s) { e.preventDefault(); const tk = s.closest('.task'), t = S.tasks.find(x => x.id === sd.id);
    if (t && tk.dataset.id === sd.id) { const [m] = t.subs.splice(sd.i, 1); t.subs.splice(+s.dataset.i, 0, m); save(); render(); } sd = null; return; }
  const c = e.target.closest?.('.col'); if (!c || !drag) return; e.preventDefault();
  const t = S.tasks.find(x => x.id === drag); setStatus(t, c.dataset.col); drag = null; save(); render(); toast('Moved to ' + c.querySelector('b').textContent.split(' (')[0]); });
// import / export
$('#exp').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' })); a.download = 'taskflow-backup.json'; a.click(); toast('Exported'); };
$('#imp').onchange = e => { const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if (!Array.isArray(d.tasks)) throw 0; S = { ...S, ...d }; save(); theme(); render(); toast('Imported ' + d.tasks.length + ' tasks'); } catch { toast('Invalid JSON file', 1); } }; r.readAsText(e.target.files[0]); };
// keyboard shortcuts: N = new, / = search, D = dark mode, Esc = close
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') $$('.modal').forEach(m => m.classList.remove('on'));
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPal(); return; }
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && lastUndo) { e.preventDefault(); lastUndo(); lastUndo = null; return; }
  if (e.key === 'n') { e.preventDefault(); openForm(); } if (e.key === '/') { e.preventDefault(); $('#q').focus(); } if (e.key === 'd') $('#theme').click();
});
// command palette (Ctrl/Cmd + K)
const NAMES = { dash: 'Dashboard', tasks: 'Tasks', board: 'Board', cal: 'Calendar', stats: 'Analytics', arch: 'Archive' };
let pi = 0, pitems = [];
const cmds = () => [['New task', () => openForm()], ...Object.keys(NAMES).map(v => ['Go to ' + NAMES[v], () => $(`nav [data-v=${v}]`).click()]),
  ['Toggle dark mode', () => $('#theme').click()], ['Export JSON backup', () => $('#exp').click()]];
function palette() {
  const q = $('#pq').value.toLowerCase(); pitems = cmds().filter(c => c[0].toLowerCase().includes(q));
  if (q) live().filter(t => t.title.toLowerCase().includes(q)).slice(0, 6).forEach(t => pitems.push(['Task: ' + t.title, () => openForm(t)]));
  pi = Math.min(pi, Math.max(0, pitems.length - 1));
  $('#pl').innerHTML = pitems.map((c, i) => `<div class="pi ${i === pi ? 'on' : ''}" data-i="${i}">${esc(c[0])}</div>`).join('') || '<p class="muted">No results</p>';
}
function openPal() { $('#pq').value = ''; pi = 0; palette(); $('#pal').classList.add('on'); $('#pq').focus(); }
function runPal(i) { const c = pitems[i]; if (!c) return; $('#pal').classList.remove('on'); c[1](); }
$('#pq').oninput = () => { pi = 0; palette(); };
$('#pq').onkeydown = e => { if (e.key === 'ArrowDown') { pi = Math.min(pi + 1, pitems.length - 1); palette(); e.preventDefault(); } else if (e.key === 'ArrowUp') { pi = Math.max(pi - 1, 0); palette(); e.preventDefault(); } else if (e.key === 'Enter') runPal(pi); };
$('#pl').onclick = e => { const p = e.target.closest('.pi'); if (p) runPal(+p.dataset.i); };
// reminders (browser notifications + toast)
setInterval(() => live().forEach(t => { if (t.status !== 'done' && t.due && !t.notified && new Date(t.due) <= new Date()) { t.notified = true; save(); toast('⏰ Due: ' + t.title); if (window.Notification && Notification.permission === 'granted') new Notification('TaskFlow', { body: t.title + ' is due' }); } }), 30000);
if (window.Notification && Notification.permission === 'default') Notification.requestPermission();

theme(); render(); setTimeout(() => { $('#loader').style.opacity = 0; setTimeout(() => $('#loader').remove(), 400); }, 500);

// PWA: offline support (needs http/https, not file://)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
