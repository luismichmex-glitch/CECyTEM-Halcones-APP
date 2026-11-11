export const URL_BASE =
  'https://script.google.com/macros/s/AKfycbyXP6zGGhWA0-YpnuAj3oiuBg9fBuOymny-jjzE6lpWCyNL-kSST-J7tQ3UJQubbklw/exec';
export const API_KEY = 'HALCONES_33_KEY_2026';
export const GOOGLE_SCRIPT_URL = URL_BASE;

export const INITIAL_STATE = {
  resumen: {
    saldoNetoDisponible: 0,
    saldoNeto: 0,
    totalArbitraje: 0,
    pagoArbitros: 0,
    totalMultas: 0,
    gastosOperativos: 0,
  },
  partidos: [],
  multas: [],
  gastos: [],
  plantilla: {
    Femenil: [],
    Varonil: [],
  },
};

export function normalizeDateToIso(str) {
  if (!str) return '';
  const trimmed = String(str).trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (ddmmyyyy) {
    const d = ddmmyyyy[1].padStart(2, '0');
    const m = ddmmyyyy[2].padStart(2, '0');
    const y = ddmmyyyy[3];
    return `${y}-${m}-${d}`;
  }

  const monthMap = {
    ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
    jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12'
  };
  const matchSp = trimmed.match(/^(\d{1,2})\s+([a-zA-Z]{3,4})\.?\s+(\d{4})/i);
  if (matchSp) {
    const d = matchSp[1].padStart(2, '0');
    const monKey = matchSp[2].toLowerCase().substring(0, 3);
    const m = monthMap[monKey] || '01';
    const y = matchSp[3];
    return `${y}-${m}-${d}`;
  }

  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    const dt = new Date(parsed);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return trimmed;
}

function parseNum(val, fallback = 0) {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const cleaned = String(val).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? fallback : parsed;
}

function normalizeRosterFromApi(rawList) {
  const result = {
    Femenil: [],
    Varonil: [],
  };

  if (!Array.isArray(rawList)) return result;

  rawList.forEach((item, index) => {
    if (!item) return;
    const rawRama = String(item.rama || item.categoria || item.genero || 'Femenil');
    const isVaronil = rawRama.toLowerCase().includes('var');
    const rama = isVaronil ? 'Varonil' : 'Femenil';
    const dorsal = String(item.dorsal ?? item.numero ?? '').trim();
    const nombre = String(item.nombre || item.jugador || item.name || '').trim();
    if (!nombre) return;
    const posicion = String(item.posicion || item.rol || 'Plantilla Oficial').trim();

    const playerObj = {
      id: item.id || `${rama}-${dorsal || index}-${index}`,
      dorsal: dorsal || '--',
      nombre,
      posicion: posicion || 'Plantilla Oficial',
      rama,
    };

    if (rama === 'Varonil') {
      result.Varonil.push(playerObj);
    } else {
      result.Femenil.push(playerObj);
    }
  });

  return result;
}

