'use strict';
const KEY = 'clementina.v1';
const TPL = `¡Hola! 🌸 Muchas gracias por tu compra en Clementina. A continuación te dejo el detalle de tu pedido:

🛍️ Prendas:
{prendas}
💰 Total: {total}

Datos para la transferencia:
BancoEstado – Cuenta RUT
Nombre: Jasmín Espinoza Castro
Cuenta: 17.540.416-3

Una vez realizada la transferencia, envíame el comprobante para coordinar la entrega.

¡Muchísimas gracias por confiar en Clementina! 💖 Espero que disfrutes mucho tu nueva prenda. Será un gusto atenderte nuevamente.`;
const DEF = { clients: [], events: [], sales: [], theme: 'auto', accent: '#2468d6', show: 'nick', detail: 'count', tpl: TPL, sent: {} };
let S = (() => { try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { return { ...DEF }; } })();
const save = () => localStorage.setItem(KEY, JSON.stringify(S));
const $ = s => document.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const money = n => '$' + Math.round(n).toLocaleString('es-CL');
const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const fdate = s => s ? s.split('-').reverse().join('/') : '';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2200); };
const cur = () => S.events.find(e => !e.end);
const cl = id => S.clients.find(c => c.id === id);
const pl = n => `${n} prenda${n === 1 ? '' : 's'}`;
const MODES = { region: 'Envío a regiones', domicilio: 'Despacho a domicilio', punto: 'Punto de retiro', retiro: 'Retiro' };
/* Nick o nombre según preferencia; con * si falta el dato elegido */
const dname = c => { const n = (c.name || '').trim(), k = (c.nick || '').trim(); return S.show === 'nick' ? (k || n + '*') : (n || k + '*'); };
const cdisp = s => { const c = cl(s.client); return c ? dname(c) : (s.cn || 'Sin cliente'); };
const sorted = () => [...S.clients].sort((a, b) => dname(a).localeCompare(dname(b)));
let V = 'ventas';
const R = { from: '', to: '', client: '', sort: 'date', dir: 'desc' };

function applyTheme() { const r = document.documentElement; r.className = S.theme; r.style.setProperty('--acc', S.accent); }

