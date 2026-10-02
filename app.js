'use strict';

const VERSION = '1.0.0';
const CLAVE = 'mis-cuentas:v1';

const CATEGORIAS_BASE = {
  gasto: [
    '🛒 Supermercado',
    '🍔 Comida afuera',
    '🏠 Alquiler / Expensas',
    '💡 Servicios',
    '🚗 Transporte / Nafta',
    '💊 Salud',
    '🎓 Educación',
    '👕 Ropa',
    '🎉 Salidas / Ocio',
    '💳 Tarjeta de crédito',
    '📱 Suscripciones',
    '🎁 Regalos',
    '📦 Otros',
  ],
  ingreso: ['💼 Sueldo', '💰 Extras / Changas', '🏷️ Ventas', '↩️ Reintegros', '📦 Otros'],
};

const $ = (sel) => document.querySelector(sel);
const pad = (n) => String(n).padStart(2, '0');
const redondear = (n) => Math.round(n * 100) / 100;
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const fmtEntero = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const fmtDecimal = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const moneda = (n) => (Number.isInteger(redondear(n)) ? fmtEntero : fmtDecimal).format(redondear(n));
const monedaRedonda = (n) => fmtEntero.format(Math.round(n));
const fmtNumero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });

/* ---------- Datos ---------- */

function esMovimientoValido(m) {
  return (
    m &&
    typeof m.id === 'string' &&
    (m.tipo === 'gasto' || m.tipo === 'ingreso') &&
    Number.isFinite(m.monto) &&
    m.monto > 0 &&
    typeof m.categoria === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(m.fecha)
  );
}

function listaDeTextos(v) {
  return Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()) : null;
}

function normalizarSaldoInicial(s) {
  return s && Number.isFinite(s.monto) && s.monto > 0 && /^\d{4}-\d{2}$/.test(s.mes)
    ? { monto: redondear(s.monto), mes: s.mes }
    : null;
}

function normalizar(d) {
  return {
    movimientos: Array.isArray(d.movimientos) ? d.movimientos.filter(esMovimientoValido) : [],
    saldoInicial: normalizarSaldoInicial(d.saldoInicial),
    categorias: {
      gasto: listaDeTextos(d.categorias?.gasto) ?? [...CATEGORIAS_BASE.gasto],
      ingreso: listaDeTextos(d.categorias?.ingreso) ?? [...CATEGORIAS_BASE.ingreso],
    },
    ultimaCopia: typeof d.ultimaCopia === 'string' ? d.ultimaCopia : null,
    recordarCopiaDesde: typeof d.recordarCopiaDesde === 'string' ? d.recordarCopiaDesde : null,
    fijosDescartados: listaDeTextos(d.fijosDescartados) ?? [],
  };
}

function cargar() {
  let crudo = null;
  try {
    crudo = localStorage.getItem(CLAVE);
    if (crudo) return normalizar(JSON.parse(crudo));
  } catch {
    // Si el JSON quedó corrupto se aparta en otra clave para no pisarlo con datos vacíos.
    try {
      if (crudo) localStorage.setItem(`${CLAVE}:corrupto:${Date.now()}`, crudo);
    } catch {}
  }
  return normalizar({});
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
    return true;
  } catch {
    avisar('No se pudo guardar en el celular. Exportá una copia desde Ajustes.');
    return false;
  }
}

function nuevoId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

let datos = cargar();

const ui = {
  mes: mesActual(),
  tab: 'movimientos',
  tipoCategorias: 'gasto',
  filtro: null,
  tipoAjustes: 'gasto',
};

/* ---------- Fechas ---------- */

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function mesActual() {
  return hoyISO().slice(0, 7);
}