export async function fetchHalconesData() {
  const response = await fetch(`${URL_BASE}?key=${API_KEY}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json, text/plain, */*',
    },
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Respuesta no es JSON válido desde Google Apps Script');
  }

  const rawResumen = data.resumen || {};
  const totalArbitraje = parseNum(rawResumen.totalArbitraje, 0);
  const pagoArbitros = parseNum(rawResumen.pagoArbitros, 0);
  const totalMultas = parseNum(rawResumen.totalMultas, 0);
  const gastosOperativos = parseNum(rawResumen.gastosOperativos, 0);
  const saldoNeto = parseNum(
    rawResumen.saldoNeto ?? rawResumen.saldoNetoDisponible,
    totalArbitraje - pagoArbitros + totalMultas - gastosOperativos
  );

  const resumen = {
    saldoNetoDisponible: saldoNeto,
    saldoNeto,
    totalArbitraje,
    pagoArbitros,
    totalMultas,
    gastosOperativos,
  };

  // Mapear partidos conservando rowIndex y omitiendo filas de encabezados de la hoja
  const rawPartidos = Array.isArray(data.partidos) ? data.partidos : [];
  const partidos = rawPartidos
    .filter((p) => {
      if (!p) return false;
      const ligaStr = String(p.liga || '').trim().toLowerCase();
      const ramaStr = String(p.rama || '').trim().toLowerCase();
      if (ligaStr === 'fecha' && ramaStr === 'liga') return false;
      return true;
    })
    .map((p, idx) => {
      let fecha = String(p.fecha || '').trim();
      let liga = String(p.liga || '').trim();
      let rama = String(p.rama || '').trim();

      // Corregir si la fecha vino en la columna de liga
      if (!fecha && /^\d{4}-\d{2}-\d{2}/.test(liga)) {
        fecha = liga;
        liga = rama || 'UNLA';
        rama = 'Femenil';
      }

      fecha = normalizeDateToIso(fecha);

      const recaudacion = parseNum(p.recaudacion ?? p.totalArbitraje, 0);
      const pagoArbitro = parseNum(p.pagoArbitro, 0);
      const multasPartido = parseNum(p.multasPartido ?? p.multas, 0);
      const saldoNetoPartido = parseNum(
        p.saldoPartido ?? p.saldoNeto,
        recaudacion + multasPartido - pagoArbitro
      );

      return {
        ...p,
        rowIndex: p.rowIndex ?? null,
        id: p.id || `p-${p.rowIndex || idx}-${fecha || idx}`,
        fecha: fecha || 'Sin fecha',
        liga: liga || 'UNLA',
        rama: rama || 'Femenil',
        puntuales: parseNum(p.puntuales, 0),
        retardos: parseNum(p.retardos, 0),
        recaudacion,
        pagoArbitro,
        multasPartido,
        saldoNeto: saldoNetoPartido,
        saldoPartido: saldoNetoPartido,
      };
    });

  // Mapear multas: toda multa registrada está cobrada ($100.00 por defecto) y con fecha ISO
  const rawMultas = Array.isArray(data.multas) ? data.multas : [];
  const multas = rawMultas
    .filter((m) => {
      if (!m) return false;
      const jugador = String(m.jugador || m.nombre || '').trim().toLowerCase();
      if (jugador === 'jugador' || jugador === 'nombre' || jugador === 'fecha') return false;
      return true;
    })
    .map((m, idx) => {
      const fechaIso = normalizeDateToIso(m.fecha) || 'Sin fecha';
      return {
        ...m,
        rowIndex: m.rowIndex ?? null,
        id: m.id || `m-${m.rowIndex || idx}-${fechaIso || idx}`,
        fecha: fechaIso,
        rama: String(m.rama || 'Femenil').trim(),
        dorsal: String(m.dorsal || '--').trim(),
        jugador: String(m.jugador || m.nombre || 'Jugador').trim(),
        motivo: String(m.motivo || 'Sanción').trim(),
        monto: parseNum(m.monto, 100),
        estado: 'Cobrada',
        sede: String(m.sede || '').trim(),
      };
    });

  // Mapear gastos conservando rowIndex y todos los campos reales devueltos por el servidor
  const rawGastos = Array.isArray(data.gastos) ? data.gastos : [];
  const gastos = rawGastos
    .filter((g) => {
      if (!g || typeof g !== 'object') return false;
      const c = String(g.concepto || '').trim().toLowerCase();
      const cat = String(g.categoria || '').trim().toLowerCase();
      if (c === 'concepto' && (cat === 'categoria' || cat === 'concepto')) return false;
      if (c === 'fecha' && (cat === 'concepto' || cat === 'categoria')) return false;
      if (c === 'totales' && !g.monto && !g.fecha) return false;
      if (c.startsWith('📦') && !g.monto && !g.fecha) return false;
      return Boolean(g.concepto || g.monto !== undefined || g.fecha);
    })
    .map((g, idx) => ({
      rowIndex: g.rowIndex ?? null,
      id: g.id || `g-${g.rowIndex ?? idx}-${idx}`,
      fecha: normalizeDateToIso(g.fecha) || (g.fecha ? String(g.fecha).trim() : 'Sin fecha'),
      concepto: String(g.concepto || 'Gasto Operativo').trim(),
      categoria: String(g.categoria || 'Material Deportivo').trim(),
      monto: parseNum(g.monto, 0),
      observaciones: String(g.observaciones || g.notas || '').trim(),
    }));

  const plantilla = normalizeRosterFromApi(data.plantilla);

  return {
    raw: data,
    resumen,
    partidos,
    multas,
    gastos,
    plantilla,
  };
}

export async function postHalconesRecord(payload) {
  const bodyObject = {
    key: API_KEY,
    accion: payload.accion || 'CREAR',
    ...payload,
  };
  const bodyString = JSON.stringify(bodyObject);

  try {
    const response = await fetch(URL_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: bodyString,
    });

    const text = await response.text();
    try {
      return { ok: true, data: JSON.parse(text) };
    } catch {
      return { ok: response.ok, raw: text };
    }
  } catch (err) {
    // Fallback mode no-cors
    await fetch(URL_BASE, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: bodyString,
    });
    return { ok: true, opaque: true };
  }
}
