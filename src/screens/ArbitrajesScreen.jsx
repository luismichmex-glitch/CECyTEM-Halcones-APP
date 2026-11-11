import React, { useState, useEffect } from 'react';
import TopAppBar from '../components/TopAppBar';
import { normalizeDateToIso } from '../services/googleSheets';

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

export default function ArbitrajesScreen({
  partidos = [],
  multas = [],
  onSavePartido,
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
  const [liga, setLiga] = useState('UNLA');
  const [rama, setRama] = useState('Femenil');
  const [puntuales, setPuntuales] = useState(0);
  const [retardos, setRetardos] = useState(0);
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Opciones de liga: UNLA y Liga Municipal (más liga personalizada si viene al editar)
  const availableLigas = ['UNLA', 'Liga Municipal'];
  if (liga && !availableLigas.includes(liga)) {
    availableLigas.push(liga);
  }

  // Cargar registro a editar si se recibe desde props
  useEffect(() => {
    if (editingItem) {
      setEditingRowIndex(editingItem.rowIndex ?? null);
      setFecha(normalizeDateToIso(editingItem.fecha) || todayIso);
      setLiga(editingItem.liga || 'UNLA');
      setRama(editingItem.rama || 'Femenil');
      setPuntuales(Number(editingItem.puntuales) || 0);
      setRetardos(Number(editingItem.retardos) || 0);
    } else {
      setEditingRowIndex(null);
    }
  }, [editingItem, todayIso]);

  const handleCancelLocalEdit = () => {
    setEditingRowIndex(null);
    setFecha(todayIso);
    setLiga('UNLA');
    setRama('Femenil');
    setPuntuales(0);
    setRetardos(0);
    if (onCancelEdit) onCancelEdit();
  };

  const handleStartLocalEdit = (p) => {
    if (onEditItem) {
      onEditItem(p);
    } else {
      setEditingRowIndex(p.rowIndex ?? null);
      setFecha(normalizeDateToIso(p.fecha) || todayIso);
      setLiga(p.liga || 'UNLA');
      setRama(p.rama || 'Femenil');
      setPuntuales(Number(p.puntuales) || 0);
      setRetardos(Number(p.retardos) || 0);
    }
  };

  // Cálculos en vivo informativos:
  // 1. Recaudación: Puntuales * 10 + Retardos * 30
  const subtotalPuntuales = puntuales * 10;
  const subtotalRetardos = retardos * 30;
  const recaudacionEstimada = subtotalPuntuales + subtotalRetardos;

  // 2. Estimación pago árbitro según liga: UNLA ($175), Liga Municipal ($125)
  const estimadoPagoArbitro = liga === 'Liga Municipal' ? 125 : 175;

  // 3. Multas vinculadas automáticamente mediante la fórmula SUMIFS (por fecha YYYY-MM-DD y rama)
  const fechaIsoActual = normalizeDateToIso(fecha) || todayIso;
  const multasVinculadas = (multas || [])
    .filter(
      (m) =>
        normalizeDateToIso(m.fecha) === fechaIsoActual &&
        (m.rama || '').toLowerCase() === rama.toLowerCase()
    )
    .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);

  const saldoNetoEstimado =
    recaudacionEstimada + multasVinculadas - estimadoPagoArbitro;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSavedSuccess(false);

    const isEdit = editingRowIndex != null;
    const finalFecha = normalizeDateToIso(fecha) || todayIso;

    // El payload enviado por POST SOLO debe enviar estos campos:
    // La hoja de cálculo calcula automáticamente recaudacion, pagoArbitro, multasPartido y saldoPartido
    const payload = {
      tipo: 'PARTIDO',
      accion: isEdit ? 'EDITAR' : 'CREAR',
      ...(isEdit ? { rowIndex: editingRowIndex } : {}),
      fecha: finalFecha, // Formato YYYY-MM-DD
      liga,
      rama,
      puntuales,
      retardos,
    };

    try {
      await onSavePartido(payload);
      setSavedSuccess(true);
      if (isEdit) {
        handleCancelLocalEdit();
      }
      setTimeout(() => setSavedSuccess(false), 2600);
    } finally {
      setSaving(false);
    }
  };

  const playerLabel = rama === 'Femenil' ? 'jugadoras' : 'jugadores';

  return (
    <div className="pb-28">
      <TopAppBar
        subtitle="Temp. 2026-2027 • D.T. Luis Manuel M."
        onRefresh={onRefresh}
        isSyncing={isSyncing}
        syncStatus={syncStatus}
      />

      <main className="max-w-md mx-auto px-margin-mobile pt-4 space-y-4">
        {/* Page Title Subheader */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-tertiary-container animate-pulse" />
              <span className="text-label-md font-label-md text-tertiary-container uppercase tracking-wider">
                Cédula Oficial
              </span>
            </div>
            <h1 className="text-headline-md font-headline-md text-on-surface font-bold tracking-tight">
              Control de Partidos
            </h1>
            <p className="text-body-sm font-body-sm text-on-surface-variant">
              Registro de Asistencia y Planilla de Cancha
            </p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-label-sm font-label-sm text-on-surface-variant">
              JORNADA
            </span>
            <span className="text-headline-sm font-headline-sm text-primary font-bold">
              #{String(partidos.length + 1).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Banner de Modo Edición */}
        {editingRowIndex != null && (
          <div className="tactical-glass rounded-xl p-3 bg-primary-container/20 border border-primary-container flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">
                edit
              </span>
              <div>
                <span className="text-body-md font-body-md text-primary font-bold block">
                  Modo Edición de Partido
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

        {/* Formulario Táctico de Cancha */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* 1. Selector de Fecha (Siempre YYYY-MM-DD) */}
          <div className="tactical-glass rounded-xl p-3.5 flex items-center justify-between shadow-sm relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-fixed-dim border border-primary-container/20">
                <span className="material-symbols-outlined text-[22px]">
                  calendar_today
                </span>
              </div>
              <div>
                <label
                  className="block text-label-sm font-label-sm text-on-surface-variant"
                  htmlFor="matchDate"
                >
                  FECHA DEL ENCUENTRO (YYYY-MM-DD)
                </label>
                <span className="text-body-lg font-body-lg text-on-surface font-semibold capitalize">
                  {formatSpanishDate(fecha)}
                </span>
              </div>
            </div>
            <input
              id="matchDate"
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="bg-surface-container-high text-on-surface text-xs rounded-lg px-2.5 py-1.5 border border-primary-container/30 focus:outline-none focus:border-primary"
            />
          </div>

          {/* 2. Selector de Liga: UNLA y Liga Municipal */}
          <div className="tactical-glass rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-label-sm font-label-sm text-on-surface-variant font-semibold">
                TORNEO / LIGA
              </span>
              <span className="text-label-sm font-label-sm text-primary font-bold">
                SELECCIONADO: {liga.toUpperCase()}
              </span>
            </div>
            <div className={`grid ${availableLigas.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
              {availableLigas.map((item) => {
                const active = liga === item;
                const feeText = item === 'UNLA' ? '$175' : item === 'Liga Municipal' ? '$125' : '';
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setLiga(item)}
                    className={`h-11 rounded-lg text-body-md font-body-md transition-all border cursor-pointer flex items-center justify-center gap-1.5 ${
                      active
                        ? 'font-semibold border-primary-container bg-primary-container/20 text-primary-fixed tactical-glow-cyan'
                        : 'font-medium border-outline-variant/40 bg-surface-container/60 text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span>{item}</span>
                    {feeText && (
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-surface-container-high text-primary border border-primary-container/30">
                        {feeText}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Selector de Rama (Femenil / Varonil) */}
          <div className="tactical-glass rounded-xl p-1.5 flex gap-1.5">
            {['Femenil', 'Varonil'].map((r) => {
              const active = rama === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRama(r)}
                  className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 font-headline-sm text-headline-sm font-semibold transition-all duration-150 cursor-pointer ${
                    active
                      ? 'bg-primary-container text-on-primary-container shadow-md'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    sports_soccer
                  </span>
                  <span>{r}</span>
                </button>
              );
            })}
          </div>

          {/* 4. Contadores de Asistencia de Jugadoras/es */}
          <div className="space-y-3">
            {/* Contador Puntuales */}
            <div className="tactical-glass rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-tertiary" />
                    <span className="text-body-md font-body-md font-bold text-on-surface">
                      Puntuales
                    </span>
                    <span className="text-label-md font-label-md text-primary font-medium">
                      ($10 c/u)
                    </span>
                  </div>
                  <span className="text-label-sm font-label-sm text-on-surface-variant">
                    Cuota base de puntualidad
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-label-sm font-label-sm text-on-surface-variant">
                    SUBTOTAL
                  </span>
                  <div className="text-headline-sm font-headline-sm text-tertiary font-bold">
                    ${subtotalPuntuales.toFixed(2)} MXN
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between bg-surface-container-low/80 rounded-lg p-1.5 border border-outline-variant/30">
                <button
                  aria-label="Disminuir puntuales"
                  type="button"
                  onClick={() => setPuntuales((p) => Math.max(0, p - 1))}
                  className="w-12 h-12 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface active:scale-90 transition-transform flex items-center justify-center text-headline-md font-headline-md font-bold border border-outline-variant/40 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[24px]">remove</span>
                </button>
                <div className="flex flex-col items-center">
                  <div className="flex items-baseline gap-1">
                    <span className="text-display-hero-mobile font-display-hero-mobile text-primary font-bold leading-none">
                      {puntuales}
                    </span>
                    <span className="text-body-sm font-body-sm text-on-surface-variant">
                      {playerLabel}
                    </span>
                  </div>
                  <span className="text-label-sm font-label-sm text-outline">
                    En vestidor a tiempo
                  </span>
                </div>
                <button
                  aria-label="Aumentar puntuales"
                  type="button"
                  onClick={() => setPuntuales((p) => p + 1)}
                  className="w-12 h-12 rounded-lg bg-primary-container text-on-primary-container active:scale-90 transition-transform flex items-center justify-center text-headline-md font-headline-md font-bold shadow-md cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[24px]">add</span>
                </button>
              </div>
            </div>

            {/* Contador Retardos */}
            <div className="tactical-glass rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    <span className="text-body-md font-body-md font-bold text-on-surface">
                      Retardos
                    </span>
                    <span className="text-label-md font-label-md text-secondary font-medium">
                      ($30 c/u)
                    </span>
                  </div>
                  <span className="text-label-sm font-label-sm text-on-surface-variant">
                    Llegada posterior a charla
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-label-sm font-label-sm text-on-surface-variant">
                    SUBTOTAL
                  </span>
                  <div className="text-headline-sm font-headline-sm text-secondary font-bold">
                    ${subtotalRetardos.toFixed(2)} MXN
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between bg-surface-container-low/80 rounded-lg p-1.5 border border-outline-variant/30">
                <button
                  aria-label="Disminuir retardos"
                  type="button"
                  onClick={() => setRetardos((r) => Math.max(0, r - 1))}
                  className="w-12 h-12 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface active:scale-90 transition-transform flex items-center justify-center text-headline-md font-headline-md font-bold border border-outline-variant/40 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[24px]">remove</span>
                </button>
                <div className="flex flex-col items-center">
                  <div className="flex items-baseline gap-1">
                    <span className="text-display-hero-mobile font-display-hero-mobile text-secondary font-bold leading-none">
                      {retardos}
                    </span>
                    <span className="text-body-sm font-body-sm text-on-surface-variant">
                      {playerLabel}
                    </span>
                  </div>
                  <span className="text-label-sm font-label-sm text-outline">
                    Con sanción de retardo
                  </span>
                </div>
                <button
                  aria-label="Aumentar retardos"
                  type="button"
                  onClick={() => setRetardos((r) => r + 1)}
                  className="w-12 h-12 rounded-lg bg-secondary text-on-secondary active:scale-90 transition-transform flex items-center justify-center text-headline-md font-headline-md font-bold shadow-md cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[24px]">add</span>
                </button>
              </div>
            </div>
          </div>

          {/* 5. Valores Calculados Automáticamente por la Hoja (Solo lectura) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Pago Árbitro (Automático en Hoja) */}
            <div className="tactical-glass rounded-xl p-3 space-y-1 bg-surface-container-low/60 border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <span className="text-label-sm font-label-sm text-on-surface-variant">
                  Pago Árbitro
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-error-container text-error font-bold">
                  AUTO
                </span>
              </div>
              <div className="text-headline-sm font-numeric-stat text-on-surface font-bold">
                ${estimadoPagoArbitro}.00
              </div>
              <p className="text-[11px] text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">sports</span>
                {liga === 'Liga Municipal' ? 'Liga Municipal ($125)' : 'UNLA ($175)'}
              </p>
            </div>

            {/* Multas del Partido (Fórmula SUMIFS en Hoja) */}
            <div className="tactical-glass rounded-xl p-3 space-y-1 bg-surface-container-low/60 border border-tertiary-container/30">
              <div className="flex items-center justify-between">
                <span className="text-label-sm font-label-sm text-tertiary">
                  Multas (SUMIFS)
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-tertiary-container/30 text-tertiary font-bold">
                  AUTO
                </span>
              </div>
              <div className="text-headline-sm font-numeric-stat text-tertiary font-bold">
                +${multasVinculadas.toFixed(2)}
              </div>
              <p className="text-[11px] text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">link</span>
                Fecha &amp; {rama}
              </p>
            </div>
          </div>

          {/* Tarjeta de Previsualización Informativa */}
          <section className="tactical-glass rounded-xl p-4 tactical-glow-cyan border-2 border-primary-container/40 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  analytics
                </span>
                <h2 className="text-headline-sm font-headline-sm text-primary font-bold">
                  Estimación en Cancha
                </h2>
              </div>
              <span className="text-label-sm font-label-sm px-2 py-0.5 rounded-full bg-primary-container/20 text-primary-fixed border border-primary-container/40 font-semibold">
                Cálculo Hoja
              </span>
            </div>

            <div className="py-3 space-y-2 text-body-md font-body-md">
              <div className="flex justify-between items-center text-on-surface-variant">
                <span>
                  Recaudación Arbitraje ({puntuales} Puntuales + {retardos} Retardos)
                </span>
                <span className="font-numeric-stat text-body-lg font-semibold text-on-surface">
                  ${recaudacionEstimada.toFixed(2)} MXN
                </span>
              </div>
              <div className="flex justify-between items-center text-on-surface-variant">
                <span className="flex items-center gap-1">
                  Multas Vinculadas (SUMIFS {rama})
                </span>
                <span className="font-numeric-stat text-body-lg font-semibold text-tertiary">
                  +${multasVinculadas.toFixed(2)} MXN
                </span>
              </div>
              <div className="flex justify-between items-center text-on-surface-variant">
                <span className="flex items-center gap-1">Pago Árbitro (Automático {liga})</span>
                <span className="font-numeric-stat text-body-lg font-semibold text-error">
                  -${estimadoPagoArbitro.toFixed(2)} MXN
                </span>
              </div>
            </div>

            {/* Saldo Neto Estimado */}
            <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-between bg-surface-container-low/70 -mx-4 -mb-4 px-4 py-3 rounded-b-xl">
              <div>
                <span className="text-label-md font-label-md text-on-surface-variant block font-bold">
                  SALDO NETO ESTIMADO
                </span>
                <span className="text-label-sm font-label-sm text-tertiary-container">
                  La hoja aplicará las fórmulas oficiales al registrar
                </span>
              </div>
              <div className="text-right">
                <div
                  className={`text-display-hero-mobile font-display-hero-mobile font-bold tracking-tight ${
                    saldoNetoEstimado >= 0 ? 'text-tertiary' : 'text-error'
                  }`}
                >
                  {saldoNetoEstimado >= 0 ? '+' : ''}${saldoNetoEstimado.toFixed(2)} MXN
                </div>
              </div>
            </div>
          </section>

          {/* Botones de Acción */}
          <div className="space-y-2">
            <button
              type="submit"
              disabled={saving}
              className={`w-full h-14 rounded-xl font-headline-sm text-headline-sm font-bold flex items-center justify-center gap-2 tactical-glow-cyan active:scale-[0.98] transition-all shadow-lg cursor-pointer ${
                savedSuccess
                  ? 'bg-tertiary-container text-on-tertiary-container'
                  : 'bg-primary-container hover:bg-primary-fixed-dim text-on-primary-container'
              }`}
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined text-[24px] animate-spin">
                    progress_activity
                  </span>
                  <span>Sincronizando con Google Sheet...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <span className="material-symbols-outlined text-[24px]">task_alt</span>
                  <span>
                    {editingRowIndex != null
                      ? '¡Partido Actualizado!'
                      : '¡Cédula Guardada con Éxito!'}
                  </span>
                </>
              ) : editingRowIndex != null ? (
                <>
                  <span className="material-symbols-outlined text-[24px]">edit</span>
                  <span>Actualizar Partido (Fila #{editingRowIndex})</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[24px]">
                    cloud_upload
                  </span>
                  <span>Guardar Partido en Google Sheet</span>
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

        {/* Sección Inferior: Lista de Partidos Guardados */}
        <section className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-headline-sm font-headline-sm text-on-surface font-semibold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">
                cloud_upload
              </span>
              <span>Partidos Guardados en Hoja</span>
            </h3>
            <span className="text-label-sm font-label-sm text-primary font-bold">
              {partidos.length} registros
            </span>
          </div>

          {partidos.length === 0 ? (
            <div className="tactical-glass rounded-xl p-8 text-center flex flex-col items-center justify-center gap-2 border border-outline-variant/20">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
                sports_soccer
              </span>
              <p className="text-body-md font-body-md text-on-surface-variant font-medium">
                Sin registros
              </p>
              <span className="text-label-sm font-label-sm text-outline">
                No hay partidos registrados en la hoja ($0.00)
              </span>
            </div>
          ) : (
            partidos.map((p, idx) => (
              <div
                key={p.id || p.rowIndex || idx}
                className="tactical-glass rounded-xl p-3 flex items-center justify-between border-outline-variant/30 hover:border-primary-container/30 transition-colors gap-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary border border-outline-variant/40 shrink-0">
                    <span className="material-symbols-outlined text-[20px]">
                      sports_soccer
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-body-md font-body-md font-bold text-on-surface">
                        {p.liga} {p.rama}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-tertiary/10 text-tertiary font-bold">
                        {p.jornada || `J${partidos.length - idx}`}
                      </span>
                      {p.rowIndex != null && (
                        <span className="text-[10px] text-outline">#{p.rowIndex}</span>
                      )}
                    </div>
                    <p className="text-body-sm font-body-sm text-on-surface-variant">
                      {p.fecha} • {(Number(p.puntuales) || 0) + (Number(p.retardos) || 0)}{' '}
                      asistentes • Arb: ${p.recaudacion}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-label-sm font-label-sm text-outline block">
                      NETO
                    </span>
                    <span
                      className={`text-headline-sm font-numeric-stat font-bold block ${
                        Number(p.saldoNeto) >= 0 ? 'text-tertiary' : 'text-error'
                      }`}
                    >
                      {Number(p.saldoNeto) >= 0 ? '+' : ''}$
                      {(Number(p.saldoNeto) || 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Botones Editar y Borrar */}
                  <div className="flex flex-col gap-1 shrink-0 ml-1">
                    <button
                      type="button"
                      title="Editar partido"
                      onClick={() => handleStartLocalEdit(p)}
                      className="p-1.5 rounded-lg bg-surface-container-high hover:bg-primary-container hover:text-on-primary-container text-primary transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      type="button"
                      title="Borrar partido"
                      onClick={() => onDeleteItem && onDeleteItem(p.rowIndex)}
                      className="p-1.5 rounded-lg bg-surface-container-high hover:bg-error hover:text-on-error text-error transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
