import React, { useState, useEffect, useRef, useCallback } from 'react';
import TopAppBar from '../../components/TopAppBar';
import {
  getJugadores,
  getAlineaciones,
  saveAlineacion,
  deleteAlineacion,
} from '../../services/supabaseClient';
import { RAMAS } from '../plantilla';

const FORMACIONES_F11 = {
  '4-4-2': [
    { rol: 'POR', x: 50, y: 90 },
    { rol: 'LI', x: 15, y: 75 },
    { rol: 'DFC', x: 38, y: 78 },
    { rol: 'DFC', x: 62, y: 78 },
    { rol: 'LD', x: 85, y: 75 },
    { rol: 'MI', x: 15, y: 48 },
    { rol: 'MC', x: 38, y: 52 },
    { rol: 'MC', x: 62, y: 52 },
    { rol: 'MD', x: 85, y: 48 },
    { rol: 'DC', x: 38, y: 22 },
    { rol: 'DC', x: 62, y: 22 },
  ],
  '4-3-3': [
    { rol: 'POR', x: 50, y: 90 },
    { rol: 'LI', x: 15, y: 75 },
    { rol: 'DFC', x: 38, y: 78 },
    { rol: 'DFC', x: 62, y: 78 },
    { rol: 'LD', x: 85, y: 75 },
    { rol: 'MCD', x: 50, y: 60 },
    { rol: 'MC', x: 32, y: 46 },
    { rol: 'MC', x: 68, y: 46 },
    { rol: 'EI', x: 18, y: 22 },
    { rol: 'DC', x: 50, y: 18 },
    { rol: 'ED', x: 82, y: 22 },
  ],
  '3-5-2': [
    { rol: 'POR', x: 50, y: 90 },
    { rol: 'DFC', x: 25, y: 78 },
    { rol: 'DFC', x: 50, y: 80 },
    { rol: 'DFC', x: 75, y: 78 },
    { rol: 'CAI', x: 12, y: 50 },
    { rol: 'MC', x: 35, y: 52 },
    { rol: 'MCD', x: 50, y: 62 },
    { rol: 'MC', x: 65, y: 52 },
    { rol: 'CAD', x: 88, y: 50 },
    { rol: 'DC', x: 38, y: 22 },
    { rol: 'DC', x: 62, y: 22 },
  ],
  '4-2-3-1': [
    { rol: 'POR', x: 50, y: 90 },
    { rol: 'LI', x: 15, y: 75 },
    { rol: 'DFC', x: 38, y: 78 },
    { rol: 'DFC', x: 62, y: 78 },
    { rol: 'LD', x: 85, y: 75 },
    { rol: 'MCD', x: 35, y: 62 },
    { rol: 'MCD', x: 65, y: 62 },
    { rol: 'MI', x: 20, y: 38 },
    { rol: 'MCO', x: 50, y: 36 },
    { rol: 'MD', x: 80, y: 38 },
    { rol: 'DC', x: 50, y: 18 },
  ],
};

const FORMACIONES_F7 = {
  '1-2-3-1': [
    { rol: 'POR', x: 50, y: 90 },
    { rol: 'DFC', x: 32, y: 72 },
    { rol: 'DFC', x: 68, y: 72 },
    { rol: 'MI', x: 18, y: 46 },
    { rol: 'MC', x: 50, y: 48 },
    { rol: 'MD', x: 82, y: 46 },
    { rol: 'DC', x: 50, y: 20 },
  ],
  '1-3-2-1': [
    { rol: 'POR', x: 50, y: 90 },
    { rol: 'LI', x: 20, y: 72 },
    { rol: 'DFC', x: 50, y: 75 },
    { rol: 'LD', x: 80, y: 72 },
    { rol: 'MC', x: 35, y: 46 },
    { rol: 'MC', x: 65, y: 46 },
    { rol: 'DC', x: 50, y: 20 },
  ],
  '1-2-2-2': [
    { rol: 'POR', x: 50, y: 90 },
    { rol: 'DFC', x: 30, y: 75 },
    { rol: 'DFC', x: 70, y: 75 },
    { rol: 'MC', x: 30, y: 48 },
    { rol: 'MC', x: 70, y: 48 },
    { rol: 'DC', x: 35, y: 22 },
    { rol: 'DC', x: 65, y: 22 },
  ],
};