function moverMes(mes, delta) {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function diasDelMes(mes) {
  const [y, m] = mes.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

const capitalizar = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function nombreMes(mes, corto = false) {
  const [y, m] = mes.split('-').map(Number);
  const fecha = new Date(y, m - 1, 1);
  if (corto) {
    const nombre = new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(fecha).replace('.', '');
    return `${capitalizar(nombre)} ${String(y).slice(2)}`;
  }
  return capitalizar(new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(fecha)) + ` ${y}`;
}

function etiquetaDia(fecha) {
  const hoy = hoyISO();
  const ayerD = new Date();
  ayerD.setDate(ayerD.getDate() - 1);
  const ayer = `${ayerD.getFullYear()}-${pad(ayerD.getMonth() + 1)}-${pad(ayerD.getDate())}`;
  if (fecha === hoy) return 'Hoy';
  if (fecha === ayer) return 'Ayer';
  const [y, m, d] = fecha.split('-').map(Number);
  return capitalizar(new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric' }).format(new Date(y, m - 1, d)));
}

function fechaCorta(fecha) {
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y}`;
}

/* ---------- Cálculos ---------- */

const movimientosDelMes = (mes) => datos.movimientos.filter((m) => m.fecha.startsWith(mes));

function totales(movs) {
  let ingresos = 0;
  let gastos = 0;
  for (const m of movs) {
    if (m.tipo === 'ingreso') ingresos += m.monto;
    else gastos += m.monto;
  }
  ingresos = redondear(ingresos);
  gastos = redondear(gastos);
  return { ingresos, gastos, saldo: redondear(ingresos - gastos) };
}

// Saldo con el que arranca el mes: el inicial (si ya rige) más todo lo anotado desde entonces.
function arrastre(mes) {
  const si = datos.saldoInicial;
  const rige = Boolean(si && mes >= si.mes);
  const desde = rige ? `${si.mes}-01` : '';
  const previos = datos.movimientos.filter((m) => m.fecha >= desde && m.fecha < `${mes}-01`);
  return redondear((rige ? si.monto : 0) + totales(previos).saldo);
}

function fijosPendientes(mes) {
  const anterior = movimientosDelMes(moverMes(mes, -1)).filter((m) => m.fijo && m.serie);
  if (!anterior.length) return [];
  const series = new Set(movimientosDelMes(mes).map((m) => m.serie).filter(Boolean));
  return anterior.filter((m) => !series.has(m.serie));
}

function parsearMonto(texto) {
  let s = String(texto).replace(/[\s$]/g, '');
  if (!s) return Number.NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  if (!/^\d+(\.\d+)?$/.test(s)) return Number.NaN;
  return redondear(Number(s));
}

function partirCategoria(cat) {
  const m = cat.match(/^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s*(.*)$/u);
  if (m) return { icono: m[1], nombre: m[2] || cat };
  return { icono: cat.trim().charAt(0).toUpperCase() || '•', nombre: cat };
}

/* ---------- Render principal ---------- */

function render() {
  $('#mes-titulo').textContent = nombreMes(ui.mes);
  const movs = movimientosDelMes(ui.mes);
  renderResumen(movs);
  renderAvisos();
  for (const b of document.querySelectorAll('.pestanias button')) {
    b.setAttribute('aria-selected', String(b.dataset.tab === ui.tab));
  }
  if (ui.tab === 'movimientos') renderMovimientos(movs);
  else if (ui.tab === 'categorias') renderCategorias(movs);
  else renderMeses();
}

function renderResumen(movs) {
  const t = totales(movs);
  const si = datos.saldoInicial;
  const mostrarAcumulado = (si && ui.mes >= si.mes) || datos.movimientos.some((m) => m.fecha < `${ui.mes}-01`);
  const anterior = arrastre(ui.mes);

  let medidor = '';
  if (t.ingresos > 0) {
    const pct = Math.round((t.gastos / t.ingresos) * 100);
    const clase = pct > 100 ? 'excede' : pct >= 90 ? 'alerta' : '';
    const texto =
      pct > 100
        ? `Gastaste ${moneda(t.gastos - t.ingresos)} más de lo que entró`
        : `Gastaste el ${pct}% de lo que entró`;
    medidor = `
      <div class="medidor">
        <div class="medidor-barra"><span class="${clase}" style="width:${Math.min(pct, 100)}%"></span></div>
        <p class="etq">${texto}</p>
      </div>`;
  }

  $('#resumen').innerHTML = `
    <p class="etq">Saldo del mes</p>
    <p class="saldo ${t.saldo < 0 ? 'neg' : ''}">${moneda(t.saldo)}</p>
    <div class="ie">
      <div><span class="etq">Ingresos</span><strong class="ing">${moneda(t.ingresos)}</strong></div>
      <div><span class="etq">Gastos</span><strong class="gas">${moneda(t.gastos)}</strong></div>
    </div>
    ${medidor}
    ${
      mostrarAcumulado
        ? `<div class="acum">
            <div><span class="etq">${si?.mes === ui.mes ? 'Saldo inicial' : 'Saldo anterior'}</span><strong>${moneda(anterior)}</strong></div>
            <div><span class="etq">Acumulado</span><strong>${moneda(anterior + t.saldo)}</strong></div>
          </div>`
        : ''
    }`;
}

function renderAvisos() {
  const partes = [];

  const pendientes = datos.fijosDescartados.includes(ui.mes) ? [] : fijosPendientes(ui.mes);
  if (pendientes.length) {
    const total = totales(pendientes);
    const detalle = [
      total.ingresos ? `${moneda(total.ingresos)} de ingresos` : '',
      total.gastos ? `${moneda(total.gastos)} de gastos` : '',
    ]
      .filter(Boolean)
      .join(' y ');
    partes.push(`
      <div class="aviso">
        <p>Tenés <strong>${pendientes.length} ${pendientes.length === 1 ? 'movimiento fijo' : 'movimientos fijos'}</strong> del mes pasado (${detalle}).</p>
        <div class="botones">
          <button type="button" class="btn primario" data-accion="cargar-fijos">Cargarlos</button>
          <button type="button" class="btn" data-accion="descartar-fijos">Ahora no</button>
        </div>
      </div>`);
  }

  if (necesitaRecordarCopia()) {
    partes.push(`
      <div class="aviso">
        <p>${datos.ultimaCopia ? 'Hace más de un mes que no guardás' : 'Todavía no guardaste'} una copia. Tus datos viven solo en este celular.</p>
        <div class="botones">
          <button type="button" class="btn primario" data-accion="exportar">Guardar copia</button>
          <button type="button" class="btn" data-accion="posponer-copia">Más tarde</button>
        </div>
      </div>`);
  }

  if (eventoInstalar && !esInstalada()) {
    partes.push(`
      <div class="aviso">
        <p>Instalá Mis Cuentas para abrirla como una app, aunque no tengas internet.</p>
        <div class="botones"><button type="button" class="btn primario" data-accion="instalar">Instalar</button></div>
      </div>`);
  }

  $('#avisos').innerHTML = partes.join('');
}

function necesitaRecordarCopia() {
  if (datos.movimientos.length < 15) return false;
  const hace30 = Date.now() - 30 * 864e5;
  if (datos.recordarCopiaDesde && Date.parse(datos.recordarCopiaDesde) > Date.now()) return false;
  return !datos.ultimaCopia || Date.parse(datos.ultimaCopia) < hace30;
}

function renderMovimientos(movs) {
  const vista = $('#vista');
  let lista = movs;
  let filtro = '';
  if (ui.filtro) {
    lista = movs.filter((m) => m.categoria === ui.filtro.categoria && m.tipo === ui.filtro.tipo);
    const t = totales(lista);
    filtro = `
      <div class="filtro">
        <span>${esc(ui.filtro.categoria)} · <strong class="num">${moneda(t.gastos + t.ingresos)}</strong></span>
        <button type="button" data-accion="quitar-filtro" aria-label="Quitar filtro">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>`;
  }

  if (!lista.length) {
    vista.innerHTML =
      filtro +
      (ui.filtro
        ? '<div class="vacio">No hay movimientos en esta categoría.</div>'
        : `<div class="vacio"><strong>Nada cargado en ${esc(nombreMes(ui.mes))}</strong>Tocá el botón + para anotar tu primer gasto o ingreso.</div>`);
    return;
  }

  const ordenados = [...lista].sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.creado ?? 0) - (a.creado ?? 0));
  const porDia = new Map();
  for (const m of ordenados) {
    if (!porDia.has(m.fecha)) porDia.set(m.fecha, []);
    porDia.get(m.fecha).push(m);
  }

  let html = filtro;
  for (const [fecha, delDia] of porDia) {
    const neto = totales(delDia).saldo;
    html += `
      <div class="dia">
        <div class="dia-cab"><span>${esc(etiquetaDia(fecha))}</span><span class="num">${neto > 0 ? '+' : ''}${moneda(neto)}</span></div>
        <ul class="lista tarjeta">${delDia.map(filaMovimiento).join('')}</ul>
      </div>`;
  }
  vista.innerHTML = html;
}

function filaMovimiento(m) {
  const { icono, nombre } = partirCategoria(m.categoria);
  const signo = m.tipo === 'ingreso' ? '+' : '−';
  const fijo = m.fijo ? '<span class="etiqueta">fijo</span>' : '';
  return `
    <li><button type="button" class="mov" data-id="${esc(m.id)}">
      <span class="ico" aria-hidden="true">${esc(icono)}</span>
      <span class="txt">
        <span class="t1">${esc(nombre)}${fijo}</span>
        ${m.nota ? `<span class="t2">${esc(m.nota)}</span>` : ''}
      </span>
      <span class="monto ${m.tipo === 'ingreso' ? 'ing' : 'gas'}">${signo} ${moneda(m.monto)}</span>
    </button></li>`;
}

function renderCategorias(movs) {
  const tipo = ui.tipoCategorias;
  const delTipo = movs.filter((m) => m.tipo === tipo);
  const total = redondear(delTipo.reduce((s, m) => s + m.monto, 0));

  const grupos = new Map();
  for (const m of delTipo) {
    const g = grupos.get(m.categoria) ?? { total: 0, cantidad: 0 };
    g.total += m.monto;
    g.cantidad += 1;
    grupos.set(m.categoria, g);
  }
  const filas = [...grupos].map(([categoria, g]) => ({ categoria, ...g })).sort((a, b) => b.total - a.total);
  const maximo = filas[0]?.total ?? 0;

  const selector = `
    <div class="segmento" role="radiogroup" aria-label="Ver categorías de">
      <button type="button" role="radio" data-accion="tipo-categorias" data-tipo="gasto" aria-checked="${tipo === 'gasto'}">Gastos</button>
      <button type="button" role="radio" data-accion="tipo-categorias" data-tipo="ingreso" aria-checked="${tipo === 'ingreso'}">Ingresos</button>
    </div>`;

  if (!filas.length) {
    $('#vista').innerHTML = `${selector}<div class="vacio">No hay ${tipo === 'gasto' ? 'gastos' : 'ingresos'} en ${esc(nombreMes(ui.mes))}.</div>`;
    return;
  }

  const items = filas
    .map((f) => {
      const { icono, nombre } = partirCategoria(f.categoria);
      const pct = total ? Math.round((f.total / total) * 100) : 0;
      return `
        <li><button type="button" class="cat" data-categoria="${esc(f.categoria)}" data-tipo="${tipo}">
          <span class="ico" aria-hidden="true">${esc(icono)}</span>
          <span class="txt"><span class="t1">${esc(nombre)}</span><span class="t2">${f.cantidad} ${f.cantidad === 1 ? 'movimiento' : 'movimientos'}</span></span>
          <span class="monto">${moneda(f.total)}<small>${pct}%</small></span>
          <span class="cat-barra ${tipo}" aria-hidden="true"><span style="width:${(f.total / maximo) * 100}%"></span></span>
        </button></li>`;
    })
    .join('');

  $('#vista').innerHTML = `
    ${selector}
    <div class="cat-total"><span>Total de ${tipo === 'gasto' ? 'gastos' : 'ingresos'}</span><strong class="num">${moneda(total)}</strong></div>
    <ul class="lista tarjeta">${items}</ul>
    <p class="nota-tabla">Tocá una categoría para ver sus movimientos.</p>`;
}

function renderMeses() {
  const actual = mesActual();
  let ultimo = actual;
  let primero = actual;
  for (const m of datos.movimientos) {
    const mes = m.fecha.slice(0, 7);
    if (mes > ultimo) ultimo = mes;
    if (mes < primero) primero = mes;
  }

  const meses = [];
  for (let mes = ultimo; mes >= primero && meses.length < 12; mes = moverMes(mes, -1)) meses.push(mes);

  const filas = meses.map((mes) => ({ mes, movs: movimientosDelMes(mes) })).map((f) => ({ ...f, t: totales(f.movs) }));
  const conDatos = filas.filter((f) => f.movs.length);

  const cuerpo = filas
    .map(
      ({ mes, t, movs }) => `
      <tr data-mes="${mes}" class="${mes === ui.mes ? 'actual' : ''}">
        <td>${esc(nombreMes(mes, true))}</td>
        <td class="ing">${movs.length ? monedaRedonda(t.ingresos) : '–'}</td>
        <td class="gas">${movs.length ? monedaRedonda(t.gastos) : '–'}</td>
        <td class="${t.saldo < 0 ? 'gas' : ''}">${movs.length ? monedaRedonda(t.saldo) : '–'}</td>
      </tr>`,
    )
    .join('');

  let pie = '';
  if (conDatos.length > 1) {
    const n = conDatos.length;
    const suma = conDatos.reduce(
      (acc, f) => ({ ingresos: acc.ingresos + f.t.ingresos, gastos: acc.gastos + f.t.gastos }),
      { ingresos: 0, gastos: 0 },
    );
    pie = `
      <tfoot><tr>
        <td>Promedio</td>
        <td>${monedaRedonda(suma.ingresos / n)}</td>
        <td>${monedaRedonda(suma.gastos / n)}</td>
        <td>${monedaRedonda((suma.ingresos - suma.gastos) / n)}</td>
      </tr></tfoot>`;
  }

  $('#vista').innerHTML = `
    <div class="tarjeta tabla-marco">
      <table class="tabla">
        <thead><tr><th scope="col">Mes</th><th scope="col">Ingresos</th><th scope="col">Gastos</th><th scope="col">Saldo</th></tr></thead>
        <tbody>${cuerpo}</tbody>
        ${pie}
      </table>
    </div>
    <p class="nota-tabla">Últimos 12 meses${conDatos.length > 1 ? `. El promedio usa los ${conDatos.length} meses con movimientos` : ''}. Tocá un mes para verlo.</p>`;
}

/* ---------- Hojas (diálogos) ---------- */

function abrirHoja(dlg) {
  dlg.showModal();
  history.pushState({ hoja: dlg.id }, '');
}

for (const dlg of document.querySelectorAll('dialog.hoja')) {
  dlg.addEventListener('close', () => {
    if (history.state?.hoja === dlg.id) history.back();
  });
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-cerrar]')) dlg.close();
  });
}

// El botón "atrás" de Android cierra la hoja en vez de salir de la app.
window.addEventListener('popstate', () => {
  for (const dlg of document.querySelectorAll('dialog[open]')) dlg.close();
});

/* ---------- Alta y edición de movimientos ---------- */

const hojaMov = $('#hoja-mov');
const formMov = {
  tipo: 'gasto',
  categoria: null,
  editando: null,
};

function abrirMovimiento(id) {
  const m = id ? datos.movimientos.find((x) => x.id === id) : null;
  formMov.editando = m;
  formMov.tipo = m?.tipo ?? 'gasto';
  formMov.categoria = m?.categoria ?? null;

  $('#mov-titulo').textContent = m ? 'Editar movimiento' : 'Nuevo movimiento';
  $('#mov-monto').value = m ? fmtNumero.format(m.monto) : '';
  $('#mov-fecha').value = m?.fecha ?? (ui.mes === mesActual() ? hoyISO() : `${ui.mes}-01`);
  $('#mov-nota').value = m?.nota ?? '';
  $('#mov-fijo').checked = Boolean(m?.fijo);
  $('#mov-eliminar').hidden = !m;
  $('#mov-error').textContent = '';
  pintarTipoMov();
  abrirHoja(hojaMov);
  if (!m) $('#mov-monto').focus();
}

function pintarTipoMov() {
  for (const b of document.querySelectorAll('#mov-tipo button')) {
    b.setAttribute('aria-checked', String(b.dataset.tipo === formMov.tipo));
  }
  const cats = [...datos.categorias[formMov.tipo]];
  if (formMov.categoria && !cats.includes(formMov.categoria)) {
    if (formMov.editando?.tipo === formMov.tipo && formMov.editando.categoria === formMov.categoria) {
      cats.push(formMov.categoria);
    } else {
      formMov.categoria = null;
    }
  }
  $('#mov-cats').innerHTML =
    cats
      .map(
        (c) =>
          `<button type="button" class="chip" role="radio" data-categoria="${esc(c)}" aria-checked="${c === formMov.categoria}">${esc(c)}</button>`,
      )
      .join('') + '<button type="button" class="chip nueva" data-accion="nueva-categoria">+ Nueva</button>';
}

$('#mov-tipo').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tipo]');
  if (!b || b.dataset.tipo === formMov.tipo) return;
  formMov.tipo = b.dataset.tipo;
  pintarTipoMov();
});

$('#mov-cats').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.accion === 'nueva-categoria') {
    const nombre = pedirCategoriaNueva(formMov.tipo);
    if (nombre) formMov.categoria = nombre;
  } else {
    formMov.categoria = b.dataset.categoria;
  }
  $('#mov-error').textContent = '';
  pintarTipoMov();
});

function pedirCategoriaNueva(tipo) {
  const texto = prompt(`Nombre de la nueva categoría de ${tipo === 'gasto' ? 'gastos' : 'ingresos'}.\nPodés empezar con un emoji, por ejemplo: 🏋️ Gimnasio`);
  return agregarCategoria(tipo, texto);
}

function agregarCategoria(tipo, texto) {
  const nombre = (texto ?? '').trim().replace(/\s+/g, ' ').slice(0, 30);
  if (!nombre) return null;
  const lista = datos.categorias[tipo];
  const existente = lista.find((c) => c.toLocaleLowerCase('es') === nombre.toLocaleLowerCase('es'));
  if (existente) return existente;
  lista.push(nombre);
  guardar();
  return nombre;
}

$('#form-mov').addEventListener('submit', (e) => {
  e.preventDefault();
  const error = $('#mov-error');
  const monto = parsearMonto($('#mov-monto').value);
  const fecha = $('#mov-fecha').value;
  const nota = $('#mov-nota').value.trim();
  const fijo = $('#mov-fijo').checked;

  if (!(monto > 0)) {
    error.textContent = 'Poné un monto mayor a cero.';
    $('#mov-monto').focus();
    return;
  }
  if (!formMov.categoria) {
    error.textContent = 'Elegí una categoría.';
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    error.textContent = 'Elegí la fecha.';
    return;
  }

  const m = formMov.editando;
  const campos = { tipo: formMov.tipo, monto, categoria: formMov.categoria, fecha, nota, fijo };
  if (m) {
    Object.assign(m, campos, { serie: fijo ? (m.serie ?? m.id) : (m.serie ?? null) });
  } else {
    const id = nuevoId();
    datos.movimientos.push({ id, ...campos, serie: fijo ? id : null, creado: Date.now() });
  }
  guardar();

  ui.mes = fecha.slice(0, 7);
  hojaMov.close();
  render();
  avisar(m ? 'Cambios guardados' : formMov.tipo === 'gasto' ? 'Gasto anotado' : 'Ingreso anotado');
});

$('#mov-eliminar').addEventListener('click', () => {
  const m = formMov.editando;
  if (!m || !confirm('¿Eliminar este movimiento?')) return;
  const indice = datos.movimientos.indexOf(m);
  datos.movimientos.splice(indice, 1);
  guardar();
  hojaMov.close();
  render();
  avisar('Movimiento eliminado', {
    texto: 'Deshacer',
    accion: () => {
      datos.movimientos.splice(indice, 0, m);
      guardar();
      render();
    },
  });
});

/* ---------- Fijos ---------- */

function cargarFijos() {
  const pendientes = fijosPendientes(ui.mes);
  const dias = diasDelMes(ui.mes);
  for (const f of pendientes) {
    const dia = Math.min(Number(f.fecha.slice(8, 10)), dias);
    datos.movimientos.push({
      id: nuevoId(),
      tipo: f.tipo,
      monto: f.monto,
      categoria: f.categoria,
      fecha: `${ui.mes}-${pad(dia)}`,
      nota: f.nota ?? '',
      fijo: true,
      serie: f.serie,
      creado: Date.now(),
    });
  }
  guardar();
  ui.tab = 'movimientos';
  ui.filtro = null;
  render();
  avisar(`Se cargaron ${pendientes.length}. Si algún monto cambió, tocalo para editarlo.`);
}

/* ---------- Ajustes ---------- */

const hojaAjustes = $('#hoja-ajustes');

function abrirAjustes() {
  pintarAjustes();
  pintarSaldoInicial();
  abrirHoja(hojaAjustes);
}

function pintarSaldoInicial(estado = '') {
  const si = datos.saldoInicial;
  $('#aj-saldo').value = si ? fmtNumero.format(si.monto) : '';
  $('#aj-saldo-mes').value = si?.mes ?? ui.mes;
  $('#aj-saldo-estado').textContent = estado;
}

$('#aj-form-saldo').addEventListener('submit', (e) => {
  e.preventDefault();
  const texto = $('#aj-saldo').value.trim();
  const mes = $('#aj-saldo-mes').value;
  if (!texto) {
    datos.saldoInicial = null;
  } else {
    const monto = parsearMonto(texto);
    if (!(monto > 0)) {
      $('#aj-saldo-estado').textContent = 'Poné un monto válido, o dejalo vacío para no usar saldo inicial.';
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(mes)) {
      $('#aj-saldo-estado').textContent = 'Elegí el mes desde el que cuenta.';
      return;
    }
    datos.saldoInicial = { monto, mes };
  }
  guardar();
  render();
  pintarSaldoInicial(datos.saldoInicial ? 'Guardado.' : 'Saldo inicial quitado.');
});

function pintarAjustes() {
  $('#aj-ultima-copia').textContent = datos.ultimaCopia
    ? `Última copia: ${fechaCorta(datos.ultimaCopia.slice(0, 10))}.`
    : 'Todavía no exportaste ninguna copia.';
  $('#aj-version').textContent = `Mis Cuentas ${VERSION} · ${datos.movimientos.length} movimientos guardados`;

  const instalar = $('#aj-instalar');
  instalar.hidden = esInstalada();
  $('#aj-instalar-btn').hidden = !eventoInstalar;
  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  $('#aj-instalar-texto').textContent = eventoInstalar
    ? 'Queda como una app más en tu pantalla de inicio y funciona sin internet.'
    : esIOS
      ? 'En Safari tocá el botón Compartir y después «Agregar a inicio».'
      : 'Abrí el menú del navegador (⋮) y elegí «Instalar app» o «Agregar a la pantalla de inicio».';

  for (const b of document.querySelectorAll('#aj-tipo button')) {
    b.setAttribute('aria-checked', String(b.dataset.tipo === ui.tipoAjustes));
  }
  $('#aj-cats').innerHTML = datos.categorias[ui.tipoAjustes]
    .map(
      (c) => `
      <li><span>${esc(c)}</span>
        <button type="button" class="icono" data-quitar="${esc(c)}" aria-label="Quitar ${esc(c)}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </li>`,
    )
    .join('');
}

$('#aj-tipo').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tipo]');
  if (!b) return;
  ui.tipoAjustes = b.dataset.tipo;
  pintarAjustes();
});

