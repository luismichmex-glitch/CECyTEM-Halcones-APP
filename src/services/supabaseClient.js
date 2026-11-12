import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://xoemclzzwlfvwidvdfnd.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_fWjlHS3TdAfh3x0cY-bCVg_zIhinVOL';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Obtener lista de jugadores desde Supabase
 * @param {string} [rama] - 'Femenil' | 'Varonil' (opcional)
 */
export async function getJugadores(rama) {
  let query = supabase.from('jugadores').select('*');
  if (rama) {
    query = query.ilike('rama', rama);
  }
  const { data, error } = await query.order('dorsal', { ascending: true });
  if (error) throw error;
  return data || [];
}

/**
 * Crear un nuevo jugador en Supabase
 */
export async function createJugador(jugador) {
  const payload = {
    dorsal: String(jugador.dorsal || '').trim(),
    nombre: String(jugador.nombre || '').trim(),
    posicion: String(jugador.posicion || 'Plantilla Oficial').trim(),
    rama: jugador.rama || 'Femenil',
    semestre: String(jugador.semestre || '1').trim(),
    activo: jugador.activo !== undefined ? Boolean(jugador.activo) : true,
    goles: parseInt(jugador.goles || 0, 10),
    asistencias: parseInt(jugador.asistencias || 0, 10),
  };

  const { data, error } = await supabase
    .from('jugadores')
    .insert([payload])
    .select();

  if (error) throw error;
  return data?.[0];
}

/**
 * Actualizar datos de un jugador
 */
export async function updateJugador(id, jugador) {
  const payload = {
    dorsal: String(jugador.dorsal || '').trim(),
    nombre: String(jugador.nombre || '').trim(),
    posicion: String(jugador.posicion || 'Plantilla Oficial').trim(),
    rama: jugador.rama || 'Femenil',
    semestre: String(jugador.semestre || '1').trim(),
    activo: jugador.activo !== undefined ? Boolean(jugador.activo) : true,
    goles: parseInt(jugador.goles || 0, 10),
    asistencias: parseInt(jugador.asistencias || 0, 10),
  };

  const { data, error } = await supabase
    .from('jugadores')
    .update(payload)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data?.[0];
}

/**
 * Eliminar jugador por ID
 */
export async function deleteJugador(id) {
  const { error } = await supabase.from('jugadores').delete().eq('id', id);
  if (error) throw error;
  return true;
}

/**
 * Importar jugadores desde el roster de Google Sheets hacia Supabase sin duplicar.
 * Compara por nombre (normalizado en minúsculas) y rama.
 * @param {Array} roster - Lista de jugadores de Google Sheets
 * @param {string} [ramaFilter] - 'Femenil' o 'Varonil'
 * @returns {Promise<{ importados: number, ignorados: number }>}
 */
export async function importarRosterDesdeGoogleSheets(roster = [], ramaFilter = null) {
  if (!Array.isArray(roster) || roster.length === 0) {
    return { importados: 0, ignorados: 0 };
  }

  // 1. Obtener los jugadores existentes en Supabase
  const existentes = await getJugadores(ramaFilter);
  const existentesSet = new Set(
    existentes.map((j) => `${(j.nombre || '').trim().toLowerCase()}_${(j.rama || '').trim().toLowerCase()}`)
  );

  const nuevos = [];
  let ignorados = 0;

  for (const item of roster) {
    const nombre = (item.nombre || item.jugador || '').trim();
    if (!nombre) continue;

    const rama = item.rama || ramaFilter || 'Femenil';
    const key = `${nombre.toLowerCase()}_${rama.toLowerCase()}`;

    if (existentesSet.has(key)) {
      ignorados++;
      continue;
    }

    // Agregar para insertar
    nuevos.push({
      dorsal: String(item.dorsal || '--').trim(),
      nombre,
      posicion: String(item.posicion || 'Plantilla Oficial').trim(),
      rama,
      semestre: String(item.semestre || '1').trim(),
      activo: true,
      goles: 0,
      asistencias: 0,
    });

    // Registrar en el set para evitar duplicados dentro del mismo lote
    existentesSet.add(key);
  }

  if (nuevos.length > 0) {
    const { error } = await supabase.from('jugadores').insert(nuevos);
    if (error) throw error;
  }

  return { importados: nuevos.length, ignorados };
}

/**
 * Obtener alineaciones tácticas guardadas
 */
