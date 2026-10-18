'use strict';
const KEY = 'clementina.v1';
const DEF = { clients: [], events: [], sales: [], theme: 'auto', accent: '#2468d6' };
let S = (() => { try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { return { ...DEF }; } })();
const save = () => localStorage.setItem(KEY, JSON.stringify(S));
const $ = s => document.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const money = n => '$' + Math.round(n).toLocaleString('es-CL');
const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const fdate = s => s ? s.split('-').reverse().join('/') : '';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cur = () => S.events.find(e => !e.end);
const cname = s => (S.clients.find(c => c.id === s.client) || { name: s.cn || 'Sin cliente' }).name;
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2200); };
let V = 'ventas';
const R = { from: '', to: '', client: '', sort: 'date', dir: 'desc' };

/* ---------- tema ---------- */
function applyTheme() {
  const r = document.documentElement;
  r.className = S.theme;
  r.style.setProperty('--acc', S.accent);
}

/* ---------- diálogo ---------- */
function dlg(title, html, ok) {
  const d = $('#dlg');
  d.innerHTML = `<form method="dialog"><h3>${title}</h3>${html}<div class="row"><button class="btn ghost" value="x" formnovalidate>Cancelar</button><button class="btn" value="ok">Guardar</button></div></form>`;
  d.returnValue = '';
  d.onclose = () => { if (d.returnValue === 'ok') ok(d); };
  d.showModal();
}
function clientDlg(c, done) {
  dlg(c ? 'Editar cliente' : 'Nuevo cliente',
    `<label>Nombre<input id="dn" required value="${esc(c?.name)}"></label><label>Teléfono (opcional)<input id="dp" inputmode="tel" value="${esc(c?.phone)}"></label>`,
    d => {
      const name = d.querySelector('#dn').value.trim(), phone = d.querySelector('#dp').value.trim();
      if (!name) return;
      if (c) { c.name = name; c.phone = phone; S.sales.forEach(s => { if (s.client === c.id) s.cn = name; }); }
      else { c = { id: uid(), name, phone }; S.clients.push(c); S.clients.sort((a, b) => a.name.localeCompare(b.name)); }
      save(); done && done(c);
    });
}

/* ---------- navegación ---------- */
function go(v) { V = v; render(); window.scrollTo(0, 0); }
function render() {
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === V));
  ({ ventas: vVentas, clientes: vClientes, informes: vInformes, ajustes: vAjustes })[V]();
}