$('#aj-cats').addEventListener('click', (e) => {
  const b = e.target.closest('[data-quitar]');
  if (!b) return;
  const cat = b.dataset.quitar;
  const lista = datos.categorias[ui.tipoAjustes];
  if (lista.length <= 1) {
    alert('Tiene que quedar al menos una categoría.');
    return;
  }
  const usos = datos.movimientos.filter((m) => m.tipo === ui.tipoAjustes && m.categoria === cat).length;
  const pregunta = usos
    ? `Hay ${usos} movimientos en «${cat}». Se conservan, pero la categoría ya no aparece para elegir. ¿Quitarla?`
    : `¿Quitar «${cat}»?`;
  if (!confirm(pregunta)) return;
  lista.splice(lista.indexOf(cat), 1);
  guardar();
  pintarAjustes();
});

$('#aj-form-cat').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#aj-nueva-cat');
  if (agregarCategoria(ui.tipoAjustes, input.value)) {
    input.value = '';
    pintarAjustes();
  }
});

/* ---------- Copia de seguridad y planilla ---------- */

async function entregarArchivo(nombre, contenido, tipoMime) {
  const archivo = new File([contenido], nombre, { type: tipoMime });
  const esCelular = matchMedia('(pointer: coarse)').matches;
  if (esCelular && navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: nombre });
      return true;
    } catch (err) {
      if (err.name === 'AbortError') return false;
    }
  }
  const url = URL.createObjectURL(archivo);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