export default function PizarraScreen({
  onRefreshGlobal,
  isSyncingGlobal = false,
  syncStatus = 'online',
}) {
  const [rama, setRama] = useState(RAMAS.FEMENIL);
  const [modalidad, setModalidad] = useState('F11');
  const [formacion, setFormacion] = useState('4-4-2');
  const [nombreEstrategia, setNombreEstrategia] = useState('Alineación Titular');
  const [currentId, setCurrentId] = useState(null);
  const [notas, setNotas] = useState('');

  // Jugadores disponibles en la rama
  const [jugadoresDisponibles, setJugadoresDisponibles] = useState([]);
  const [cargandoJugadores, setCargandoJugadores] = useState(true);

  // Titulares en la cancha: Array de objetos { slotIndex, rol, x, y, jugador: { id, dorsal, nombre } | null }
  const [titulares, setTitulares] = useState([]);

  // Banca: Array de jugadores asignados como suplentes
  const [banca, setBanca] = useState([]);

  // Alineaciones guardadas en Supabase
  const [guardadas, setGuardadas] = useState([]);
  const [modalGuardadas, setModalGuardadas] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Modal para seleccionar jugador para un slot
  const [slotSeleccionado, setSlotSeleccionado] = useState(null);
  const [modalSeleccionJugador, setModalSeleccionJugador] = useState(false);

  // Referencias para Pointer Events en la cancha
  const pitchRef = useRef(null);
  const draggingSlotRef = useRef(null);

  // Feedback Toast
  const [feedback, setFeedback] = useState(null);
  const showFeedback = useCallback((msg, tone = 'cyan') => {
    setFeedback({ msg, tone });
    setTimeout(() => {
      setFeedback((prev) => (prev?.msg === msg ? null : prev));
    }, 3200);
  }, []);

  // Cargar jugadores desde Supabase
  const loadJugadores = useCallback(async () => {
    setCargandoJugadores(true);
    try {
      const data = await getJugadores(rama);
      setJugadoresDisponibles(data);
    } catch (err) {
      console.error('Error cargando jugadores para la pizarra:', err);
      showFeedback('Error al obtener plantilla de Supabase', 'coral');
    } finally {
      setCargandoJugadores(false);
    }
  }, [rama, showFeedback]);

  // Cargar alineaciones guardadas
  const loadGuardadas = useCallback(async () => {
    try {
      const list = await getAlineaciones(rama);
      setGuardadas(list);
    } catch (err) {
      console.error('Error cargando alineaciones guardadas:', err);
    }
  }, [rama]);

  useEffect(() => {
    loadJugadores();
    loadGuardadas();
  }, [loadJugadores, loadGuardadas]);

  // Aplicar formación base a los titulares
  const aplicarFormacion = useCallback(
    (nuevaModalidad, nuevaFormacion, listaJugadores = jugadoresDisponibles) => {
      const presets =
        nuevaModalidad === 'F11' ? FORMACIONES_F11 : FORMACIONES_F7;
      const slotsCoords =
        presets[nuevaFormacion] ||
        (nuevaModalidad === 'F11' ? FORMACIONES_F11['4-4-2'] : FORMACIONES_F7['1-2-3-1']);

      setTitulares((prevTitulares) => {
        return slotsCoords.map((coord, idx) => {
          // Intentar conservar el jugador previo si ya existía en esa posición
          const previo = prevTitulares[idx];
          let jugadorAsignado = previo?.jugador || null;

          // Si no tiene jugador asignado, asignarle uno de la lista si está libre
          if (!jugadorAsignado && listaJugadores[idx]) {
            jugadorAsignado = listaJugadores[idx];
          }

          return {
            slotIndex: idx,
            rol: coord.rol,
            x: coord.x,
            y: coord.y,
            jugador: jugadorAsignado,
          };
        });
      });
    },
    [jugadoresDisponibles]
  );

  // Actualizar titulares cuando cambia modalidad o formación
  useEffect(() => {
    aplicarFormacion(modalidad, formacion, jugadoresDisponibles);
  }, [modalidad, formacion, aplicarFormacion, jugadoresDisponibles]);

  // Calcular la banca: jugadores disponibles que no están en titulares
  useEffect(() => {
    const idsTitulares = new Set(
      titulares.filter((t) => t.jugador?.id).map((t) => t.jugador.id)
    );
    const suplentes = jugadoresDisponibles.filter((j) => !idsTitulares.has(j.id));
    setBanca(suplentes);
  }, [titulares, jugadoresDisponibles]);

  // Pointer Events para arrastrar jugador en la cancha táctica
  const handlePointerDown = (e, slotIndex) => {
    e.stopPropagation();
    e.preventDefault();
    draggingSlotRef.current = slotIndex;
    if (e.currentTarget.setPointerCapture) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e) => {
    if (draggingSlotRef.current === null || !pitchRef.current) return;
    e.preventDefault();

    const rect = pitchRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.round(Math.max(6, Math.min(94, rawX)) * 10) / 10;
    const clampedY = Math.round(Math.max(6, Math.min(94, rawY)) * 10) / 10;

    const targetIdx = draggingSlotRef.current;
    setTitulares((prev) =>
      prev.map((slot) =>
        slot.slotIndex === targetIdx ? { ...slot, x: clampedX, y: clampedY } : slot
      )
    );
  };

  const handlePointerUp = (e) => {
    if (draggingSlotRef.current !== null) {
      if (e.currentTarget.releasePointerCapture && e.pointerId) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
      }
      draggingSlotRef.current = null;
    }
  };

  // Abrir selector de jugador para un slot
  const handleSlotClick = (slot) => {
    setSlotSeleccionado(slot);
    setModalSeleccionJugador(true);
  };

  // Asignar jugador a slot
  const handleAsignarJugador = (jugadorElegido) => {
    if (!slotSeleccionado) return;

    setTitulares((prev) => {
      // Si el jugador elegido ya estaba en otro slot, intercambiar o vaciar el otro
      return prev.map((s) => {
        if (s.slotIndex === slotSeleccionado.slotIndex) {
          return { ...s, jugador: jugadorElegido };
        }
        if (jugadorElegido && s.jugador?.id === jugadorElegido.id) {
          return { ...s, jugador: null };
        }
        return s;
      });
    });

    setModalSeleccionJugador(false);
    setSlotSeleccionado(null);
  };

  // Desasignar jugador de slot
  const handleQuitarJugador = (slotIndex) => {
    setTitulares((prev) =>
      prev.map((s) => (s.slotIndex === slotIndex ? { ...s, jugador: null } : s))
    );
    setModalSeleccionJugador(false);
    setSlotSeleccionado(null);
  };

  // Guardar alineación en Supabase
  const handleGuardarAlineacion = async () => {
    if (!nombreEstrategia.trim()) {
      showFeedback('Escribe un nombre para la estrategia táctica', 'coral');
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        id: currentId || undefined,
        nombre_estrategia: nombreEstrategia.trim(),
        rama,
        modalidad,
        formacion,
        notas,
        posiciones: titulares.map((t) => ({
          slotIndex: t.slotIndex,
          rol: t.rol,
          x: t.x,
          y: t.y,
          jugador_id: t.jugador?.id || null,
          dorsal: t.jugador?.dorsal || '--',
          nombre: t.jugador?.nombre || 'Sin asignar',
          posicion: t.jugador?.posicion || t.rol,
        })),
      };

      const res = await saveAlineacion(payload);
      setCurrentId(res.id);
      showFeedback('¡Alineación guardada con éxito en Supabase!', 'emerald');
      await loadGuardadas();
    } catch (err) {
      console.error('Error guardando alineación:', err);
      showFeedback('Error al guardar alineación en Supabase', 'coral');
    } finally {
      setGuardando(false);
    }
  };

  // Cargar una alineación guardada
  const handleCargarGuardada = (item) => {
    setCurrentId(item.id);
    setNombreEstrategia(item.nombre_estrategia || 'Estrategia');
    setRama(item.rama || RAMAS.FEMENIL);
    setModalidad(item.modalidad || 'F11');
    setFormacion(item.formacion || '4-4-2');
    setNotas(item.notas || '');

    // Reconstruir titulares con sus jugadores asociados
    if (Array.isArray(item.posiciones) && item.posiciones.length > 0) {
      const reconstructed = item.posiciones.map((pos, idx) => {
        // Encontrar en la lista de jugadores disponibles si está el id
        const jugadorObj =
          jugadoresDisponibles.find((j) => j.id === pos.jugador_id) ||
          (pos.nombre && pos.nombre !== 'Sin asignar'
            ? {
                id: pos.jugador_id || `temp-${idx}`,
                dorsal: pos.dorsal || '--',
                nombre: pos.nombre,
                posicion: pos.posicion,
              }
            : null);

        return {
          slotIndex: pos.slotIndex ?? idx,
          rol: pos.rol || 'JUG',
          x: pos.x,
          y: pos.y,
          jugador: jugadorObj,
        };
      });
      setTitulares(reconstructed);
    }

    setModalGuardadas(false);
    showFeedback(`Estrategia "${item.nombre_estrategia}" cargada`, 'cyan');
  };

  // Eliminar alineación guardada
  const handleBorrarAlineacion = async (id, e) => {
    e.stopPropagation();
    const conf = window.confirm('¿Deseas eliminar esta alineación táctica?');
    if (!conf) return;

    try {
      await deleteAlineacion(id);
      if (currentId === id) {
        setCurrentId(null);
      }
      showFeedback('Alineación eliminada', 'emerald');
      await loadGuardadas();
    } catch (err) {
      showFeedback('Error al eliminar alineación', 'coral');
    }
  };

  // Reiniciar a nueva pizarra en blanco
  const handleNuevaPizarra = () => {
    setCurrentId(null);
    setNombreEstrategia(`Halcones ${modalidad} ${formacion}`);
    setNotas('');
    aplicarFormacion(modalidad, formacion, jugadoresDisponibles);
    showFeedback('Pizarra restablecida a preset', 'cyan');
  };

  return (
    <div className="min-h-screen bg-background text-on-surface pb-28">
      <TopAppBar
        subtitle={`Pizarra Táctica • ${rama} (${modalidad})`}
        onRefresh={() => {
          loadJugadores();
          loadGuardadas();
          if (onRefreshGlobal) onRefreshGlobal();
        }}
        isSyncing={cargandoJugadores || guardando || isSyncingGlobal}
        syncStatus={syncStatus}
      />

      {feedback && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full tactical-glass border border-primary-container/50 shadow-xl flex items-center gap-2 max-w-[90vw] animate-in fade-in duration-200">
          <span
            className={`w-2 h-2 rounded-full ${
              feedback.tone === 'coral'
                ? 'bg-secondary'
                : feedback.tone === 'emerald'
                ? 'bg-tertiary'
                : 'bg-primary'
            }`}
          />
          <span className="font-label-md text-label-md text-on-surface whitespace-nowrap">
            {feedback.msg}
          </span>
        </div>
      )}

      <main className="w-full max-w-4xl mx-auto px-margin-mobile pt-4 space-y-4">
        {/* Controles de Configuración Táctica */}
        <div className="p-3.5 rounded-2xl tactical-glass border border-outline-variant/30 space-y-3">
          {/* Fila 1: Rama + Modalidad */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex bg-surface-container rounded-xl p-1 border border-outline-variant/30">
              <button
                type="button"
                onClick={() => setRama(RAMAS.FEMENIL)}
                className={`flex-1 py-1.5 rounded-lg font-label-sm text-label-sm font-bold transition-all ${
                  rama === RAMAS.FEMENIL
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant'
                }`}
              >
                Femenil
              </button>
              <button
                type="button"
                onClick={() => setRama(RAMAS.VARONIL)}
                className={`flex-1 py-1.5 rounded-lg font-label-sm text-label-sm font-bold transition-all ${
                  rama === RAMAS.VARONIL
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant'
                }`}
              >
                Varonil
              </button>
            </div>

            <div className="flex bg-surface-container rounded-xl p-1 border border-outline-variant/30">
              <button
                type="button"
                onClick={() => {
                  setModalidad('F11');
                  setFormacion('4-4-2');
                }}
                className={`flex-1 py-1.5 rounded-lg font-label-sm text-label-sm font-bold transition-all ${
                  modalidad === 'F11'
                    ? 'bg-tertiary text-on-tertiary shadow-sm'
                    : 'text-on-surface-variant'
                }`}
              >
                Fútbol 11
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalidad('F7');
                  setFormacion('1-2-3-1');
                }}
                className={`flex-1 py-1.5 rounded-lg font-label-sm text-label-sm font-bold transition-all ${
                  modalidad === 'F7'
                    ? 'bg-tertiary text-on-tertiary shadow-sm'
                    : 'text-on-surface-variant'
                }`}
              >
                Fútbol 7
              </button>
            </div>
          </div>

          {/* Fila 2: Nombre de Estrategia + Selector de Formación */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
            <div className="sm:col-span-2 relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary text-[18px]">
                edit_note
              </span>
              <input
                type="text"
                value={nombreEstrategia}
                onChange={(e) => setNombreEstrategia(e.target.value)}
                placeholder="Nombre de Estrategia (Ej. vs UNLA J1)"
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface font-title-sm text-title-sm font-bold focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <select
                value={formacion}
                onChange={(e) => setFormacion(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface font-label-md text-label-md font-bold focus:outline-none focus:border-primary"
              >
                {modalidad === 'F11' ? (
                  <>
                    <option value="4-4-2">Formación 4-4-2</option>
                    <option value="4-3-3">Formación 4-3-3</option>
                    <option value="3-5-2">Formación 3-5-2</option>
                    <option value="4-2-3-1">Formación 4-2-3-1</option>
                  </>
                ) : (
                  <>
                    <option value="1-2-3-1">Formación 1-2-3-1</option>
                    <option value="1-3-2-1">Formación 1-3-2-1</option>
                    <option value="1-2-2-2">Formación 1-2-2-2</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Botones de Acción: Guardar, Cargar y Nueva */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-outline-variant/20">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGuardarAlineacion}
                disabled={guardando}
                className="h-9 px-3.5 rounded-xl bg-primary text-on-primary font-label-sm text-label-sm font-bold flex items-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {guardando ? 'sync' : 'save'}
                </span>
                {currentId ? 'Actualizar en Supabase' : 'Guardar Estrategia'}
              </button>

              <button
                type="button"
                onClick={() => setModalGuardadas(true)}
                className="h-9 px-3 rounded-xl bg-surface-container-high border border-outline-variant/40 text-on-surface font-label-sm text-label-sm font-semibold flex items-center gap-1.5 hover:bg-surface-container-highest transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-tertiary">
                  folder_open
                </span>
                Cargar ({guardadas.length})
              </button>
            </div>

            <button
              type="button"
              onClick={handleNuevaPizarra}
              className="h-9 px-3 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              Reiniciar formación
            </button>
          </div>
        </div>

        {/* Cancha Táctica Interactiva */}
        <div className="w-full flex flex-col items-center">
          <div
            ref={pitchRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative w-full aspect-[2/3] max-h-[640px] rounded-3xl overflow-hidden shadow-2xl select-none touch-none border-2 border-[#1e5837] bg-[#0c2a1a]"
            style={{ touchAction: 'none' }}
          >
            {/* Patrón de césped a rayas */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#113a24] via-[#0d2f1d] to-[#0a2617] opacity-95 pointer-events-none" />
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(to bottom, transparent, transparent 40px, rgba(255,255,255,0.06) 40px, rgba(255,255,255,0.06) 80px)',
              }}
            />

            {/* Marcado reglamentario SVG de cancha */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none stroke-white/40"
              strokeWidth="2"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 100 150"
            >
              {/* Línea perimetral */}
              <rect x="5" y="5" width="90" height="140" rx="2" />
              {/* Línea de medio campo */}
              <line x1="5" y1="75" x2="95" y2="75" />
              {/* Círculo central */}
              <circle cx="50" cy="75" r="14" />
              <circle cx="50" cy="75" r="1" fill="rgba(255,255,255,0.6)" />

              {/* Área grande rival (Arriba) */}
              <rect x="22" y="5" width="56" height="24" />
              {/* Área chica rival */}
              <rect x="34" y="5" width="32" height="9" />
              {/* Punto penal rival */}
              <circle cx="50" cy="18" r="1" fill="rgba(255,255,255,0.6)" />
              {/* Semicírculo rival */}
              <path d="M 38 29 A 12 12 0 0 0 62 29" />
              {/* Portería rival */}
              <rect x="38" y="2" width="24" height="3" stroke="#4dd8e8" fill="rgba(77,216,232,0.2)" />

              {/* Área grande Halcones (Abajo) */}
              <rect x="22" y="121" width="56" height="24" />
              {/* Área chica Halcones */}
              <rect x="34" y="136" width="32" height="9" />
              {/* Punto penal Halcones */}
              <circle cx="50" cy="132" r="1" fill="rgba(255,255,255,0.6)" />
              {/* Semicírculo Halcones */}
              <path d="M 38 121 A 12 12 0 0 1 62 121" />
              {/* Portería Halcones */}
              <rect x="38" y="145" width="24" height="3" stroke="#4dd8e8" fill="rgba(77,216,232,0.2)" />

              {/* Tiros de esquina */}
              <path d="M 5 9 A 4 4 0 0 0 9 5" />
              <path d="M 91 5 A 4 4 0 0 0 95 9" />
              <path d="M 5 141 A 4 4 0 0 1 9 145" />
              <path d="M 91 145 A 4 4 0 0 1 95 141" />
            </svg>

            {/* Tokens interactivos de Titulares */}
            {titulares.map((slot) => {
              const jugador = slot.jugador;
              const dorsal = jugador?.dorsal || '--';
              const primerNombre = jugador?.nombre ? jugador.nombre.split(' ')[0] : slot.rol;

              return (
                <div
                  key={slot.slotIndex}
                  onPointerDown={(e) => handlePointerDown(e, slot.slotIndex)}
                  onClick={() => handleSlotClick(slot)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing flex flex-col items-center transition-[transform] duration-75 group"
                  style={{
                    left: `${slot.x}%`,
                    top: `${slot.y}%`,
                    touchAction: 'none',
                  }}
                >
                  {/* Ficha circular */}
                  <div
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 active:scale-125 ${
                      jugador
                        ? slot.rol === 'POR'
                          ? 'bg-amber-500 border-amber-300 text-black font-extrabold'
                          : 'bg-primary border-white text-on-primary font-extrabold'
                        : 'bg-surface-container-high/90 border-dashed border-outline-variant text-on-surface-variant'
                    }`}
                  >
                    <span className="text-xs font-mono font-bold leading-none">
                      {dorsal}
                    </span>
                  </div>

                  {/* Etiqueta flotante con nombre y rol */}
                  <div className="mt-1 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm border border-white/20 text-[10px] font-semibold text-white tracking-wide max-w-[80px] truncate shadow text-center">
                    {primerNombre}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="font-label-sm text-label-sm text-on-surface-variant mt-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">touch_app</span>
            Arrastra cualquier jugador para moverlo en la cancha. Haz clic para cambiarlo.
          </p>
        </div>

        {/* Panel de Banca / Suplentes */}
        <div className="p-4 rounded-2xl tactical-glass border border-outline-variant/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">
                airline_seat_recline_normal
              </span>
              <h3 className="font-title-sm text-title-sm font-bold text-on-surface">
                Banca y Suplentes ({banca.length})
              </h3>
            </div>
            <span className="text-xs text-on-surface-variant">
              Rama {rama}
            </span>
          </div>

          {banca.length === 0 ? (
            <p className="text-xs text-on-surface-variant italic py-2">
              No hay suplentes en la banca. Todos los jugadores disponibles están asignados como titulares.
            </p>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {banca.map((jugador) => (
                <button
                  key={jugador.id}
                  type="button"
                  onClick={() => {
                    // Si hay un slot vacío, meterlo allí
                    const slotVacio = titulares.find((t) => !t.jugador);
                    if (slotVacio) {
                      setSlotSeleccionado(slotVacio);
                      handleAsignarJugador(jugador);
                      showFeedback(`Asignado #${jugador.dorsal} ${jugador.nombre.split(' ')[0]} como titular`, 'emerald');
                    } else {
                      // Abrir modal de selección con este jugador sugerido
                      setSlotSeleccionado(titulares[0]);
                      setModalSeleccionJugador(true);
                    }
                  }}
                  className="shrink-0 p-2 rounded-xl bg-surface-container border border-outline-variant/30 hover:border-primary/50 transition-colors flex items-center gap-2 text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/50 flex items-center justify-center font-mono font-bold text-xs text-primary">
                    {jugador.dorsal || '--'}
                  </div>
                  <div className="min-w-0 pr-1">
                    <p className="text-xs font-bold text-on-surface truncate max-w-[100px]">
                      {jugador.nombre}
                    </p>
                    <p className="text-[10px] text-on-surface-variant truncate">
                      {jugador.posicion || 'Suplente'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notas y Plan de Juego */}
        <div className="p-4 rounded-2xl tactical-glass border border-outline-variant/30 space-y-2">
          <label className="block font-title-sm text-title-sm font-bold text-on-surface">
            Instrucciones Tácticas y Balón Parado
          </label>
          <textarea
            rows="3"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej. Cobrador de penales: #10 Valeria. Saques de esquina a primer poste. Presión alta en salida rival..."
            className="w-full p-3 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface font-body-sm focus:outline-none focus:border-primary resize-none"
          />
        </div>
      </main>

      {/* Modal para asignar o cambiar jugador de un Slot */}
      {modalSeleccionJugador && slotSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-high border border-outline-variant/50 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div>
                <h3 className="font-title-md text-title-md font-bold text-on-surface">
                  Asignar a posición: {slotSeleccionado.rol}
                </h3>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  Titular actual:{' '}
                  {slotSeleccionado.jugador
                    ? `#${slotSeleccionado.jugador.dorsal} ${slotSeleccionado.jugador.nombre}`
                    : 'Vacío (Sin asignar)'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalSeleccionJugador(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {slotSeleccionado.jugador && (
              <button
                type="button"
                onClick={() => handleQuitarJugador(slotSeleccionado.slotIndex)}
                className="w-full py-2 rounded-xl bg-secondary-container/50 text-secondary border border-secondary/30 font-label-md text-label-md font-bold flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">person_remove</span>
                Quitar jugador de la cancha (Dejar libre)
              </button>
            )}

            <div className="space-y-1.5">
              <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                Seleccionar jugador disponible:
              </span>
              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {jugadoresDisponibles.map((j) => {
                  const yaEstaEnSlot = titulares.find(
                    (t) => t.jugador?.id === j.id
                  );
                  return (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => handleAsignarJugador(j)}
                      className="w-full p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-highest transition-colors flex items-center justify-between gap-2 text-left border border-outline-variant/30"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-mono font-bold text-primary text-xs shrink-0">
                          {j.dorsal || '--'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-body-sm text-body-sm font-bold text-on-surface truncate">
                            {j.nombre}
                          </p>
                          <p className="text-[11px] text-on-surface-variant truncate">
                            {j.posicion} • {j.semestre}
                          </p>
                        </div>
                      </div>

                      {yaEstaEnSlot && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container-highest text-primary-fixed border border-primary/20 shrink-0">
                          En {yaEstaEnSlot.rol}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Estrategias Guardadas */}
      {modalGuardadas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-high border border-outline-variant/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">
                  folder_open
                </span>
                <h3 className="font-title-md text-title-md font-bold text-on-surface">
                  Estrategias Guardadas (Supabase)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalGuardadas(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {guardadas.length === 0 ? (
              <div className="py-8 text-center text-on-surface-variant text-sm">
                No hay alineaciones guardadas aún para la rama {rama}. Crea una y pulsa "Guardar Estrategia".
              </div>
            ) : (
              <div className="space-y-2">
                {guardadas.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleCargarGuardada(item)}
                    className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/40 hover:border-primary/50 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div>
                      <h4 className="font-title-sm text-title-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                        {item.nombre_estrategia}
                      </h4>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {item.rama} • {item.modalidad} • Formación {item.formacion}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleBorrarAlineacion(item.id, e)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-secondary transition-colors"
                        title="Eliminar de Supabase"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