/* ---------- diálogo ---------- */
function dlg(title, html, ok, validate) {
  const d = $('#dlg');
  d.innerHTML = `<form method="dialog"><h3>${title}</h3>${html}<p class="err" id="derr"></p><div class="row"><button class="btn ghost" value="x" formnovalidate>Cancelar</button><button class="btn" value="ok">Guardar</button></div></form>`;
  d.returnValue = '';
  d.querySelector('form').onsubmit = e => {
    const m = e.submitter && e.submitter.value === 'ok' && validate && validate(d);
    if (m) { e.preventDefault(); $('#derr').textContent = m; }
  };
  d.onclose = () => { if (d.returnValue === 'ok') ok(d); };
  d.showModal();
}
function clientDlg(c, done, quick) {
  const v = k => esc(c?.[k]);
  const f = (id, l, k, x = '') => `<label>${l}<input id="${id}" value="${v(k)}" ${x}></label>`;
  const more = `<label>Entrega<select id="dm"><option value="">Sin definir</option>${Object.entries(MODES).map(([k, l]) => `<option value="${k}" ${c?.mode === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`
    + f('ds', 'Red social / usuario', 'social', 'placeholder="TikTok @usuario"') + f('da', 'Dirección o punto de retiro', 'addr')
    + f('dc', 'Comuna / ciudad / región', 'city') + f('dr', 'RUT (para envíos)', 'rut') + f('dt', 'Notas', 'note');
  dlg(c ? 'Editar cliente' : 'Nuevo cliente', f('dn', 'Nombre', 'name') + f('dk', 'Nick', 'nick') + f('dp', 'Número', 'phone', 'inputmode="tel"') + (quick ? '' : more),
    d => {
      const g = (id, k) => { const el = d.querySelector(id); return el ? el.value.trim() : (c?.[k] || ''); };
      const o = { name: g('#dn', 'name'), nick: g('#dk', 'nick'), phone: g('#dp', 'phone'), mode: g('#dm', 'mode'), social: g('#ds', 'social'), addr: g('#da', 'addr'), city: g('#dc', 'city'), rut: g('#dr', 'rut'), note: g('#dt', 'note') };
      if (c) { Object.assign(c, o); S.sales.forEach(s => { if (s.client === c.id) s.cn = c.name || c.nick; }); }
      else { c = { id: uid(), ...o }; S.clients.push(c); }
      save(); done && done(c);
    },
    d => (d.querySelector('#dn').value.trim() || d.querySelector('#dk').value.trim()) ? '' : 'Ingresa al menos un nombre o un nick.');
}

/* ---------- navegación ---------- */
function go(v) { V = v; render(); window.scrollTo(0, 0); }
function render() {
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === V));
  ({ ventas: vVentas, clientes: vClientes, informes: vInformes, ajustes: vAjustes })[V]();
}

/* ---------- ventas ---------- */
function vVentas(k) {
  const e = cur(), sales = e ? S.sales.filter(s => s.event === e.id).sort((a, b) => b.t - a.t) : [];
  const total = sales.reduce((a, s) => a + s.value, 0);
  const opts = '<option value="" disabled selected>Selecciona cliente</option>' + sorted().map(c => `<option value="${c.id}">${esc(dname(c))}</option>`).join('');
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
    <label>Cliente<select id="c">${opts}</select></label>
    <div class="tri"><button type="button" class="btn sm ${S.show === 'nick' ? '' : 'ghost'}" id="sn">Nick</button><button type="button" class="btn sm ${S.show === 'name' ? '' : 'ghost'}" id="sm">Nombre</button><button type="button" class="btn sm outl" id="nc">+ Agregar</button></div>
    <button class="btn" id="add">Ingresar venta</button>
  </fieldset>
  ${e ? (sales.length ? sales.map(s => `<div class="card item"><div class="t"><b>#${esc(s.n || '–')} ${esc(s.desc)}</b><small>${esc(cdisp(s))}</small></div><span class="val">${money(s.value)}</span><button class="x" data-del="${s.id}" aria-label="Eliminar">✕</button></div>`).join('') : '<p class="empty">Aún no hay ventas en este evento.</p>')
    : '<p class="empty">Inicia un evento para ingresar ventas.</p>'}`;
  const evd = $('#evd');
  evd.onchange = () => { const ev = cur(); if (ev && evd.value) { ev.date = evd.value; save(); toast('Fecha actualizada'); } };
  $('#evb').onclick = () => {
    if (e) { if (confirm('¿Cerrar el evento? Se guardará en informes con la fecha ' + fdate(e.date) + '.')) { e.end = Date.now(); save(); toast('Evento cerrado'); vVentas(); } }
    else { if (!evd.value) return toast('Elige una fecha'); S.events.push({ id: uid(), date: evd.value, start: Date.now() }); save(); toast('Evento iniciado'); vVentas(); }
  };
  if (!e) return;
  const f = () => ({ n: $('#n').value, d: $('#d').value, v: $('#v').value, c: $('#c').value });
  if (k) { $('#n').value = k.n; $('#d').value = k.d; $('#v').value = k.v; if (k.c) $('#c').value = k.c; }
  $('#sn').onclick = () => { S.show = 'nick'; save(); vVentas(f()); };
  $('#sm').onclick = () => { S.show = 'name'; save(); vVentas(f()); };
  $('#nc').onclick = () => clientDlg(null, c => vVentas({ ...f(), c: c.id }), true);
  $('#add').onclick = () => {
    const value = parseFloat(String($('#v').value).replace(/[^\d.]/g, '')), client = $('#c').value, c = cl(client);
    if (!client) return toast('Selecciona un cliente');
    if (!(value > 0)) { toast('Ingresa un valor'); return $('#v').focus(); }
    S.sales.push({ id: uid(), event: e.id, n: $('#n').value.trim(), desc: $('#d').value.trim(), value, client, cn: c.name || c.nick, t: Date.now() });
    save(); toast('Venta ingresada'); vVentas({ n: '', d: '', v: '', c: client }); $('#n').focus();
  };
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    if (confirm('¿Eliminar esta venta?')) { S.sales = S.sales.filter(s => s.id !== b.dataset.del); save(); vVentas(f()); }
  });
}

/* ---------- clientes ---------- */
function vClientes() {
  $('#view').innerHTML = `<h2>Clientes</h2>` + (S.clients.length ? sorted().map(c => {
    const n = S.sales.filter(s => s.client === c.id), alt = S.show === 'nick' ? c.name : c.nick;
    const info = [MODES[c.mode], c.phone, c.social].filter(Boolean).join(' · ');
    return `<div class="card item"><div class="t"><b>${esc(dname(c))}</b><small>${alt ? esc(alt) + ' · ' : ''}${n.length} compras · ${money(n.reduce((a, s) => a + s.value, 0))}</small>${info ? `<small>${esc(info)}</small>` : ''}</div><button class="x" data-e="${c.id}" aria-label="Editar">✎</button><button class="x" data-x="${c.id}" aria-label="Eliminar">✕</button></div>`;
  }).join('') : '<p class="empty">Aún no hay clientes. Toca + para agregar uno.</p>') + `<button class="fab" id="fab" aria-label="Agregar cliente">+</button>`;
  $('#fab').onclick = () => clientDlg(null, vClientes);
  document.querySelectorAll('[data-e]').forEach(b => b.onclick = () => clientDlg(cl(b.dataset.e), vClientes));
  document.querySelectorAll('[data-x]').forEach(b => b.onclick = () => {
    const c = cl(b.dataset.x);
    if (S.sales.some(s => s.client === c.id)) return alert('No se puede eliminar: ' + dname(c) + ' tiene ventas registradas.');
    if (confirm(`¿Eliminar a ${dname(c)}?`)) { S.clients = S.clients.filter(x => x !== c); save(); vClientes(); }
  });
}

/* ---------- informes ---------- */
function rows() {
  const m = R.dir === 'asc' ? 1 : -1;
  const key = { date: (a, b) => a.date.localeCompare(b.date) || a.t - b.t, client: (a, b) => a.cn.localeCompare(b.cn) || a.t - b.t, value: (a, b) => a.value - b.value }[R.sort];
  return S.sales.map(s => ({ ...s, date: (S.events.find(e => e.id === s.event) || {}).date || '', cn: cdisp(s), c: cl(s.client) }))
    .filter(r => (!R.from || r.date >= R.from) && (!R.to || r.date <= R.to) && (!R.client || r.client === R.client))
    .sort((a, b) => m * key(a, b));
}
const sum = rs => rs.reduce((a, r) => a + r.value, 0);
function groups(rs) {
  const g = new Map();
  rs.forEach(r => { const k = r.client || '-'; if (!g.has(k)) g.set(k, { c: r.c, cn: r.cn, rows: [] }); g.get(k).rows.push(r); });
  return [...g.values()].sort((a, b) => a.cn.localeCompare(b.cn));
}
const byMode = gs => [...Object.keys(MODES), ''].map(m => [m, gs.filter(g => (g.c?.mode || '') === m)]).filter(x => x[1].length);
function msg(g) {
  const c = g.c || {}, n = g.rows.length;
  const pr = S.detail === 'list' ? g.rows.map(r => `* #${r.n || '–'} ${r.desc || 'Prenda'} – ${money(r.value)}`).join('\n') : `* ${pl(n)}`;
  const vars = { nombre: c.name || c.nick || g.cn, prendas: pr, total: money(sum(g.rows)) };
  return S.tpl.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
}
function packs(gs) {
  let p = '*📦 PAQUETES A ARMAR*';
  byMode(gs).forEach(([m, l]) => {
    p += `\n\n*${MODES[m] || 'Sin definir'} (${l.length})*`;
    l.forEach(g => {
      const c = g.c || {}, loc = [c.addr, c.city].filter(Boolean).join(', ');
      p += `\n• ${c.name || c.nick || g.cn}${c.name && c.nick ? ` (${c.nick})` : ''} – ${pl(g.rows.length)} – ${money(sum(g.rows))}\n  N°: ${g.rows.map(r => '#' + (r.n || '–')).join(', ')}`;
      if (c.phone) p += `\n  Tel: ${c.phone}`;
      if (m === 'region' && c.rut) p += `\n  RUT: ${c.rut}`;
      if (m !== 'retiro' && loc) p += `\n  ${m === 'punto' ? 'Punto' : 'Dir'}: ${loc}`;
      if ((m === 'region' || m === 'domicilio') && !c.addr) p += '\n  ⚠️ Falta dirección';
      if (m === '') p += '\n  ⚠️ Falta definir tipo de entrega';
      if (c.social) p += `\n  Red: ${c.social}`;
      if (c.note) p += `\n  Nota: ${c.note}`;
    });
  });
  return p;
}
function buildTxt(rs) {
  const line = r => `• #${r.n || '–'} ${r.desc || 'Prenda'} – ${r.cn} – ${money(r.value)}`, gs = groups(rs);
  let o = `*CLEMENTINA · Informe de ventas*\nPeríodo: ${R.from ? fdate(R.from) : 'inicio'} al ${R.to ? fdate(R.to) : 'hoy'}\nCliente: ${R.client && cl(R.client) ? dname(cl(R.client)) : 'Todos'}\n\n`;
  if (R.sort === 'date') {
    const g = {}; rs.forEach(r => (g[r.date] = g[r.date] || []).push(r));
    Object.keys(g).forEach(d => { o += `*${fdate(d)}*\n${g[d].map(line).join('\n')}\nSubtotal: ${money(sum(g[d]))}\n\n`; });
  } else o += rs.map(r => `${fdate(r.date)} ${line(r)}`).join('\n') + '\n\n';
  o += '*Total por cliente*\n' + [...gs].sort((a, b) => sum(b.rows) - sum(a.rows)).map(g => `${g.cn}: ${money(sum(g.rows))}`).join('\n');
  return o + `\n\n*TOTAL: ${money(sum(rs))}* (${pl(rs.length)})\n\n` + packs(gs);
}
function buildCsv(rs) {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return '\ufeff' + ['Fecha;N° prenda;Descripción;Nick;Nombre;Valor;Entrega;Teléfono;Dirección;Ciudad/Región;RUT',
    ...rs.map(r => { const c = r.c || {}; return [fdate(r.date), q(r.n), q(r.desc), q(c.nick || ''), q(c.name || r.cn), r.value, q(MODES[c.mode] || ''), q(c.phone), q(c.addr), q(c.city), q(c.rut)].join(';'); })].join('\r\n');
}
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const wa = p => { let d = (p || '').replace(/\D/g, ''); if (d.length === 9) d = '56' + d; else if (d.length === 8) d = '569' + d; return d; };
function vInformes() {
  const rs = rows(), gs = groups(rs);
  const sel = (id, opts, v) => `<select id="${id}">${opts.map(([k, l]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const key = g => `${g.c?.id || '-'}|${g.rows.length}|${sum(g.rows)}`;
  $('#view').innerHTML = `<h2>Informes</h2>
  <div class="card form">
    <div class="row"><label>Desde<input type="date" id="rf" value="${R.from}"></label><label>Hasta<input type="date" id="rt" value="${R.to}"></label></div>
    <label>Cliente${sel('rc', [['', 'Todos'], ...sorted().map(c => [c.id, dname(c)])], R.client)}</label>
    <div class="row"><label>Ordenar por${sel('rs', [['date', 'Fecha'], ['client', 'Cliente'], ['value', 'Valor']], R.sort)}</label><label>Orden${sel('rd', [['desc', 'Descendente'], ['asc', 'Ascendente']], R.dir)}</label></div>
  </div>
  <div class="card total"><small>${pl(rs.length)}</small><b>${money(sum(rs))}</b></div>
  ${rs.length ? rs.map(r => `<div class="card item"><div class="t"><b>#${esc(r.n || '–')} ${esc(r.desc)}</b><small>${fdate(r.date)} · ${esc(r.cn)}</small></div><span class="val">${money(r.value)}</span></div>`).join('') : '<p class="empty">No hay ventas con estos filtros.</p>'}
  <div class="row"><button class="btn sm" id="xt">Texto .txt</button><button class="btn sm" id="xc">CSV</button><button class="btn sm ghost" id="xs">Compartir</button></div>
  ${rs.length ? `<h2>Paquetes</h2><div class="card">${byMode(gs).map(([m, l]) => `<p><b>${MODES[m] || 'Sin definir'} (${l.length})</b><br><small style="letter-spacing:.5px">${esc(l.map(g => g.cn).join(', '))}</small></p>`).join('')}</div>
  <h2>Mensajes para clientes</h2>
  ${gs.map((g, i) => `<div class="card msg ${S.sent[key(g)] ? 'done' : ''}"><div class="item"><div class="t"><b>${esc(g.cn)}</b><small>${pl(g.rows.length)} · ${money(sum(g.rows))}</small></div><span class="val ok">✓</span></div><div class="row"><button class="btn sm" data-cp="${i}">${S.sent[key(g)] ? 'Copiar de nuevo' : 'Copiar mensaje'}</button>${wa(g.c?.phone) ? `<a class="btn sm ghost" target="_blank" rel="noopener" href="https://wa.me/${wa(g.c.phone)}?text=${encodeURIComponent(msg(g))}">WhatsApp</a>` : ''}</div></div>`).join('')}` : ''}`;
  [['rf', 'from'], ['rt', 'to'], ['rc', 'client'], ['rs', 'sort'], ['rd', 'dir']].forEach(([id, k]) => $('#' + id).onchange = e => { R[k] = e.target.value; vInformes(); });
  const stamp = today();
  $('#xt').onclick = () => rs.length ? download(`clementina-informe-${stamp}.txt`, buildTxt(rs), 'text/plain;charset=utf-8') : toast('No hay datos');
  $('#xc').onclick = () => rs.length ? download(`clementina-informe-${stamp}.csv`, buildCsv(rs), 'text/csv;charset=utf-8') : toast('No hay datos');
  $('#xs').onclick = async () => {
    if (!rs.length) return toast('No hay datos');
    const text = buildTxt(rs);
    try { if (navigator.share) return await navigator.share({ text }); await navigator.clipboard.writeText(text); toast('Texto copiado'); } catch (e) { }
  };
  document.querySelectorAll('[data-cp]').forEach(b => b.onclick = async () => {
    const g = gs[b.dataset.cp];
    try { await navigator.clipboard.writeText(msg(g)); S.sent[key(g)] = 1; save(); b.closest('.msg').classList.add('done'); b.textContent = 'Copiado ✓'; toast('Mensaje copiado'); } catch (e) { toast('No se pudo copiar'); }
  });
}

/* ---------- ajustes ---------- */
function vAjustes() {
  const colors = ['#2468d6', '#e8710a', '#1fa35c', '#d6336c', '#7048e8'];
  const kb = (new Blob([localStorage.getItem(KEY) || '']).size / 1024).toFixed(1);
  const seg = (a, items, cur) => `<div class="seg">${items.map(([k, l]) => `<button class="btn sm ${cur === k ? '' : 'ghost'}" data-${a}="${k}">${l}</button>`).join('')}</div>`;
  $('#view').innerHTML = `<h2>Ajustes</h2>
  <div class="card form"><span class="lbl">Tema</span>${seg('t', [['auto', 'Auto'], ['light', 'Claro'], ['dark', 'Oscuro']], S.theme)}
    <span class="lbl">Color</span>
    <div class="sw">${colors.map(c => `<button style="background:${c}" class="${S.accent === c ? 'on' : ''}" data-c="${c}" aria-label="Color ${c}"></button>`).join('')}</div></div>
  <div class="card form"><span class="lbl">Cliente en ventas e informes</span>${seg('s', [['nick', 'Nick'], ['name', 'Nombre']], S.show)}
    <p style="color:var(--mute);font-size:14px">Si falta el dato elegido, se muestra el otro con un *.</p></div>
  <div class="card form"><span class="lbl">Mensaje para clientes</span>
    <textarea id="tp" rows="12">${esc(S.tpl)}</textarea>
    <p style="color:var(--mute);font-size:14px">Variables: {nombre} {prendas} {total}</p>
    <span class="lbl">Detalle de prendas</span>${seg('d', [['count', 'Solo cantidad'], ['list', 'Listar prendas']], S.detail)}
    <button class="btn sm ghost" id="tr">Restablecer mensaje</button></div>
  <div class="card form"><span class="lbl">Almacenamiento local</span>
    <p>${S.sales.length} ventas · ${S.clients.length} clientes · ${S.events.length} eventos · ${kb} KB</p>
    <p style="color:var(--mute);font-size:14px">Los datos viven solo en este dispositivo. Haz respaldos con frecuencia.</p>
    <button class="btn sm danger" id="wipe">Borrar todos los datos</button></div>
  <div class="card form"><span class="lbl">Exportar / importar datos</span>
    <button class="btn sm" id="ex">Exportar respaldo (.json)</button>
    <button class="btn sm ghost" id="im">Importar respaldo</button>
    <input type="file" id="fi" accept=".json,application/json" hidden></div>`;
  const on = (a, fn) => document.querySelectorAll(`[data-${a}]`).forEach(b => b.onclick = () => { fn(b.dataset[a]); save(); applyTheme(); vAjustes(); });
  on('t', v => S.theme = v); on('c', v => S.accent = v); on('s', v => S.show = v); on('d', v => S.detail = v);
  $('#tp').onchange = e => { S.tpl = e.target.value; save(); toast('Mensaje guardado'); };
  $('#tr').onclick = () => { if (confirm('¿Restablecer el mensaje original?')) { S.tpl = TPL; save(); vAjustes(); } };
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

document.querySelectorAll('#nav button').forEach(b => b.onclick = () => go(b.dataset.v));
$('#cfg').onclick = () => go('ajustes');
applyTheme();
render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