export async function getAlineaciones(rama) {
  let query = supabase.from('alineaciones').select('*');
  if (rama) {
    query = query.ilike('rama', rama);
  }
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * Guardar o actualizar alineación en Supabase
 */
export async function saveAlineacion(alineacion) {
  const payload = {
    nombre_estrategia: String(alineacion.nombre_estrategia || alineacion.nombre || 'Estrategia Halcones').trim(),
    rama: alineacion.rama || 'Femenil',
    modalidad: alineacion.modalidad || 'F11',
    formacion: alineacion.formacion || '4-4-2',
    posiciones: Array.isArray(alineacion.posiciones) ? alineacion.posiciones : [],
    notas: String(alineacion.notas || '').trim(),
  };

  if (alineacion.id) {
    const { data, error } = await supabase
      .from('alineaciones')
      .update(payload)
      .eq('id', alineacion.id)
      .select();
    if (error) throw error;
    return data?.[0];
  } else {
    const { data, error } = await supabase
      .from('alineaciones')
      .insert([payload])
      .select();
    if (error) throw error;
    return data?.[0];
  }
}

/**
 * Eliminar alineación por ID
 */
export async function deleteAlineacion(id) {
  const { error } = await supabase.from('alineaciones').delete().eq('id', id);
  if (error) throw error;
  return true;
}

const LOCAL_STORAGE_JUGADAS = 'halcones_jugadas_tacticas_local_v1';

function getLocalJugadas() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_JUGADAS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalJugadas(list) {
  try {
    localStorage.setItem(LOCAL_STORAGE_JUGADAS, JSON.stringify(list));
  } catch {}
}

/**
 * Obtener lista de jugadas tácticas desde Supabase (con respaldo local)
 */
export async function fetchJugadasTacticas(categoria = null, rama = null) {
  try {
    let query = supabase.from('jugadas_tacticas').select('*');
    if (categoria && categoria !== 'Todas') {
      query = query.eq('categoria', categoria);
    }
    if (rama && rama !== 'Todas') {
      query = query.eq('rama', rama);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    if (Array.isArray(data)) {
      saveLocalJugadas(data);
      return data;
    }
  } catch (err) {
    console.warn('fetchJugadasTacticas: error en Supabase, usando respaldo local:', err);
  }
  return getLocalJugadas();
}

/**
 * Crear jugada táctica en Supabase
 */
export async function createJugadaTactica(jugada) {
  const payload = {
    titulo: String(jugada.titulo || 'Nueva Jugada').trim(),
    categoria: String(jugada.categoria || 'Ejercicio').trim(),
    rama: String(jugada.rama || 'General').trim(),
    cancha_tipo: String(jugada.cancha_tipo || 'Completa').trim(),
    frames: Array.isArray(jugada.frames) ? jugada.frames : [],
    notas_entrenador: String(jugada.notas_entrenador || jugada.notas || '').trim(),
  };

  try {
    const { data, error } = await supabase
      .from('jugadas_tacticas')
      .insert([payload])
      .select();

    if (error) throw error;
    if (data?.[0]) {
      const local = getLocalJugadas();
      saveLocalJugadas([data[0], ...local]);
      return data[0];
    }
  } catch (err) {
    console.warn('createJugadaTactica: error en Supabase, guardando localmente:', err);
  }

  // Respaldo local si Supabase no está disponible
  const offlineItem = {
    id: 'local-' + Date.now(),
    ...payload,
    created_at: new Date().toISOString(),
  };
  const local = getLocalJugadas();
  saveLocalJugadas([offlineItem, ...local]);
  return offlineItem;
}

/**
 * Actualizar jugada táctica existente
 */
export async function updateJugadaTactica(id, jugada) {
  const payload = {
    titulo: String(jugada.titulo || 'Jugada').trim(),
    categoria: String(jugada.categoria || 'Ejercicio').trim(),
    rama: String(jugada.rama || 'General').trim(),
    cancha_tipo: String(jugada.cancha_tipo || 'Completa').trim(),
    frames: Array.isArray(jugada.frames) ? jugada.frames : [],
    notas_entrenador: String(jugada.notas_entrenador || jugada.notas || '').trim(),
  };

  try {
    if (!id.startsWith('local-')) {
      const { data, error } = await supabase
        .from('jugadas_tacticas')
        .update(payload)
        .eq('id', id)
        .select();

      if (error) throw error;
      if (data?.[0]) {
        const local = getLocalJugadas().map((item) => (item.id === id ? data[0] : item));
        saveLocalJugadas(local);
        return data[0];
      }
    }
  } catch (err) {
    console.warn('updateJugadaTactica: error en Supabase, actualizando respaldo local:', err);
  }

  // Actualizar en local
  const updatedItem = { id, ...payload, updated_at: new Date().toISOString() };
  const local = getLocalJugadas().map((item) => (item.id === id ? updatedItem : item));
  saveLocalJugadas(local);
  return updatedItem;
}

/**
 * Eliminar jugada táctica por ID
 */
export async function deleteJugadaTactica(id) {
  try {
    if (!id.startsWith('local-')) {
      const { error } = await supabase.from('jugadas_tacticas').delete().eq('id', id);
      if (error) throw error;
    }
  } catch (err) {
    console.warn('deleteJugadaTactica: error en Supabase, borrando local:', err);
  }

  const local = getLocalJugadas().filter((item) => item.id !== id);
  saveLocalJugadas(local);
  return true;
}

