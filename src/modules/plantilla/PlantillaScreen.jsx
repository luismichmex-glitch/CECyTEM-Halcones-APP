import React, { useState, useEffect, useCallback, useMemo } from 'react';
import TopAppBar from '../../components/TopAppBar';
import {
  getJugadores,
  createJugador,
  updateJugador,
  deleteJugador,
  importarRosterDesdeGoogleSheets,
} from '../../services/supabaseClient';
import { RAMAS, POSICIONES } from './index';

export default function PlantillaScreen({
  plantilla = { Femenil: [], Varonil: [] },
  onRefreshGlobal,
  isSyncingGlobal = false,
  syncStatus = 'online',
}) {
  const [rama, setRama] = useState(RAMAS.FEMENIL);
  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroPosicion, setFiltroPosicion] = useState('Todas');

  // Modal de edición / creación
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [formData, setFormData] = useState({
    dorsal: '',
    nombre: '',
    posicion: 'Delantero Centro',
    rama: RAMAS.FEMENIL,
    semestre: '2° Semestre',
    goles: 0,
    asistencias: 0,
    activo: true,
  });
  const [savingPlayer, setSavingPlayer] = useState(false);

  // Modal o feedback toast
  const [feedback, setFeedback] = useState(null);

  const showFeedback = useCallback((msg, tone = 'cyan') => {
    setFeedback({ msg, tone });
    setTimeout(() => {
      setFeedback((prev) => (prev?.msg === msg ? null : prev));
    }, 3500);
  }, []);

  // Cargar jugadores desde Supabase
  const loadJugadores = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getJugadores(rama);
      setJugadores(data);
    } catch (err) {
      console.error('Error al cargar jugadores de Supabase:', err);
      showFeedback('Error al cargar jugadores desde Supabase', 'coral');
    } finally {
      setLoading(false);
    }
  }, [rama, showFeedback]);

  useEffect(() => {
    loadJugadores();
  }, [loadJugadores]);

  // Manejar importación desde Google Sheets
  const handleImportarGoogleSheets = async () => {
    const rosterSheet =
      (rama === RAMAS.FEMENIL ? plantilla?.Femenil : plantilla?.Varonil) || [];

    if (!rosterSheet || rosterSheet.length === 0) {
      showFeedback(
        `No hay jugadores en Google Sheets para la rama ${rama}`,
        'coral'
      );
      return;
    }

    const confirmar = window.confirm(
      `¿Deseas importar los jugadores de ${rama} desde Google Sheets a Supabase? Se agregarán sólo los que no existan.`
    );
    if (!confirmar) return;

    setImporting(true);
    try {
      const { importados, ignorados } = await importarRosterDesdeGoogleSheets(
        rosterSheet,
        rama
      );
      showFeedback(
        `Importación completada: ${importados} nuevos agregados, ${ignorados} ya existían`,
        importados > 0 ? 'emerald' : 'cyan'
      );
      await loadJugadores();
    } catch (err) {
      console.error('Error importando roster:', err);
      showFeedback('Error al importar jugadores a Supabase', 'coral');
    } finally {
      setImporting(false);
    }
  };

  // Abrir modal para crear
  const handleOpenCrear = () => {
    setEditingPlayer(null);
    setFormData({
      dorsal: '',
      nombre: '',
      posicion: 'Mediocentro Ofensivo',
      rama,
      semestre: '2° Semestre',
      goles: 0,
      asistencias: 0,
      activo: true,
    });
    setModalOpen(true);
  };

  // Abrir modal para editar
  const handleOpenEditar = (jugador) => {
    setEditingPlayer(jugador);
    setFormData({
      dorsal: jugador.dorsal || '',
      nombre: jugador.nombre || '',
      posicion: jugador.posicion || 'Delantero Centro',
      rama: jugador.rama || rama,
      semestre: jugador.semestre || '2° Semestre',
      goles: jugador.goles || 0,
      asistencias: jugador.asistencias || 0,
      activo: jugador.activo !== false,
    });
    setModalOpen(true);
  };

  // Guardar jugador (Crear o Editar)
  const handleSavePlayer = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      showFeedback('El nombre del jugador es obligatorio', 'coral');
      return;
    }

    setSavingPlayer(true);
    try {
      if (editingPlayer?.id) {
        await updateJugador(editingPlayer.id, formData);
        showFeedback('Jugador actualizado correctamente', 'emerald');
      } else {
        await createJugador(formData);
        showFeedback('Jugador agregado a la plantilla', 'emerald');
      }
      setModalOpen(false);
      setEditingPlayer(null);
      await loadJugadores();
    } catch (err) {
      console.error('Error guardando jugador:', err);
      showFeedback('Error al guardar jugador en Supabase', 'coral');
    } finally {
      setSavingPlayer(false);
    }
  };

  // Eliminar jugador
  const handleDeletePlayer = async (id, nombre) => {
    const confirmar = window.confirm(
      `¿Seguro que deseas eliminar a "${nombre}" de la plantilla oficial?`
    );
    if (!confirmar) return;

    try {
      await deleteJugador(id);
      showFeedback(`"${nombre}" ha sido eliminado`, 'emerald');
      await loadJugadores();
    } catch (err) {
      console.error('Error eliminando jugador:', err);
      showFeedback('Error al eliminar jugador', 'coral');
    }
  };

  // Filtrado y estadísticas
  const filteredJugadores = useMemo(() => {
    return jugadores.filter((j) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        (j.nombre || '').toLowerCase().includes(q) ||
        String(j.dorsal || '').includes(q) ||
        (j.posicion || '').toLowerCase().includes(q);

      const matchPos =
        filtroPosicion === 'Todas' || j.posicion === filtroPosicion;

      return matchSearch && matchPos;
    });
  }, [jugadores, searchQuery, filtroPosicion]);

  const stats = useMemo(() => {
    const total = jugadores.length;
    const totalGoles = jugadores.reduce((acc, j) => acc + (j.goles || 0), 0);
    const totalAsist = jugadores.reduce((acc, j) => acc + (j.asistencias || 0), 0);
    const topGoleador = [...jugadores].sort((a, b) => (b.goles || 0) - (a.goles || 0))[0];
    return {
      total,
      totalGoles,
      totalAsist,
      topGoleador: topGoleador && topGoleador.goles > 0 ? topGoleador : null,
    };
  }, [jugadores]);

  return (
    <div className="min-h-screen bg-background text-on-surface pb-28">
      <TopAppBar
        subtitle={`Plantilla Oficial • Rama ${rama}`}
        onRefresh={() => {
          loadJugadores();
          if (onRefreshGlobal) onRefreshGlobal();
        }}
        isSyncing={loading || importing || isSyncingGlobal}
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

      <main className="w-full max-w-4xl mx-auto px-margin-mobile pt-4 space-y-5">
        {/* Selector de Rama */}
        <div className="flex bg-surface-container rounded-xl p-1 border border-outline-variant/30">
          <button
            type="button"
            onClick={() => setRama(RAMAS.FEMENIL)}
            className={`flex-1 py-2 rounded-lg font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-2 ${
              rama === RAMAS.FEMENIL
                ? 'bg-primary text-on-primary shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">female</span>
            Rama Femenil
          </button>
          <button
            type="button"
            onClick={() => setRama(RAMAS.VARONIL)}
            className={`flex-1 py-2 rounded-lg font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-2 ${
              rama === RAMAS.VARONIL
                ? 'bg-primary text-on-primary shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">male</span>
            Rama Varonil
          </button>
        </div>

        {/* Resumen de Stats de la Plantilla */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl tactical-glass border border-outline-variant/30 flex flex-col justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Plantilla Activa
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-headline-sm text-headline-sm font-bold text-primary">
                {stats.total}
              </span>
              <span className="text-xs text-on-surface-variant">jugadores</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl tactical-glass border border-outline-variant/30 flex flex-col justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Goles Anotados
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-headline-sm text-headline-sm font-bold text-tertiary">
                {stats.totalGoles}
              </span>
              <span className="text-xs text-on-surface-variant">⚽ en liga</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl tactical-glass border border-outline-variant/30 flex flex-col justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Asistencias
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-headline-sm text-headline-sm font-bold text-primary-fixed">
                {stats.totalAsist}
              </span>
              <span className="text-xs text-on-surface-variant">🎯 pases</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl tactical-glass border border-outline-variant/30 flex flex-col justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Pichichi Actual
            </span>
            <div className="truncate mt-1">
              {stats.topGoleador ? (
                <span className="font-body-sm text-body-sm font-bold text-on-surface truncate block">
                  #{stats.topGoleador.dorsal} {stats.topGoleador.nombre.split(' ')[0]} ({stats.topGoleador.goles} ⚽)
                </span>
              ) : (
                <span className="text-xs text-on-surface-variant">Sin goles aún</span>
              )}
            </div>
          </div>
        </div>

        {/* Acciones principales: Nuevo Jugador + Importar de Sheets */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={handleOpenCrear}
            className="flex-1 h-11 px-4 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            + Nuevo Jugador Supabase
          </button>

          <button
            type="button"
            onClick={handleImportarGoogleSheets}
            disabled={importing}
            className="h-11 px-4 rounded-xl bg-surface-container-high border border-outline-variant/50 text-on-surface font-label-md text-label-md font-semibold flex items-center justify-center gap-2 hover:bg-surface-container-highest active:scale-95 transition-all disabled:opacity-50"
            title="Importa jugadores faltantes de Google Sheets hacia Supabase"
          >
            <span className={`material-symbols-outlined text-[20px] text-primary ${importing ? 'animate-spin' : ''}`}>
              {importing ? 'sync' : 'cloud_download'}
            </span>
            Importar desde Google Sheet
          </button>
        </div>

        {/* Barra de Filtro y Búsqueda */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por dorsal, nombre o posición..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface-container border border-outline-variant/40 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          <select
            value={filtroPosicion}
            onChange={(e) => setFiltroPosicion(e.target.value)}
            className="h-10 px-3 rounded-xl bg-surface-container border border-outline-variant/40 font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
          >
            <option value="Todas">Todas las Posiciones</option>
            {POSICIONES.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
        </div>

        {/* Listado de Jugadores */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <span className="material-symbols-outlined text-primary text-[36px] animate-spin">
              progress_activity
            </span>
            <p className="font-label-md text-label-md text-on-surface-variant">
              Cargando plantilla desde Supabase...
            </p>
          </div>
        ) : filteredJugadores.length === 0 ? (
          <div className="py-16 px-4 text-center rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container-low flex flex-col items-center justify-center gap-3">
            <span className="material-symbols-outlined text-outline text-[48px]">
              groups
            </span>
            <div>
              <p className="font-title-sm text-title-sm text-on-surface font-bold">
                {jugadores.length === 0
                  ? `No hay jugadores registrados en Supabase para Rama ${rama}`
                  : 'Ningún jugador coincide con la búsqueda'}
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 max-w-md">
                {jugadores.length === 0
                  ? 'Puedes importar la lista oficial automáticamente desde tu Google Sheet con un clic o registrar jugadores manualmente.'
                  : 'Prueba cambiando los términos de búsqueda o el filtro de posición.'}
              </p>
            </div>
            {jugadores.length === 0 && (
              <button
                type="button"
                onClick={handleImportarGoogleSheets}
                disabled={importing}
                className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold flex items-center gap-2 shadow-md hover:brightness-110 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">cloud_download</span>
                Importar Roster de Google Sheet Ahora
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredJugadores.map((jugador) => {
              const dorsalStr = jugador.dorsal || '--';
              return (
                <div
                  key={jugador.id}
                  className="p-3.5 rounded-xl tactical-glass border border-outline-variant/30 hover:border-primary/40 transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Dorsal Badge */}
                    <div className="w-11 h-11 rounded-full bg-surface-container-high border border-primary/40 flex items-center justify-center shrink-0 shadow-inner group-hover:border-primary">
                      <span className="font-mono font-bold text-primary text-base">
                        {dorsalStr}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-title-sm text-title-sm font-bold text-on-surface truncate">
                          {jugador.nombre}
                        </h4>
                        {!jugador.activo && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-secondary-container/60 text-secondary border border-secondary/30">
                            Baja
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-on-surface-variant mt-0.5">
                        <span className="text-primary-fixed font-medium">
                          {jugador.posicion || 'Plantilla Oficial'}
                        </span>
                        {jugador.semestre && (
                          <span>• {jugador.semestre}</span>
                        )}
                        <span className="text-tertiary font-semibold">
                          ⚽ {jugador.goles || 0}
                        </span>
                        <span className="text-primary font-semibold">
                          🎯 {jugador.asistencias || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditar(jugador)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
                      title="Editar datos del jugador"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePlayer(jugador.id, jugador.nombre)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-secondary hover:bg-secondary-container/20 transition-colors"
                      title="Eliminar de la plantilla"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de Agregar / Editar Jugador */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-high border border-outline-variant/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">
                  {editingPlayer ? 'edit' : 'person_add'}
                </span>
                <h3 className="font-title-md text-title-md font-bold text-on-surface">
                  {editingPlayer ? 'Editar Jugador' : 'Nuevo Jugador (Supabase)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSavePlayer} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                    Dorsal #
                  </label>
                  <input
                    type="text"
                    value={formData.dorsal}
                    onChange={(e) =>
                      setFormData({ ...formData, dorsal: e.target.value })
                    }
                    placeholder="10"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant/40 font-mono font-bold text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                    Rama
                  </label>
                  <select
                    value={formData.rama}
                    onChange={(e) =>
                      setFormData({ ...formData, rama: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface font-body-sm focus:outline-none focus:border-primary"
                  >
                    <option value={RAMAS.FEMENIL}>Femenil</option>
                    <option value={RAMAS.VARONIL}>Varonil</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  placeholder="Ej. Valeria Morales Morales"
                  className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface font-body-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                    Posición Táctica
                  </label>
                  <select
                    value={formData.posicion}
                    onChange={(e) =>
                      setFormData({ ...formData, posicion: e.target.value })
                    }
                    className="w-full h-10 px-2.5 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface font-body-sm focus:outline-none focus:border-primary"
                  >
                    {POSICIONES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                    Semestre
                  </label>
                  <select
                    value={formData.semestre}
                    onChange={(e) =>
                      setFormData({ ...formData, semestre: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface font-body-sm focus:outline-none focus:border-primary"
                  >
                    <option value="1° Semestre">1° Semestre</option>
                    <option value="2° Semestre">2° Semestre</option>
                    <option value="3° Semestre">3° Semestre</option>
                    <option value="4° Semestre">4° Semestre</option>
                    <option value="5° Semestre">5° Semestre</option>
                    <option value="6° Semestre">6° Semestre</option>
                    <option value="Egresado / Refuerzo">Egresado / Refuerzo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                    Goles Anotados ⚽
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.goles}
                    onChange={(e) =>
                      setFormData({ ...formData, goles: parseInt(e.target.value || 0, 10) })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface font-mono focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                    Asistencias 🎯
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.asistencias}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        asistencias: parseInt(e.target.value || 0, 10),
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface font-mono focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activoCheckbox"
                  checked={formData.activo}
                  onChange={(e) =>
                    setFormData({ ...formData, activo: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-primary focus:ring-primary bg-surface-container border-outline-variant"
                />
                <label
                  htmlFor="activoCheckbox"
                  className="font-body-sm text-body-sm text-on-surface select-none cursor-pointer"
                >
                  Jugador activo y disponible para convocatorias
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-label-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPlayer}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary font-label-md font-bold shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingPlayer && (
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      progress_activity
                    </span>
                  )}
                  {editingPlayer ? 'Actualizar Jugador' : 'Guardar en Supabase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