async function exportarCopia() {
  const copia = {
    app: 'mis-cuentas',
    version: 1,
    exportado: new Date().toISOString(),
    movimientos: datos.movimientos,
    saldoInicial: datos.saldoInicial,
    categorias: datos.categorias,
  };
  const ok = await entregarArchivo(`mis-cuentas-${hoyISO()}.json`, JSON.stringify(copia, null, 1), 'application/json');
  if (!ok) return;
  datos.ultimaCopia = new Date().toISOString();
  datos.recordarCopiaDesde = null;
  guardar();
  render();
  if (hojaAjustes.open) pintarAjustes();
  avisar('Copia exportada');
}

async function importarCopia(archivo) {
  let copia;
  try {
    copia = JSON.parse(await archivo.text());
  } catch {
    alert('Ese archivo no es una copia de Mis Cuentas.');
    return;
  }
  if (!copia || !Array.isArray(copia.movimientos)) {
    alert('Ese archivo no es una copia de Mis Cuentas.');
    return;
  }
  const nuevos = normalizar(copia);
  const descartados = copia.movimientos.length - nuevos.movimientos.length;
  const pregunta =
    `La copia tiene ${nuevos.movimientos.length} movimientos` +
    (nuevos.saldoInicial ? ` y un saldo inicial de ${moneda(nuevos.saldoInicial.monto)}` : '') +
    (descartados ? ` (${descartados} con datos inválidos se van a ignorar)` : '') +
    `.\n\nReemplaza lo que tenés ahora en este celular (${datos.movimientos.length} movimientos). ¿Seguir?`;
  if (!confirm(pregunta)) return;
  datos = { ...nuevos, ultimaCopia: typeof copia.exportado === 'string' ? copia.exportado : null };
  guardar();
  ui.filtro = null;
  hojaAjustes.close();
  render();
  avisar('Copia importada');
}