/* ---------- ventas ---------- */
function vVentas() {
  const e = cur(), sales = e ? S.sales.filter(s => s.event === e.id).sort((a, b) => b.t - a.t) : [];
  const total = sales.reduce((a, s) => a + s.value, 0);
  const opts = '<option value="">Sin cliente</option>' + S.clients.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  $('#view').innerHTML = `
  <div class="card ev ${e ? 'on' : ''}">
    <div><small>${e ? 'Evento abierto' : 'Sin evento abierto'}</small>
      ${e ? `<span>${sales.length} ventas · ${money(total)}</span>` : ''}
      <label>Fecha del evento<input type="date" id="evd" value="${e ? e.date : today()}"></label></div>
    <button class="btn ${e ? 'danger' : ''}" id="evb">${e ? 'Cerrar evento' : 'Iniciar evento'}</button>
  </div>
  <fieldset class="card form" ${e ? '' : 'disabled'}>
    <label>N° prenda<input id="n" inputmode="numeric" autocomplete="off"></label>
    <label>Descripción<input id="d" autocomplete="off"></label>
    <label>Valor<input id="v" inputmode="numeric" autocomplete="off"></label>
    <label>Cliente<div class="row"><select id="c">${opts}</select><button type="button" class="sq fix" id="nc" aria-label="Agregar cliente nuevo">+</button></div></label>
    <button class="btn" id="add">Ingresar venta</button>
  </fieldset>
  ${e ? (sales.length ? sales.map(s => `<div class="card item"><div class="t"><b>#${esc(s.n || '–')} ${esc(s.desc)}</b><small>${esc(cname(s))}</small></div><span class="val">${money(s.value)}</span><button class="x" data-del="${s.id}" aria-label="Eliminar">✕</button></div>`).join('') : '<p class="empty">Aún no hay ventas en este evento.</p>')
    : '<p class="empty">Inicia un evento para ingresar ventas.</p>'}`;
  const evd = $('#evd');
  evd.onchange = () => { const ev = cur(); if (ev && evd.value) { ev.date = evd.value; save(); toast('Fecha actualizada'); } };
  $('#evb').onclick = () => {
    if (e) {
      if (confirm('¿Cerrar el evento? Se guardará en informes con la fecha ' + fdate(e.date) + '.')) { e.end = Date.now(); save(); toast('Evento cerrado'); vVentas(); }
    } else {
      if (!evd.value) return toast('Elige una fecha');
      S.events.push({ id: uid(), date: evd.value, start: Date.now() }); save(); toast('Evento iniciado'); vVentas();
    }
  };
  if (!e) return;
  $('#nc').onclick = () => clientDlg(null, c => { vVentas(); $('#c').value = c.id; });
  $('#add').onclick = () => {
    const value = parseFloat(String($('#v').value).replace(/[^\d.]/g, ''));
    if (!(value > 0)) { toast('Ingresa un valor'); return $('#v').focus(); }
    const client = $('#c').value, c = S.clients.find(x => x.id === client);
    S.sales.push({ id: uid(), event: e.id, n: $('#n').value.trim(), desc: $('#d').value.trim(), value, client, cn: c ? c.name : '', t: Date.now() });
    save(); toast('Venta ingresada'); vVentas(); $('#c').value = client; $('#n').focus();
  };
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    if (confirm('¿Eliminar esta venta?')) { S.sales = S.sales.filter(s => s.id !== b.dataset.del); save(); vVentas(); }
  });
}

/* ---------- clientes ---------- */
function vClientes() {
  $('#view').innerHTML = `<h2>Clientes</h2>` + (S.clients.length ? S.clients.map(c => {
    const n = S.sales.filter(s => s.client === c.id);
    return `<div class="card item"><div class="t"><b>${esc(c.name)}</b><small>${c.phone ? esc(c.phone) + ' · ' : ''}${n.length} compras · ${money(n.reduce((a, s) => a + s.value, 0))}</small></div><button class="x" data-e="${c.id}" aria-label="Editar">✎</button><button class="x" data-x="${c.id}" aria-label="Eliminar">✕</button></div>`;
  }).join('') : '<p class="empty">Aún no hay clientes. Toca + para agregar uno.</p>') + `<button class="fab" id="fab" aria-label="Agregar cliente">+</button>`;
  $('#fab').onclick = () => clientDlg(null, vClientes);
  document.querySelectorAll('[data-e]').forEach(b => b.onclick = () => clientDlg(S.clients.find(c => c.id === b.dataset.e), vClientes));
  document.querySelectorAll('[data-x]').forEach(b => b.onclick = () => {
    const c = S.clients.find(c => c.id === b.dataset.x);
    if (confirm(`¿Eliminar a ${c.name}? Sus ventas se mantienen en los informes.`)) { S.clients = S.clients.filter(x => x !== c); save(); vClientes(); }
  });
}

/* ---------- informes ---------- */
function rows() {
  const m = R.dir === 'asc' ? 1 : -1;
  const key = { date: (a, b) => a.date.localeCompare(b.date) || a.t - b.t, client: (a, b) => a.cn.localeCompare(b.cn) || a.t - b.t, value: (a, b) => a.value - b.value }[R.sort];
  return S.sales.map(s => ({ ...s, date: (S.events.find(e => e.id === s.event) || {}).date || '', cn: cname(s) }))
    .filter(r => (!R.from || r.date >= R.from) && (!R.to || r.date <= R.to) && (!R.client || (R.client === '-' ? !r.client : r.client === R.client)))
    .sort((a, b) => m * key(a, b));
}
function buildTxt(rs) {
  const line = r => `• #${r.n || '–'} ${r.desc || 'Prenda'} – ${r.cn} – ${money(r.value)}`;
  const cl = R.client ? (R.client === '-' ? 'Sin cliente' : (S.clients.find(c => c.id === R.client) || {}).name) : 'Todos';
  let o = `*CLEMENTINA · Informe de ventas*\nPeríodo: ${R.from ? fdate(R.from) : 'inicio'} al ${R.to ? fdate(R.to) : 'hoy'}\nCliente: ${cl}\n\n`;
  if (R.sort === 'date') {
    const g = {}; rs.forEach(r => (g[r.date] = g[r.date] || []).push(r));
    Object.keys(g).forEach(d => { o += `*${fdate(d)}*\n${g[d].map(line).join('\n')}\nSubtotal: ${money(g[d].reduce((a, r) => a + r.value, 0))}\n\n`; });
  } else o += rs.map(r => `${fdate(r.date)} ${line(r)}`).join('\n') + '\n\n';
  const pc = {}; rs.forEach(r => pc[r.cn] = (pc[r.cn] || 0) + r.value);
  o += '*Total por cliente*\n' + Object.entries(pc).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${money(v)}`).join('\n');
  return o + `\n\n*TOTAL: ${money(rs.reduce((a, r) => a + r.value, 0))}* (${rs.length} prendas)`;
}
function buildCsv(rs) {
  const q = v => `"${String(v).replace(/"/g, '""')}"`;
  return '\ufeff' + ['Fecha;N° prenda;Descripción;Cliente;Valor', ...rs.map(r => [fdate(r.date), q(r.n), q(r.desc), q(r.cn), r.value].join(';'))].join('\r\n');
}
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function vInformes() {
  const rs = rows(), total = rs.reduce((a, r) => a + r.value, 0);
  const sel = (id, opts, v) => `<select id="${id}">${opts.map(([k, l]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  $('#view').innerHTML = `<h2>Informes</h2>
  <div class="card form">
    <div class="row"><label>Desde<input type="date" id="rf" value="${R.from}"></label><label>Hasta<input type="date" id="rt" value="${R.to}"></label></div>
    <label>Cliente${sel('rc', [['', 'Todos'], ['-', 'Sin cliente'], ...S.clients.map(c => [c.id, c.name])], R.client)}</label>
    <div class="row"><label>Ordenar por${sel('rs', [['date', 'Fecha'], ['client', 'Cliente'], ['value', 'Valor']], R.sort)}</label><label>Orden${sel('rd', [['desc', 'Descendente'], ['asc', 'Ascendente']], R.dir)}</label></div>
  </div>
  <div class="card total"><small>${rs.length} prendas</small><b>${money(total)}</b></div>
  ${rs.length ? rs.map(r => `<div class="card item"><div class="t"><b>#${esc(r.n || '–')} ${esc(r.desc)}</b><small>${fdate(r.date)} · ${esc(r.cn)}</small></div><span class="val">${money(r.value)}</span></div>`).join('') : '<p class="empty">No hay ventas con estos filtros.</p>'}
  <div class="row"><button class="btn sm" id="xt">Texto .txt</button><button class="btn sm" id="xc">CSV</button><button class="btn sm ghost" id="xs">Compartir</button></div>`;
  [['rf', 'from'], ['rt', 'to'], ['rc', 'client'], ['rs', 'sort'], ['rd', 'dir']].forEach(([id, k]) => $('#' + id).onchange = e => { R[k] = e.target.value; vInformes(); });
  const stamp = today();
  $('#xt').onclick = () => rs.length ? download(`clementina-informe-${stamp}.txt`, buildTxt(rs), 'text/plain;charset=utf-8') : toast('No hay datos');
  $('#xc').onclick = () => rs.length ? download(`clementina-informe-${stamp}.csv`, buildCsv(rs), 'text/csv;charset=utf-8') : toast('No hay datos');
  $('#xs').onclick = async () => {
    if (!rs.length) return toast('No hay datos');
    const text = buildTxt(rs);
    try { if (navigator.share) return await navigator.share({ text }); await navigator.clipboard.writeText(text); toast('Texto copiado'); } catch (e) { }
  };
}

/* ---------- ajustes ---------- */
function vAjustes() {
  const colors = ['#2468d6', '#e8710a', '#1fa35c', '#d6336c', '#7048e8'];
  const kb = (new Blob([localStorage.getItem(KEY) || '']).size / 1024).toFixed(1);
  $('#view').innerHTML = `<h2>Ajustes</h2>
  <div class="card form"><span class="lbl">Tema</span>
    <div class="seg">${[['auto', 'Auto'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([k, l]) => `<button class="btn sm ${S.theme === k ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
    <span class="lbl">Color</span>
    <div class="sw">${colors.map(c => `<button style="background:${c}" class="${S.accent === c ? 'on' : ''}" data-c="${c}" aria-label="Color ${c}"></button>`).join('')}</div></div>
  <div class="card form"><span class="lbl">Almacenamiento local</span>
    <p>${S.sales.length} ventas · ${S.clients.length} clientes · ${S.events.length} eventos · ${kb} KB</p>
    <p style="color:var(--mute);font-size:14px">Los datos viven solo en este dispositivo. Haz respaldos con frecuencia.</p>
    <button class="btn sm danger" id="wipe">Borrar todos los datos</button></div>
  <div class="card form"><span class="lbl">Exportar / importar datos</span>
    <button class="btn sm" id="ex">Exportar respaldo (.json)</button>
    <button class="btn sm ghost" id="im">Importar respaldo</button>
    <input type="file" id="fi" accept=".json,application/json" hidden></div>`;
  document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { S.theme = b.dataset.t; save(); applyTheme(); vAjustes(); });
  document.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { S.accent = b.dataset.c; save(); applyTheme(); vAjustes(); });
  $('#ex').onclick = () => download(`clementina-respaldo-${today()}.json`, JSON.stringify(S, null, 1), 'application/json');
  $('#im').onclick = () => $('#fi').click();
  $('#fi').onchange = async e => {
    try {
      const d = JSON.parse(await e.target.files[0].text());
      if (!Array.isArray(d.sales) || !Array.isArray(d.clients) || !Array.isArray(d.events)) throw 0;
      if (confirm('Esto reemplazará los datos actuales. ¿Continuar?')) { S = { ...DEF, ...d }; save(); applyTheme(); toast('Datos importados'); vAjustes(); }
    } catch (x) { toast('Archivo no válido'); }
  };
  $('#wipe').onclick = () => { if (confirm('¿Borrar TODOS los datos? No se puede deshacer.')) { S = { ...DEF }; save(); applyTheme(); toast('Datos borrados'); vAjustes(); } };
}

/* ---------- inicio ---------- */
document.querySelectorAll('#nav button').forEach(b => b.onclick = () => go(b.dataset.v));
$('#cfg').onclick = () => go('ajustes');
applyTheme();
render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
