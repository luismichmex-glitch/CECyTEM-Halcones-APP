import React, { useState, useEffect, useMemo } from 'react';
import TopAppBar from '../components/TopAppBar';
import { normalizeDateToIso } from '../services/googleSheets';
import { getJugadores } from '../services/supabaseClient';

const MOTIVOS = [
  {
    id: 'Inasistencia',
    title: 'Inasistencia',
    subtitle: 'A partido de liga',
    icon: 'event_busy',
  },
  {
    id: 'Retardo grave',
    title: 'Retardo grave',
    subtitle: '> 20 min charla',
    icon: 'timer_off',
  },
  {
    id: 'Tarjeta / Indisc.',
    title: 'Tarjeta / Indisc.',
    subtitle: 'Amarilla / Roja direct',
    icon: 'style',
  },
  {
    id: 'Otro motivo',
    title: 'Otro motivo',
    subtitle: 'Equipamiento / Conducta',
    icon: 'edit_note',
  },
];

function formatSpanishDate(isoDate) {
  if (!isoDate) return 'Fecha seleccionada';
  try {
    const [y, m, d] = isoDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

export default function MultasScreen({
  plantilla = { Femenil: [], Varonil: [] },
  multas = [],
  totalMultas = 0,
  onSaveMulta,
  onRefresh,
  isSyncing,
  syncStatus,
  editingItem,
  onCancelEdit,
  onEditItem,
  onDeleteItem,
}) {
  const todayIso = new Date().toISOString().split('T')[0];
  const [fecha, setFecha] = useState(todayIso);
  const [rama, setRama] = useState('Femenil');

  // Jugadores desde Supabase con fallback a Google Sheets
  const [supabaseJugadores, setSupabaseJugadores] = useState({
    Femenil: [],
    Varonil: [],
  });

  useEffect(() => {
    let isMounted = true;
    async function fetchPlayers() {
      try {
        const [fem, varo] = await Promise.all([
          getJugadores('Femenil'),
          getJugadores('Varonil'),
        ]);
        if (isMounted) {
          setSupabaseJugadores({
            Femenil: fem || [],
            Varonil: varo || [],
          });
        }
      } catch (err) {
        console.warn('MultasScreen: usando fallback de Google Sheets para plantilla:', err);
      }
    }
    fetchPlayers();
    return () => {
      isMounted = false;
    };
  }, []);

  const getRosterForRama = useMemo(
    () => (targetRama) => {
      const sbList =
        targetRama === 'Femenil'
          ? supabaseJugadores.Femenil
          : supabaseJugadores.Varonil;
      if (sbList && sbList.length > 0) return sbList;
      return (targetRama === 'Femenil' ? plantilla?.Femenil : plantilla?.Varonil) || [];
    },
    [supabaseJugadores, plantilla]
  );

  const currentRoster = getRosterForRama(rama);

  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState(0);
  const [motivo, setMotivo] = useState('Inasistencia');
  const [customMotivo, setCustomMotivo] = useState('');
  const [monto, setMonto] = useState('100.00');
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setSelectedPlayerIndex(0);
  }, [rama]);

  // Cargar elemento en edición si proviene de props
  useEffect(() => {
    if (editingItem) {
      setEditingRowIndex(editingItem.rowIndex ?? null);
      const itemRama = editingItem.rama || 'Femenil';
      setRama(itemRama);

      const normDate = normalizeDateToIso(editingItem.fecha) || todayIso;
      setFecha(normDate);

      const roster = getRosterForRama(itemRama);
      const pIdx = roster.findIndex(
        (p) =>
          String(p.dorsal) === String(editingItem.dorsal) ||
          p.nombre.toLowerCase().includes(String(editingItem.jugador || '').toLowerCase())
      );
      if (pIdx >= 0) {
        setSelectedPlayerIndex(pIdx);
      }

      const mot = editingItem.motivo || 'Inasistencia';
      const existsMotivo = MOTIVOS.some((m) => m.id === mot);
      if (existsMotivo) {
        setMotivo(mot);
        setCustomMotivo('');
      } else {
        setMotivo('Otro motivo');
        setCustomMotivo(mot);
      }

      setMonto(String(editingItem.monto ?? '100.00'));
    } else {
      setEditingRowIndex(null);
    }
  }, [editingItem, plantilla, todayIso]);

  const handleCancelLocalEdit = () => {
    setEditingRowIndex(null);
    setFecha(todayIso);
    setMotivo('Inasistencia');
    setCustomMotivo('');
    setMonto('100.00');
    if (onCancelEdit) onCancelEdit();
  };

  const handleStartLocalEdit = (m) => {
    if (onEditItem) {
      onEditItem(m);
    } else {
      setEditingRowIndex(m.rowIndex ?? null);
      const itemRama = m.rama || 'Femenil';
      setRama(itemRama);
      setFecha(normalizeDateToIso(m.fecha) || todayIso);
      const roster = getRosterForRama(itemRama);
      const pIdx = roster.findIndex(
        (p) =>
          String(p.dorsal) === String(m.dorsal) ||
          p.nombre.toLowerCase().includes(String(m.jugador || '').toLowerCase())
      );
      if (pIdx >= 0) setSelectedPlayerIndex(pIdx);

      const mot = m.motivo || 'Inasistencia';
      if (MOTIVOS.some((item) => item.id === mot)) {
        setMotivo(mot);
        setCustomMotivo('');
      } else {
        setMotivo('Otro motivo');
        setCustomMotivo(mot);
      }
      setMonto(String(m.monto ?? '100.00'));
    }
  };

  const selectedPlayer = currentRoster[selectedPlayerIndex] || {
    dorsal: '--',
    nombre: currentRoster.length > 0 ? currentRoster[0].nombre : 'Sin jugadores',
    posicion: 'Plantilla Oficial',
    rama,
  };

  const multasFemenilCount = multas.filter((m) => m.rama === 'Femenil').length;
  const multasVaronilCount = multas.filter((m) => m.rama === 'Varonil').length;

  const totalCobrado = multas.reduce((acc, m) => acc + (Number(m.monto) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSavedSuccess(false);

    const montoNum = parseFloat(monto) || 100;
    const finalMotivo =
      motivo === 'Otro motivo' && customMotivo.trim()
        ? customMotivo.trim()
        : motivo;

    const isEdit = editingRowIndex != null;
    const dateFormatted = normalizeDateToIso(fecha) || todayIso;

    const payload = {
      tipo: 'MULTA',
      accion: isEdit ? 'EDITAR' : 'CREAR',
      ...(isEdit ? { rowIndex: editingRowIndex } : {}),
      fecha: dateFormatted, // YYYY-MM-DD para vincular al SUMIFS de partidos
      rama,
      dorsal: selectedPlayer.dorsal,
      jugador: `#${selectedPlayer.dorsal} ${selectedPlayer.nombre}`,
      nombre: selectedPlayer.nombre,
      motivo: finalMotivo,
      monto: montoNum,
      estado: 'Cobrada',
      pagado: true,
    };

    try {
      await onSaveMulta(payload);
      setSavedSuccess(true);
      if (isEdit) {
        handleCancelLocalEdit();
      } else {
        setCustomMotivo('');
      }
      setTimeout(() => setSavedSuccess(false), 2600);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-28">
      <TopAppBar
        subtitle="D.T. Luis Manuel Martínez • CECYTEM 33"
        onRefresh={onRefresh}
        isSyncing={isSyncing}
        syncStatus={syncStatus}
      />

      <main className="w-full max-w-md mx-auto px-margin-mobile pt-space-md flex flex-col gap-space-md">
        {/* Screen Mission Header & Recaudación Pill */}
        <div className="tactical-glass rounded-xl p-space-md flex flex-col gap-space-sm relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full bg-secondary-container/20 blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="material-symbols-outlined text-secondary text-sm material-symbols-fill">
                  warning
                </span>
                <span className="text-label-sm font-label-sm text-secondary uppercase tracking-wider font-semibold">
                  Temporada 2026-2027
                </span>
              </div>
              <h1 className="text-headline-md font-headline-md text-on-surface font-bold leading-tight">
                Sanciones y Multas
              </h1>
              <p className="text-body-sm font-body-sm text-on-surface-variant">
                Control Disciplinario • Suma Directa a Caja
              </p>
            </div>
            {/* Recaudado Badge */}
            <div className="flex flex-col items-end">
              <span className="text-label-sm font-label-sm text-on-surface-variant">
                Cobradas
              </span>
              <div className="mt-0.5 px-2.5 py-1 rounded-full bg-surface-container-high border border-tertiary-container/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse" />
                <span className="text-label-lg font-label-lg text-tertiary-container font-bold">
                  ${(Number(totalMultas) || totalCobrado).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Filtro Rama (Femenil / Varonil) */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2.5 border-t border-outline-variant/30">
            <button
              type="button"
              onClick={() => setRama('Femenil')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg font-headline-sm text-xs transition-all cursor-pointer ${
                rama === 'Femenil'
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-md'
                  : 'bg-surface-container-low text-on-surface-variant border border-outline-variant/40 hover:text-on-surface font-medium'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">
                  sports_soccer
                </span>
                <span>Rama Femenil</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded-full text-label-sm font-bold ${
                  rama === 'Femenil'
                    ? 'bg-surface-dim/30 text-on-primary-container'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {multasFemenilCount} reg.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRama('Varonil')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg font-headline-sm text-xs transition-all cursor-pointer ${
                rama === 'Varonil'
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-md'
                  : 'bg-surface-container-low text-on-surface-variant border border-outline-variant/40 hover:text-on-surface font-medium'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">shield</span>
                <span>Rama Varonil</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded-full text-label-sm font-bold ${
                  rama === 'Varonil'
                    ? 'bg-surface-dim/30 text-on-primary-container'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {multasVaronilCount} reg.
              </span>
            </button>
          </div>
        </div>

        {/* Banner de Modo Edición */}
        {editingRowIndex != null && (
          <div className="tactical-glass rounded-xl p-3 bg-secondary-container/30 border border-secondary flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">
                edit
              </span>
              <div>
                <span className="text-body-md font-body-md text-secondary font-bold block">
                  Modo Edición de Sanción
                </span>
                <span className="text-label-sm font-label-sm text-on-surface-variant">
                  Fila en Google Sheets: #{editingRowIndex}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancelLocalEdit}
              className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface text-label-md font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
              Cancelar
            </button>
          </div>
        )}

        {/* Formulario de Sanción Rápida */}
        <form
          onSubmit={handleSubmit}
          className="tactical-glass rounded-xl p-space-md flex flex-col gap-4 border border-outline-variant/40"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary material-symbols-fill">
                add_moderator
              </span>
              <h2 className="text-headline-sm font-headline-sm text-on-surface font-bold">
                {editingRowIndex != null ? 'Editar Sanción' : 'Nueva Sanción Cobrada'}
              </h2>
            </div>
            <span className="text-label-sm font-label-sm px-2 py-0.5 rounded bg-tertiary/20 text-tertiary border border-tertiary/40 font-bold">
              Cobro Automático
            </span>
          </div>

          {/* 1. Selector de Fecha (Formato YYYY-MM-DD para vincular con SUMIFS de partidos) */}
          <div className="tactical-glass rounded-xl p-3.5 flex items-center justify-between shadow-sm relative border border-outline-variant/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary border border-secondary/30 shrink-0">
                <span className="material-symbols-outlined text-[22px]">
                  calendar_today
                </span>
              </div>
              <div>
                <label
                  className="block text-label-sm font-label-sm text-on-surface-variant"
                  htmlFor="fineDate"
                >
                  FECHA DE APLICACIÓN (YYYY-MM-DD)
                </label>
                <span className="text-body-lg font-body-lg text-on-surface font-semibold capitalize">
                  {formatSpanishDate(fecha)}
                </span>
              </div>
            </div>
            <input
              id="fineDate"
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="bg-surface-container-high text-on-surface text-xs rounded-lg px-2.5 py-1.5 border border-secondary/40 focus:outline-none focus:border-secondary"
            />
          </div>

          {/* 2. Selector de Jugador */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="playerSelect"
              className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider flex items-center justify-between"
            >
              <span>Jugador / Dorsal de Plantilla ({rama})</span>
              <span className="text-primary text-[10px] lowercase font-normal flex items-center gap-0.5">
                <span className="material-symbols-outlined text-xs">verified</span>{' '}
                Lista Oficial ({currentRoster.length})
              </span>
            </label>

            {currentRoster.length === 0 ? (
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-body-sm text-on-surface-variant">
                Sin jugadores registrados en {rama}
              </div>
            ) : (
              <>
                <div className="relative bg-surface-container-low rounded-xl border border-primary/40 p-2.5 flex items-center justify-between focus-within:ring-2 focus-within:ring-primary/40">
                  <div className="flex items-center gap-2.5 pointer-events-none">
                    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center text-primary font-numeric-stat text-sm font-bold">
                      {selectedPlayer.dorsal}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-body-md font-body-md text-on-surface font-bold leading-tight">
                        {selectedPlayer.nombre}
                      </span>
                      <span className="text-body-sm font-body-sm text-primary-fixed-dim text-xs">
                        {selectedPlayer.posicion} • {rama}
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-primary pointer-events-none">
                    arrow_drop_down
                  </span>

                  <select
                    id="playerSelect"
                    value={selectedPlayerIndex}
                    onChange={(e) => setSelectedPlayerIndex(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  >
                    {currentRoster.map((player, idx) => (
                      <option
                        key={player.id || idx}
                        value={idx}
                        className="bg-surface text-on-surface"
                      >
                        #{player.dorsal} - {player.nombre} ({player.posicion})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chips de selección rápida */}
                <div className="flex gap-2 overflow-x-auto py-1 text-xs">
                  {currentRoster.slice(0, 4).map((player, idx) => (
                    <button
                      key={player.id || idx}
                      type="button"
                      onClick={() => setSelectedPlayerIndex(idx)}
                      className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-label-sm border flex items-center gap-1 transition-colors cursor-pointer ${
                        selectedPlayerIndex === idx
                          ? 'bg-primary-container/20 text-primary border-primary/50'
                          : 'bg-surface-container text-on-surface-variant hover:text-on-surface border-outline-variant/30'
                      }`}
                    >
                      <span className="font-bold text-on-surface">#{player.dorsal}</span>{' '}
                      {player.nombre.split(' ').slice(0, 2).join(' ')}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 3. Selector de Motivo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">
              Motivo de la Sanción
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MOTIVOS.map((item) => {
                const active = motivo === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMotivo(item.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs text-left transition-all cursor-pointer ${
                      active
                        ? 'bg-secondary-container/40 border border-secondary text-secondary font-medium shadow-sm'
                        : 'bg-surface-container-low border border-outline-variant/30 text-on-surface-variant hover:border-outline'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-lg ${
                        active ? 'text-secondary material-symbols-fill' : ''
                      }`}
                    >
                      {item.icon}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-bold text-on-surface">{item.title}</span>
                      <span
                        className={`text-[10px] ${
                          active ? 'text-secondary' : 'text-on-surface-variant'
                        }`}
                      >
                        {item.subtitle}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            {motivo === 'Otro motivo' && (
              <input
                type="text"
                placeholder="Especifica el motivo de la sanción..."
                value={customMotivo}
                onChange={(e) => setCustomMotivo(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl bg-surface-container-low border border-secondary/40 text-on-surface text-body-sm focus:outline-none focus:border-secondary"
              />
            )}
          </div>

          {/* 4. Monto de la Multa */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="fineAmount"
              className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider flex justify-between"
            >
              <span>Monto Cobrado</span>
              <span className="text-tertiary font-bold">Tarifa Reglamentaria ($100)</span>
            </label>
            <div className="p-3 rounded-xl bg-surface-container-low border border-tertiary/40 flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-tertiary font-display-hero text-xl font-bold">
                  $
                </span>
                <input
                  id="fineAmount"
                  type="number"
                  step="10"
                  min="0"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="bg-transparent text-tertiary font-numeric-stat text-2xl font-bold border-none p-0 w-28 focus:ring-0 focus:outline-none"
                />
                <span className="text-label-sm font-label-sm text-on-surface-variant">
                  MXN
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setMonto(((parseFloat(monto) || 0) + 50).toFixed(2))
                  }
                  className="px-2 py-1 rounded bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant/40 text-label-sm font-bold active:scale-95 cursor-pointer"
                >
                  +$50
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMonto(((parseFloat(monto) || 0) + 100).toFixed(2))
                  }
                  className="px-2 py-1 rounded bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant/40 text-label-sm font-bold active:scale-95 cursor-pointer"
                >
                  +$100
                </button>
              </div>
            </div>
          </div>

          {/* 5. Botones de Acción */}
          <div className="space-y-2 mt-1">
            <button
              type="submit"
              disabled={saving}
              className={`w-full py-3.5 px-4 rounded-xl active:scale-[0.98] transition-all font-headline-sm text-sm font-bold flex items-center justify-center gap-2 coral-glow-btn cursor-pointer ${
                savedSuccess
                  ? 'bg-tertiary-container text-on-tertiary-container'
                  : 'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/90'
              }`}
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined text-xl animate-spin">
                    progress_activity
                  </span>
                  <span>Guardando en Google Sheets...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <span className="material-symbols-outlined text-xl">task_alt</span>
                  <span>
                    {editingRowIndex != null
                      ? '¡Multa Actualizada!'
                      : '¡Multa Cobrada con Éxito!'}
                  </span>
                </>
              ) : editingRowIndex != null ? (
                <>
                  <span className="material-symbols-outlined text-xl">edit</span>
                  <span>Actualizar Sanción (Fila #{editingRowIndex})</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl material-symbols-fill">
                    gavel
                  </span>
                  <span>Registrar Multa Cobrada</span>
                </>
              )}
            </button>

            {editingRowIndex != null && (
              <button
                type="button"
                onClick={handleCancelLocalEdit}
                className="w-full h-11 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-md text-label-md font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
                Cancelar edición
              </button>
            )}
          </div>
        </form>

        {/* Lista Inferior de Multas Activas */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-headline-sm font-headline-sm text-on-surface font-bold">
                Historial de Sanciones Cobradas
              </h2>
              <span className="text-body-sm font-body-sm text-on-surface-variant">
                Temporada 2026-2027 • Control D.T.
              </span>
            </div>
            <span className="text-label-sm font-label-sm text-primary font-bold">
              Total ({multas.length})
            </span>
          </div>

          {multas.length === 0 ? (
            <div className="tactical-glass rounded-xl p-8 text-center flex flex-col items-center justify-center gap-2 border border-outline-variant/20">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
                warning
              </span>
              <p className="text-body-md font-body-md text-on-surface-variant font-medium">
                Sin registros
              </p>
              <span className="text-label-sm font-label-sm text-outline">
                No hay multas ni sanciones registradas en la hoja ($0.00)
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {multas.map((m, idx) => (
                <article
                  key={m.id || m.rowIndex || idx}
                  className="tactical-glass rounded-xl p-3 flex items-center justify-between transition-all gap-2 border border-outline-variant/30 hover:border-primary/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-container flex flex-col items-center justify-center border border-primary/20 shrink-0">
                      <span className="text-label-sm font-label-sm text-on-surface-variant font-bold">
                        DOR
                      </span>
                      <span className="text-numeric-stat text-sm font-bold leading-none text-primary">
                        {m.dorsal || '--'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-body-md font-body-md font-bold text-on-surface">
                          {m.jugador}
                        </h3>
                        <span className="text-[10px] px-1 rounded bg-surface-container-high text-primary font-medium">
                          {m.rama === 'Varonil' ? 'VAR' : 'FEM'}
                        </span>
                        {m.rowIndex != null && (
                          <span className="text-[10px] text-outline">#{m.rowIndex}</span>
                        )}
                      </div>
                      <span className="text-body-sm font-body-sm text-on-surface-variant">
                        {m.motivo}
                      </span>
                      <span className="text-label-sm font-label-sm text-outline">
                        {m.fecha} {m.sede ? `• ${m.sede}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-numeric-stat text-sm font-bold text-on-surface">
                        ${(Number(m.monto) || 0).toFixed(2)}{' '}
                        <span className="text-[10px] text-on-surface-variant">
                          MXN
                        </span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-tertiary/10 border border-tertiary-container/40 text-tertiary text-[10px] font-bold tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />{' '}
                        COBRADA
                      </span>
                    </div>

                    {/* Botones Editar y Borrar */}
                    <div className="flex flex-col gap-1 shrink-0 ml-1">
                      <button
                        type="button"
                        title="Editar sanción"
                        onClick={() => handleStartLocalEdit(m)}
                        className="p-1.5 rounded-lg bg-surface-container-high hover:bg-primary-container hover:text-on-primary-container text-primary transition-colors flex items-center justify-center cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        type="button"
                        title="Borrar sanción"
                        onClick={() => onDeleteItem && onDeleteItem(m.rowIndex)}
                        className="p-1.5 rounded-lg bg-surface-container-high hover:bg-error hover:text-on-error text-error transition-colors flex items-center justify-center cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Resumen Táctico de Multas: Única Tarjeta Cobrada */}
        <div className="tactical-glass rounded-xl p-3.5 flex items-center justify-between mt-1 border border-tertiary-container/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-surface-container text-tertiary">
              <span className="material-symbols-outlined text-lg material-symbols-fill">
                payments
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-label-sm font-label-sm text-on-surface-variant uppercase font-semibold">
                Total Multas Cobradas en Cancha
              </span>
              <span className="text-label-sm font-label-sm text-outline">
                Suma directa a saldo neto y vinculadas al partido
              </span>
            </div>
          </div>
          <span className="text-headline-sm font-headline-sm font-bold text-tertiary">
            ${(Number(totalMultas) || totalCobrado).toFixed(2)}
          </span>
        </div>
      </main>
    </div>
  );
}