function exportarPlanilla() {
  const celda = (v) => {
    const s = String(v ?? '');
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const filas = [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Fijo']];
  const si = datos.saldoInicial;
  if (si) filas.push([fechaCorta(`${si.mes}-01`), 'Saldo inicial', '', '', String(si.monto).replace('.', ','), '']);
  const ordenados = [...datos.movimientos].sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.creado ?? 0) - (b.creado ?? 0));
  for (const m of ordenados) {
    const monto = m.tipo === 'gasto' ? -m.monto : m.monto;
    filas.push([
      fechaCorta(m.fecha),
      m.tipo === 'gasto' ? 'Gasto' : 'Ingreso',
      partirCategoria(m.categoria).nombre,
      m.nota ?? '',
      String(monto).replace('.', ','),
      m.fijo ? 'Sí' : '',
    ]);
  }
  const csv = `﻿${filas.map((f) => f.map(celda).join(';')).join('\r\n')}`;
  entregarArchivo(`mis-cuentas-${hoyISO()}.csv`, csv, 'text/csv');
}

$('#aj-exportar').addEventListener('click', exportarCopia);
$('#aj-importar').addEventListener('click', () => $('#aj-archivo').click());
$('#aj-archivo').addEventListener('change', (e) => {
  const archivo = e.target.files?.[0];
  e.target.value = '';
  if (archivo) importarCopia(archivo);
});
$('#aj-csv').addEventListener('click', exportarPlanilla);
$('#aj-borrar').addEventListener('click', () => {
  if (!confirm(`Se van a borrar los ${datos.movimientos.length} movimientos de este celular. Esto no se puede deshacer.\n\n¿Borrar todo?`)) return;
  datos = normalizar({});
  guardar();
  ui.filtro = null;
  hojaAjustes.close();
  render();
  avisar('Se borraron todos los datos');
});

