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
const DEF = { clients: [], events: [], sales: [], theme: 'auto', accent: '#2468d6', show: 'nick', detail: 'count', tpl: TPL, sent: {}, pay: {}, hist: 5 };
let S = (() => { try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { return { ...DEF }; } })();
const save = () => localStorage.setItem(KEY, JSON.stringify(S));
const $ = s => document.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const money = n => '$' + Math.round(n).toLocaleString('es-CL');
const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const ymd = t => { const d = new Date(t); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
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
let V = 'ventas', CID = '';
const full = c => [c.name, c.nick && `[${c.nick}]`].filter(Boolean).join(' - ');
const pkey = (e, c) => e + '|' + c;
const isPaid = (e, c) => !!S.pay[pkey(e, c)];
const setPaid = (e, c) => { const k = pkey(e, c); if (S.pay[k]) delete S.pay[k]; else S.pay[k] = Date.now(); save(); };
const keepY = fn => { const y = scrollY; fn(); scrollTo(0, y); };
const R = { ids: null, title: '', tab: 'resumen', rf: '', rt: '', unch: [], client: '', sort: 'date', dir: 'desc', allDebt: false };

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
function go(v) { if (v === V && v === 'informes') R.ids = null; V = v; render(); window.scrollTo(0, 0); }
function render() {
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === (V === 'cliente' ? 'clientes' : V)));
  ({ cliente: vCliente, ventas: vVentas, clientes: vClientes, informes: vInformes, ajustes: vAjustes })[V]();
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
      <label>Nombre del live<input id="evn" value="${esc(e ? e.name : '')}" placeholder="Ej. Liquidación Blusas" autocomplete="off"></label><label>Fecha del evento<input type="date" id="evd" value="${e ? e.date : today()}"></label></div>
    <button class="btn ${e ? 'danger' : ''}" id="evb">${e ? 'Cerrar evento' : 'Iniciar evento'}</button>
  </div>
  <fieldset class="card form" ${e ? '' : 'disabled'}>
    <label>N° prenda<input id="n" inputmode="numeric" autocomplete="off"></label>
    <label>Descripción<input id="d" autocomplete="off"></label>
    <label>Valor<input id="v" inputmode="numeric" autocomplete="off"></label>
    <label>Cliente<select id="c">${opts}</select></label>
    <div class="row"><div class="sw2 ${S.show === 'name' ? 'r' : ''}" id="sw"><button type="button" id="sn" class="${S.show === 'nick' ? 'on' : ''}">Nick</button><button type="button" id="sm" class="${S.show === 'name' ? 'on' : ''}">Nombre</button></div><button type="button" class="btn sm outl fix" id="nc">+ Agregar</button></div>
    <button class="btn" id="add">Ingresar venta</button>
  </fieldset>
  ${e ? (sales.length ? sales.map(s => `<div class="card item"><div class="t"><b>#${esc(s.n || '–')} ${esc(s.desc)}</b><small>${esc(cdisp(s))}</small></div><span class="val">${money(s.value)}</span><button class="x" data-del="${s.id}" aria-label="Eliminar">✕</button></div>`).join('') : '<p class="empty">Aún no hay ventas en este evento.</p>')
    : '<p class="empty">Inicia un evento para ingresar ventas.</p>'}`;
  const evd = $('#evd');
  evd.onchange = () => { const ev = cur(); if (ev && evd.value) { ev.date = evd.value; save(); toast('Fecha actualizada'); } };
  $('#evn').onchange = () => { const ev = cur(); if (ev) { ev.name = $('#evn').value.trim(); save(); toast('Nombre guardado'); } };
  $('#evb').onclick = () => {
    if (e) { if (confirm('¿Cerrar el evento? Se guardará en informes con la fecha ' + fdate(e.date) + '.')) { e.end = Date.now(); save(); toast('Evento cerrado'); vVentas(); } }
    else { if (!evd.value) return toast('Elige una fecha'); S.events.push({ id: uid(), name: $('#evn').value.trim(), date: evd.value, start: Date.now() }); save(); toast('Evento iniciado'); vVentas(); }
  };
  if (!e) return;
  const f = () => ({ n: $('#n').value, d: $('#d').value, v: $('#v').value, c: $('#c').value });
  if (k) { $('#n').value = k.n; $('#d').value = k.d; $('#v').value = k.v; if (k.c) $('#c').value = k.c; }
  const sw = v => () => { S.show = v; save(); $('#sw').classList.toggle('r', v === 'name'); $('#sn').classList.toggle('on', v === 'nick'); $('#sm').classList.toggle('on', v === 'name'); setTimeout(() => { if (V === 'ventas') vVentas(f()); }, 220); };
  $('#sn').onclick = sw('nick'); $('#sm').onclick = sw('name');
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
  $('#view').innerHTML = `<h2>Clientes</h2>` + (S.clients.length ? sorted().map(c => `<div class="card item tap" data-o="${c.id}"><div class="t"><b>${esc(full(c))}</b></div><button class="x" data-e="${c.id}" aria-label="Editar">✎</button><button class="x" data-x="${c.id}" aria-label="Eliminar">✕</button></div>`).join('') : '<p class="empty">Aún no hay clientes. Toca + para agregar uno.</p>') + `<button class="fab" id="fab" aria-label="Agregar cliente">+</button>`;
  $('#fab').onclick = () => clientDlg(null, vClientes);
  document.querySelectorAll('[data-o]').forEach(el => el.onclick = () => { CID = el.dataset.o; go('cliente'); });
  document.querySelectorAll('[data-e]').forEach(b => b.onclick = ev => { ev.stopPropagation(); clientDlg(cl(b.dataset.e), vClientes); });
  document.querySelectorAll('[data-x]').forEach(b => b.onclick = ev => {
    ev.stopPropagation();
    const c = cl(b.dataset.x);
    if (S.sales.some(s => s.client === c.id)) return alert('No se puede eliminar: ' + full(c) + ' tiene ventas registradas.');
    if (confirm(`¿Eliminar a ${full(c)}?`)) { S.clients = S.clients.filter(x => x !== c); save(); vClientes(); }
  });
}
function vCliente() {
  const c = cl(CID); if (!c) return go('clientes');
  const mine = S.sales.filter(s => s.client === c.id);
  const evs = [...new Set(mine.map(s => s.event))].map(id => S.events.find(e => e.id === id)).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date) || b.start - a.start);
  const tot = e => mine.filter(s => s.event === e.id).reduce((a, s) => a + s.value, 0);
  const debt = evs.filter(e => !isPaid(e.id, c.id)).reduce((a, e) => a + tot(e), 0);
  const shown = S.hist > 0 ? evs.slice(0, S.hist) : evs;
  const info = [MODES[c.mode], c.phone, c.social, [c.addr, c.city].filter(Boolean).join(', '), c.rut && 'RUT ' + c.rut, c.note].filter(Boolean);
  $('#view').innerHTML = `<button class="btn sm ghost back" id="bk">← Clientes</button>
  <div class="card"><div class="item"><div class="t"><h2>${esc(full(c))}</h2></div><button class="x" id="ed" aria-label="Editar">✎</button></div>${info.map(i => `<small style="display:block;margin-top:4px">${esc(i)}</small>`).join('')}</div>
  <div class="card total"><small>Pendiente de pago</small><b style="color:var(--${debt ? 'warn' : 'ok'})">${money(debt)}</b></div>
  ${shown.length ? shown.map(e => { const ss = mine.filter(s => s.event === e.id).sort((a, b) => a.t - b.t), paid = S.pay[pkey(e.id, c.id)]; return `<div class="card msg ${paid ? 'done' : ''}"><div class="item"><div class="t"><b>${fdate(e.date)}${e.end ? '' : ' · abierto'}</b><small>${pl(ss.length)} · ${paid ? 'Pagado' : 'Pendiente'}</small></div><span class="val">${money(tot(e))}</span></div>${ss.map(x => `<div class="line"><span>#${esc(x.n || '–')} ${esc(x.desc)}</span><span>${money(x.value)}</span></div>`).join('')}<button class="btn sm ${paid ? 'okb' : 'outl'}" data-p="${e.id}">${paid ? 'Pagado ✓ ' + fdate(ymd(paid)) : 'Marcar como pagado'}</button></div>`; }).join('') : '<p class="empty">Este cliente aún no tiene compras.</p>'}
  ${evs.length > shown.length ? `<p class="empty">Mostrando los últimos ${shown.length} de ${evs.length} eventos. Cámbialo en Ajustes.</p>` : ''}`;
  $('#bk').onclick = () => go('clientes');
  $('#ed').onclick = () => clientDlg(c, vCliente);
  document.querySelectorAll('[data-p]').forEach(b => b.onclick = () => keepY(() => { setPaid(b.dataset.p, c.id); vCliente(); }));
}

/* ---------- informes ---------- */
const evName = e => e.name || 'Live';
const evLabel = e => `${evName(e)} · ${fdate(e.date)}`;
const evTot = id => S.sales.filter(s => s.event === id).reduce((a, s) => a + s.value, 0);
const evCnt = id => S.sales.filter(s => s.event === id).length;
const sum = rs => rs.reduce((a, r) => a + r.value, 0);
const st = a => a.reduce((x, p) => x + p.tot, 0);
function allRows() {
  return S.sales.map(s => { const e = S.events.find(x => x.id === s.event) || {}; return { ...s, date: e.date || '', ename: e.name || '', cn: cdisp(s), c: cl(s.client) }; });
}
function rows() { const set = new Set(R.ids); return allRows().filter(r => set.has(r.event)); }
function sortRows(rs) {
  const m = R.dir === 'asc' ? 1 : -1;
  const key = { date: (a, b) => a.date.localeCompare(b.date) || a.t - b.t, client: (a, b) => a.cn.localeCompare(b.cn) || a.t - b.t, value: (a, b) => a.value - b.value }[R.sort];
  return [...rs].sort((a, b) => m * key(a, b));
}
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
function pk(g, m) {
  const c = g.c || {}, loc = [c.addr, c.city].filter(Boolean).join(', '), L = [`N°: ${g.rows.map(r => '#' + (r.n || '–')).join(', ')}`];
  if (c.phone) L.push(`Tel: ${c.phone}`);
  if (m === 'region' && c.rut) L.push(`RUT: ${c.rut}`);
  if (m !== 'retiro' && loc) L.push(`${m === 'punto' ? 'Punto' : 'Dir'}: ${loc}`);
  if ((m === 'region' || m === 'domicilio') && !c.addr) L.push('⚠️ Falta dirección');
  if (m === '') L.push('⚠️ Falta definir tipo de entrega');
  if (c.social) L.push(`Red: ${c.social}`);
  if (c.note) L.push(`Nota: ${c.note}`);
  return { head: `${c.name || c.nick || g.cn}${c.name && c.nick ? ` (${c.nick})` : ''} – ${pl(g.rows.length)} – ${money(sum(g.rows))}`, lines: L };
}
function packs(gs) {
  let p = '*📦 PAQUETES A ARMAR*';
  byMode(gs).forEach(([m, l]) => { p += `\n\n*${MODES[m] || 'Sin definir'} (${l.length})*`; l.forEach(g => { const x = pk(g, m); p += `\n• ${x.head}` + x.lines.map(t => `\n  ${t}`).join(''); }); });
  return p;
}
function pays(rs) {
  const m = new Map();
  rs.forEach(r => { const k = pkey(r.event, r.client); if (!m.has(k)) m.set(k, { e: r.event, cid: r.client, cn: r.cn, date: r.date, name: r.ename, rows: [] }); m.get(k).rows.push(r); });
  return [...m.values()].map(p => ({ ...p, paid: S.pay[pkey(p.e, p.cid)], tot: sum(p.rows) })).sort((a, b) => a.date.localeCompare(b.date) || a.cn.localeCompare(b.cn));
}
const ptag = p => [p.name, fdate(p.date)].filter(Boolean).join(' · ');
function payTxt(ps) {
  const f = l => l.map(p => `• ${p.cn} – ${ptag(p)} – ${money(p.tot)}`).join('\n') || '—', pe = ps.filter(p => !p.paid), pa = ps.filter(p => p.paid);
  return `*💰 PAGOS*\n\n*Pendientes (${pe.length}) – ${money(st(pe))}*\n${f(pe)}\n\n*Pagados (${pa.length}) – ${money(st(pa))}*\n${f(pa)}`;
}
function buildTxt(rs) {
  const line = r => `• #${r.n || '–'} ${r.desc || 'Prenda'} – ${r.cn} – ${money(r.value)}`, gs = groups(rs);
  const ds = [...new Set(R.ids.map(id => (S.events.find(e => e.id === id) || {}).date).filter(Boolean))].sort();
  let o = `*CLEMENTINA · ${R.title}*\nPeríodo: ${fdate(ds[0])}${ds.length > 1 ? ' al ' + fdate(ds[ds.length - 1]) : ''}\nCliente: ${R.client && cl(R.client) ? dname(cl(R.client)) : 'Todos'}\n\n`;
  if (R.sort === 'date') {
    const g = {}; rs.forEach(r => (g[r.event] = g[r.event] || []).push(r));
    Object.values(g).forEach(l => { o += `*${[l[0].ename, fdate(l[0].date)].filter(Boolean).join(' · ')}*\n${l.map(line).join('\n')}\nSubtotal: ${money(sum(l))}\n\n`; });
  } else o += rs.map(r => `${fdate(r.date)} ${line(r)}`).join('\n') + '\n\n';
  o += '*Total por cliente*\n' + [...gs].sort((a, b) => sum(b.rows) - sum(a.rows)).map(g => `${g.cn}: ${money(sum(g.rows))}`).join('\n');
  return o + `\n\n*TOTAL: ${money(sum(rs))}* (${pl(rs.length)})\n\n` + payTxt(pays(rs)) + '\n\n' + packs(gs);
}
function buildCsv(rs) {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return '\ufeff' + ['Fecha;Live;N° prenda;Descripción;Nick;Nombre;Valor;Entrega;Teléfono;Dirección;Ciudad/Región;RUT;Pagado',
    ...rs.map(r => { const c = r.c || {}; return [fdate(r.date), q(r.ename), q(r.n), q(r.desc), q(c.nick || ''), q(c.name || r.cn), r.value, q(MODES[c.mode] || ''), q(c.phone), q(c.addr), q(c.city), q(c.rut), isPaid(r.event, r.client) ? 'Sí' : 'No'].join(';'); })].join('\r\n');
}
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const wa = p => { let d = (p || '').replace(/\D/g, ''); if (d.length === 9) d = '56' + d; else if (d.length === 8) d = '569' + d; return d; };
const opt = (id, opts, v) => `<select id="${id}">${opts.map(([k, l]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;

function vInformes() { R.ids ? vReporte() : vEntrada(); }
function openRep(ids, title) { Object.assign(R, { ids, title, tab: 'resumen', client: '', allDebt: false }); vInformes(); window.scrollTo(0, 0); }

/* pantalla de entrada: último live o rango */
function vEntrada() {
  if (!R.rf) { R.rf = ymd(Date.now() - 30 * 864e5); R.rt = today(); }
  const last = [...S.events].sort((a, b) => b.start - a.start)[0];
  const inR = S.events.filter(e => (!R.rf || e.date >= R.rf) && (!R.rt || e.date <= R.rt)).sort((a, b) => b.date.localeCompare(a.date) || b.start - a.start);
  const sel = inR.filter(e => !R.unch.includes(e.id));
  $('#view').innerHTML = `<h2>Informes</h2>
  <div class="card form"><small>Último live</small>
    ${last ? `<div class="item"><div class="t"><b>${esc(evName(last))}${last.end ? '' : ' · abierto'}</b><small>${fdate(last.date)} · ${pl(evCnt(last.id))}</small></div><span class="val">${money(evTot(last.id))}</span></div><button class="btn" id="bl">Ver informe del live</button>` : '<p class="empty">Aún no hay eventos.</p>'}</div>
  <div class="card form"><small>Informe por rango</small>
    <div class="row"><label>Desde<input type="date" id="rf" value="${R.rf}"></label><label>Hasta<input type="date" id="rt" value="${R.rt}"></label></div>
    ${inR.length ? inR.map(e => `<label class="chk"><input type="checkbox" data-ev="${e.id}" ${R.unch.includes(e.id) ? '' : 'checked'}><div class="t"><b>${esc(evName(e))}</b><small>${fdate(e.date)} · ${pl(evCnt(e.id))}</small></div><span class="val">${money(evTot(e.id))}</span></label>`).join('') : '<p class="empty">No hay eventos en este rango.</p>'}
    <button class="btn" id="br" ${sel.length ? '' : 'disabled'}>Ver informe (${sel.length} ${sel.length === 1 ? 'evento' : 'eventos'} · ${money(sel.reduce((a, e) => a + evTot(e.id), 0))})</button></div>`;
  $('#rf').onchange = e => { R.rf = e.target.value; R.unch = []; vEntrada(); };
  $('#rt').onchange = e => { R.rt = e.target.value; R.unch = []; vEntrada(); };
  document.querySelectorAll('[data-ev]').forEach(c => c.onchange = () => { const id = c.dataset.ev; R.unch = c.checked ? R.unch.filter(x => x !== id) : [...R.unch, id]; keepY(vEntrada); });
  $('#br').onclick = () => openRep(sel.map(e => e.id), sel.length === 1 ? evLabel(sel[0]) : `Informe ${fdate(R.rf)} al ${fdate(R.rt)}`);
  if (last) $('#bl').onclick = () => openRep([last.id], evLabel(last));
}

/* informe con pestañas */
function vReporte() {
  const all = rows(), rs = sortRows(all.filter(r => !R.client || r.client === R.client)), gs = groups(all);
  const ps = pays(all), pe = ps.filter(p => !p.paid), pa = ps.filter(p => p.paid);
  const key = g => `${g.c?.id || '-'}|${g.rows.length}|${sum(g.rows)}`;
  const tabs = [['resumen', 'Resumen'], ['pagos', 'Pagos' + (pe.length ? ` (${pe.length})` : '')], ['paquetes', 'Paquetes'], ['mensajes', 'Mensajes']];
  $('#view').innerHTML = `<div class="card item"><div class="t"><small>${R.ids.length === 1 ? 'Informe del live' : 'Informe de ' + R.ids.length + ' eventos'}</small><b>${esc(R.title)}</b></div><button class="btn sm ghost" id="chg">Cambiar</button></div>
  <div class="tabs">${tabs.map(([k, l]) => `<button class="${R.tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div><div id="tb"></div>`;
  ({ resumen: tabResumen, pagos: tabPagos, paquetes: tabPaquetes, mensajes: tabMensajes })[R.tab]({ all, rs, gs, pe, pa, key });
  $('#chg').onclick = () => { R.ids = null; vInformes(); };
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { R.tab = b.dataset.tab; vReporte(); });
}
function tabResumen({ all, rs }) {
  $('#tb').innerHTML = `<div class="card form"><label>Cliente${opt('rc', [['', 'Todos'], ...groups(all).filter(g => g.c).map(g => [g.c.id, g.cn])], R.client)}</label>
    <div class="row"><label>Ordenar por${opt('rs', [['date', 'Fecha'], ['client', 'Cliente'], ['value', 'Valor']], R.sort)}</label><label>Orden${opt('rd', [['desc', 'Descendente'], ['asc', 'Ascendente']], R.dir)}</label></div></div>
  <div class="card total"><small>${pl(rs.length)}</small><b>${money(sum(rs))}</b></div>
  ${rs.length ? rs.map(r => `<div class="card item"><div class="t"><b>#${esc(r.n || '–')} ${esc(r.desc)}</b><small>${fdate(r.date)}${r.ename ? ' · ' + esc(r.ename) : ''} · ${esc(r.cn)}</small></div><span class="val">${money(r.value)}</span></div>`).join('') : '<p class="empty">No hay ventas.</p>'}
  <div class="row"><button class="btn sm" id="xt">Texto .txt</button><button class="btn sm" id="xc">CSV</button><button class="btn sm ghost" id="xs">Compartir</button></div>`;
  [['rc', 'client'], ['rs', 'sort'], ['rd', 'dir']].forEach(([id, k]) => $('#' + id).onchange = e => { R[k] = e.target.value; vReporte(); });
  const stamp = today();
  $('#xt').onclick = () => rs.length ? download(`clementina-informe-${stamp}.txt`, buildTxt(rs), 'text/plain;charset=utf-8') : toast('No hay datos');
  $('#xc').onclick = () => rs.length ? download(`clementina-informe-${stamp}.csv`, buildCsv(rs), 'text/csv;charset=utf-8') : toast('No hay datos');
  $('#xs').onclick = async () => {
    if (!rs.length) return toast('No hay datos');
    const text = buildTxt(rs);
    try { if (navigator.share) return await navigator.share({ text }); await navigator.clipboard.writeText(text); toast('Texto copiado'); } catch (e) { }
  };
}
function tabPagos({ pe, pa }) {
  const pend = R.allDebt ? pays(allRows()).filter(p => !p.paid) : pe;
  const prow = p => `<div class="item pr"><div class="t"><b>${esc(p.cn)}</b><small>${esc(ptag(p))} · ${money(p.tot)}</small></div><button class="btn sm ${p.paid ? 'okb' : 'outl'}" data-pp="${p.e}|${p.cid}">${p.paid ? 'Pagado ✓' : 'Marcar pagado'}</button></div>`;
  $('#tb').innerHTML = `<div class="card"><label class="chk" style="border:0;padding:0"><input type="checkbox" id="ad" ${R.allDebt ? 'checked' : ''}><div class="t"><b>Incluir deudas de otros lives</b></div></label></div>
  <div class="card"><div class="total"><small>Pendientes (${pend.length})</small><b style="color:var(--warn)">${money(st(pend))}</b></div>${pend.map(prow).join('') || '<p class="empty">Sin pagos pendientes</p>'}</div>
  <div class="card"><div class="total"><small>Pagados (${pa.length})</small><b style="color:var(--ok)">${money(st(pa))}</b></div>${pa.map(prow).join('') || '<p class="empty">Sin pagos registrados</p>'}</div>`;
  $('#ad').onchange = e => { R.allDebt = e.target.checked; keepY(vReporte); };
  document.querySelectorAll('[data-pp]').forEach(b => b.onclick = () => keepY(() => { const [e, c] = b.dataset.pp.split('|'); setPaid(e, c); vReporte(); }));
}
function tabPaquetes({ gs }) {
  $('#tb').innerHTML = gs.length ? byMode(gs).map(([m, l]) => `<div class="card"><div class="total"><small>${MODES[m] || 'Sin definir'}</small><b>${l.length}</b></div>${l.map(g => { const x = pk(g, m); return `<div class="pk"><b>${esc(x.head)}</b>${x.lines.map(t => `<small>${esc(t)}</small>`).join('')}</div>`; }).join('')}</div>`).join('') : '<p class="empty">Sin ventas.</p>';
}
function tabMensajes({ gs, key }) {
  $('#tb').innerHTML = gs.length ? gs.map((g, i) => `<div class="card msg ${S.sent[key(g)] ? 'done' : ''}"><div class="item"><div class="t"><b>${esc(g.cn)}</b><small>${pl(g.rows.length)} · ${money(sum(g.rows))}</small></div><span class="val ok">✓</span></div><div class="row"><button class="btn sm" data-cp="${i}">Copiar mensaje</button>${wa(g.c?.phone) ? `<a class="btn sm ghost" target="_blank" rel="noopener" data-wa="${i}" href="https://wa.me/${wa(g.c.phone)}?text=${encodeURIComponent(msg(g))}">WhatsApp</a>` : ''}</div></div>`).join('') : '<p class="empty">Sin ventas.</p>';
  const mark = (i, el) => { S.sent[key(gs[i])] = 1; save(); el.closest('.msg').classList.add('done'); };
  document.querySelectorAll('[data-wa]').forEach(a => a.onclick = () => mark(a.dataset.wa, a));
  document.querySelectorAll('[data-cp]').forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(msg(gs[b.dataset.cp])); mark(b.dataset.cp, b); b.textContent = 'Copiado ✓'; toast('Mensaje copiado'); } catch (e) { toast('No se pudo copiar'); } });
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
  <div class="card form"><label>Historial de cliente: eventos a mostrar<input type="number" id="hi" min="1" placeholder="Todos" value="${S.hist || ''}"></label></div>
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
  $('#hi').onchange = e => { S.hist = parseInt(e.target.value) || 0; save(); toast('Guardado'); };
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