/* ---------- Instalación ---------- */

let eventoInstalar = null;

const esInstalada = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  eventoInstalar = e;
  renderAvisos();
  if (hojaAjustes.open) pintarAjustes();
});

window.addEventListener('appinstalled', () => {
  eventoInstalar = null;
  renderAvisos();
});

async function instalar() {
  if (!eventoInstalar) return;
  eventoInstalar.prompt();
  await eventoInstalar.userChoice;
  eventoInstalar = null;
  renderAvisos();
  if (hojaAjustes.open) pintarAjustes();
}

$('#aj-instalar-btn').addEventListener('click', instalar);

/* ---------- Aviso flotante ---------- */

let temporizadorAviso;

function avisar(mensaje, boton) {
  const el = $('#aviso-flotante');
  el.innerHTML = `<span>${esc(mensaje)}</span>${boton ? `<button type="button">${esc(boton.texto)}</button>` : ''}`;
  if (boton) {
    el.querySelector('button').addEventListener('click', () => {
      boton.accion();
      el.classList.remove('visible');
    });
  }
  el.classList.add('visible');
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => el.classList.remove('visible'), boton ? 5000 : 2600);
}

/* ---------- Eventos de la pantalla principal ---------- */

$('#mes-ant').addEventListener('click', () => {
  ui.mes = moverMes(ui.mes, -1);
  ui.filtro = null;
  render();
});
$('#mes-sig').addEventListener('click', () => {
  ui.mes = moverMes(ui.mes, 1);
  ui.filtro = null;
  render();
});
$('#mes-titulo').addEventListener('click', () => {
  ui.mes = mesActual();
  ui.filtro = null;
  render();
});
$('#btn-ajustes').addEventListener('click', abrirAjustes);
$('#btn-nuevo').addEventListener('click', () => abrirMovimiento(null));

document.querySelector('.pestanias').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  ui.tab = b.dataset.tab;
  render();
});

document.querySelector('main').addEventListener('click', (e) => {
  const el = e.target.closest('[data-id], [data-categoria], [data-mes], [data-accion]');
  if (!el) return;
  if (el.dataset.id) return abrirMovimiento(el.dataset.id);
  if (el.dataset.mes) {
    ui.mes = el.dataset.mes;
    ui.tab = 'movimientos';
    ui.filtro = null;
    return render();
  }
  if (el.dataset.categoria) {
    ui.filtro = { categoria: el.dataset.categoria, tipo: el.dataset.tipo };
    ui.tab = 'movimientos';
    return render();
  }
  switch (el.dataset.accion) {
    case 'quitar-filtro':
      ui.filtro = null;
      render();
      break;
    case 'tipo-categorias':
      ui.tipoCategorias = el.dataset.tipo;
      render();
      break;
    case 'cargar-fijos':
      cargarFijos();
      break;
    case 'descartar-fijos':
      datos.fijosDescartados.push(ui.mes);
      guardar();
      renderAvisos();
      break;
    case 'exportar':
      exportarCopia();
      break;
    case 'posponer-copia':
      datos.recordarCopiaDesde = new Date(Date.now() + 7 * 864e5).toISOString();
      guardar();
      renderAvisos();
      break;
    case 'instalar':
      instalar();
      break;
  }
});

/* ---------- Arranque ---------- */

render();

navigator.storage?.persist?.().catch(() => {});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
