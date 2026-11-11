import React, { useState, useEffect } from 'react';
import TopAppBar from '../components/TopAppBar';
import { normalizeDateToIso } from '../services/googleSheets';

const CATEGORIAS = [
  { id: 'Material Deportivo', label: 'Material Dep.', icon: 'sports_soccer' },
  { id: 'Hidratación', label: 'Hidratación', icon: 'water_drop' },
  { id: 'Botiquín', label: 'Botiquín', icon: 'medical_services' },
  { id: 'Transporte', label: 'Transporte', icon: 'directions_bus' },
  { id: 'Uniformes', label: 'Uniformes', icon: 'apparel' },
];

export default function GastosScreen({
  gastos = [],
  gastosOperativos = 0,
  onSaveGasto,
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
  const [concepto, setConcepto] = useState('');
  const [categoria, setCategoria] = useState('Material Deportivo');
  const [monto, setMonto] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setEditingRowIndex(editingItem.rowIndex ?? null);
      setFecha(normalizeDateToIso(editingItem.fecha) || todayIso);
      setConcepto(editingItem.concepto || '');
      setCategoria(editingItem.categoria || 'Material Deportivo');
      setMonto(editingItem.monto != null ? String(editingItem.monto) : '');
      setObservaciones(editingItem.observaciones || '');
    } else {
      setEditingRowIndex(null);
    }
  }, [editingItem, todayIso]);

  const handleCancelLocalEdit = () => {
    setEditingRowIndex(null);
    setFecha(todayIso);
    setConcepto('');
    setCategoria('Material Deportivo');
    setMonto('');
    setObservaciones('');
    if (onCancelEdit) onCancelEdit();
  };

  const handleStartLocalEdit = (g) => {
    if (onEditItem) {
      onEditItem(g);
    } else {
      setEditingRowIndex(g.rowIndex ?? null);
      setFecha(g.fecha || todayFormatted);
      setConcepto(g.concepto || '');
      setCategoria(g.categoria || 'Material Deportivo');
      setMonto(g.monto != null ? String(g.monto) : '');
      setObservaciones(g.observaciones || '');
    }
  };

  const subMaterial = gastos
    .filter((g) => String(g.categoria).includes('Material'))
    .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);

  const subHidratacion = gastos
    .filter((g) => String(g.categoria).includes('Hidratación'))
    .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);

  const subTransporte = gastos
    .filter((g) => String(g.categoria).includes('Transporte'))
    .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);

  const totalAcumulado =
    Number(gastosOperativos) ||
    gastos.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!concepto.trim() || saving) return;

    setSaving(true);
    setSavedSuccess(false);

    const isEdit = editingRowIndex != null;
    const montoNum = parseFloat(monto) || 0;
    const finalFecha = normalizeDateToIso(fecha) || todayIso;
    const payload = {
      tipo: 'GASTO',
      accion: isEdit ? 'EDITAR' : 'CREAR',
      ...(isEdit ? { rowIndex: editingRowIndex } : {}),
      fecha: finalFecha,
      concepto: concepto.trim(),
      categoria,
      monto: montoNum,
      observaciones: observaciones.trim(),
    };

    try {
      await onSaveGasto(payload);
      setSavedSuccess(true);
      if (isEdit) {
        handleCancelLocalEdit();
      } else {
        setConcepto('');
        setMonto('');
        setObservaciones('');
      }
      setTimeout(() => setSavedSuccess(false), 2600);
    } finally {
      setSaving(false);
    }
  };

  const getIconForCategory = (cat) => {
    const str = String(cat || '');
    if (str.includes('Material')) return 'sports_soccer';
    if (str.includes('Hidratación')) return 'water_drop';
    if (str.includes('Botiquín')) return 'medical_services';
    if (str.includes('Transporte')) return 'directions_bus';
    if (str.includes('Uniformes')) return 'apparel';
    return 'inventory_2';
  };

  return (
    <div className="pb-28">
      <TopAppBar
        subtitle="Temporada 2026-2027 • CECYTEM 33 Capula"
        onRefresh={onRefresh}
        isSyncing={isSyncing}
        syncStatus={syncStatus}
      />

      {/* Subheader Context */}
      <div className="px-margin-mobile pt-space-md pb-space-xs flex items-center justify-between max-w-md mx-auto">
        <div className="flex flex-col">
          <span className="text-headline-md font-headline-md text-primary-fixed tracking-tight">
            Gastos y Materiales
          </span>
          <span className="text-body-sm font-body-sm text-on-surface-variant">
            Operatividad &amp; Logística • D.T. Luis M. Martínez
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high border border-primary-container/30 text-primary text-label-sm font-label-sm font-semibold tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
          Presupuesto Club
        </span>
      </div>

      <main className="px-margin-mobile space-y-space-md mt-space-sm max-w-md mx-auto">
        {/* TARJETA DE RESUMEN SUPERIOR */}
        <section className="rounded-xl p-space-md bg-[#112A46]/75 backdrop-blur-md border border-primary-container/25 glow-cyan relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none text-primary">
            <span className="material-symbols-outlined text-9xl">
              inventory_2
            </span>
          </div>
          <div className="flex justify-between items-start mb-space-sm relative z-10">
            <div>
              <span className="text-label-sm font-label-sm text-on-surface-variant tracking-widest uppercase font-semibold">
                Total Gastos Acumulados
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-display-hero-mobile font-display-hero-mobile text-primary tracking-tight font-bold">
                  $
                  {totalAcumulado.toLocaleString('es-MX', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="text-label-md font-label-md text-primary/80">
                  MXN
                </span>
              </div>
            </div>
            <span className="px-2 py-1 rounded-md bg-surface-container-lowest/80 border border-outline-variant/30 text-tertiary text-label-sm font-label-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">
                verified_user
              </span>{' '}
              Activo
            </span>
          </div>

          {/* Subtotales rápidos por rubro */}
          <div className="grid grid-cols-3 gap-2 pt-space-sm border-t border-primary-container/15 relative z-10">
            <div className="bg-surface-container/60 rounded-lg p-2 border border-outline-variant/20 flex flex-col">
              <span className="text-label-sm font-label-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-primary-fixed-dim">
                  sports_soccer
                </span>{' '}
                Material
              </span>
              <span className="text-label-lg font-numeric-stat text-on-surface mt-1 font-bold">
                ${subMaterial.toFixed(2)}
              </span>
            </div>
            <div className="bg-surface-container/60 rounded-lg p-2 border border-outline-variant/20 flex flex-col">
              <span className="text-label-sm font-label-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-primary-fixed-dim">
                  water_drop
                </span>{' '}
                Hidratación
              </span>
              <span className="text-label-lg font-numeric-stat text-on-surface mt-1 font-bold">
                ${subHidratacion.toFixed(2)}
              </span>
            </div>
            <div className="bg-surface-container/60 rounded-lg p-2 border border-outline-variant/20 flex flex-col">
              <span className="text-label-sm font-label-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-primary-fixed-dim">
                  directions_bus
                </span>{' '}
                Transporte
              </span>
              <span className="text-label-lg font-numeric-stat text-on-surface mt-1 font-bold">
                ${subTransporte.toFixed(2)}
              </span>
            </div>
          </div>
        </section>

        {/* Banner de Modo Edición */}
        {editingRowIndex != null && (
          <div className="tactical-glass rounded-xl p-3 bg-primary-container/20 border border-primary-container flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">
                edit
              </span>
              <div>
                <span className="text-body-md font-body-md text-primary font-bold block">
                  Modo Edición de Gasto
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

        {/* FORMULARIO DE REGISTRO RÁPIDO */}
        <section className="rounded-xl p-space-md bg-surface-container-low/90 backdrop-blur-md border border-primary-container/15 shadow-md space-y-space-md">
          <div className="flex items-center justify-between pb-1 border-b border-outline-variant/20">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-lg">
                post_add
              </span>
              <h2 className="text-headline-sm font-headline-sm text-on-surface font-bold">
                {editingRowIndex != null ? 'Editar Registro de Gasto' : 'Nuevo Registro de Gasto'}
              </h2>
            </div>
            <span className="text-label-sm font-label-sm text-primary-fixed-dim">
              Paso a Paso
            </span>
          </div>

          <form className="space-y-space-md" onSubmit={handleSubmit}>
            {/* Fila 1: Fecha del gasto */}
            <div>
              <label
                htmlFor="expenseDate"
                className="block text-label-md font-label-md text-on-surface-variant mb-1.5 uppercase tracking-wide"
              >
                1. Fecha de Operación
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-primary-container">
                  <span className="material-symbols-outlined text-base">
                    calendar_month
                  </span>
                </span>
                <input
                  id="expenseDate"
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-surface-dim/80 border border-primary-container/20 text-on-surface font-numeric-stat text-body-md focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none"
                />
              </div>
            </div>

            {/* Fila 2: Concepto del Gasto */}
            <div>
              <label
                htmlFor="expenseConcept"
                className="block text-label-md font-label-md text-on-surface-variant mb-1.5 uppercase tracking-wide"
              >
                2. Concepto del Gasto
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                  <span className="material-symbols-outlined text-base">
                    edit_note
                  </span>
                </span>
                <input
                  id="expenseConcept"
                  type="text"
                  required
                  placeholder="ej. Balones Voit #5 o Cinta kinesiológica"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-surface-dim/80 border border-primary-container/20 text-on-surface font-body-md placeholder:text-on-surface-variant/40 focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none"
                />
              </div>
            </div>

            {/* Fila 3: Selector de Categoría */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wide">
                  3. Selector de Categoría
                </label>
                <span className="text-label-sm font-label-sm text-primary font-bold">
                  {categoria}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIAS.map((cat) => {
                  const active = categoria === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoria(cat.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-left transition-all duration-150 border cursor-pointer ${
                        active
                          ? 'bg-[#17375B] border-primary-container text-primary font-semibold shadow-sm'
                          : 'bg-surface-container border-outline-variant/30 text-on-surface-variant hover:border-primary-container/40'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-lg ${
                          active ? 'text-primary-container' : ''
                        }`}
                      >
                        {cat.icon}
                      </span>
                      <span className="text-label-md font-label-md">
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fila 4: Monto ($ MXN) */}
            <div>
              <label
                htmlFor="expenseAmount"
                className="block text-label-md font-label-md text-on-surface-variant mb-1.5 uppercase tracking-wide"
              >
                4. Monto a Registrar ($ MXN)
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-0 pl-3.5 pointer-events-none flex items-center">
                  <span className="text-headline-md font-numeric-stat text-primary-container font-bold">
                    $
                  </span>
                </div>
                <input
                  id="expenseAmount"
                  type="number"
                  min="0"
                  step="5"
                  required
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="w-full pl-9 pr-14 py-3 rounded-xl bg-surface-dim/90 border border-primary-container/30 text-primary-fixed font-numeric-stat text-headline-sm focus:border-primary-container focus:ring-2 focus:ring-primary-container/30 transition-all outline-none"
                />
                <span className="absolute right-3 text-label-md font-label-md text-on-surface-variant font-semibold">
                  MXN
                </span>
              </div>
            </div>

            {/* Fila 5: Observaciones */}
            <div>
              <label
                htmlFor="expenseNotes"
                className="block text-label-md font-label-md text-on-surface-variant mb-1.5 uppercase tracking-wide"
              >
                5. Observaciones &amp; Comprobante
              </label>
              <div className="relative">
                <span className="absolute top-3 left-3 pointer-events-none text-on-surface-variant">
                  <span className="material-symbols-outlined text-base">
                    receipt_long
                  </span>
                </span>
                <textarea
                  id="expenseNotes"
                  rows="2"
                  placeholder="Factura #1024 / Entregado al D.T. Luis Manuel"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-xl bg-surface-dim/80 border border-primary-container/20 text-on-surface font-body-md placeholder:text-on-surface-variant/40 focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none resize-none"
                />
              </div>
            </div>

            {/* Fila 6: Botones de Acción */}
            <div className="pt-1 space-y-2">
              <button
                type="submit"
                disabled={saving}
                className={`w-full py-3.5 px-4 rounded-xl font-headline-sm font-semibold flex items-center justify-center gap-2 glow-cyan-btn active:scale-[0.98] transition-all duration-150 cursor-pointer ${
                  savedSuccess
                    ? 'bg-tertiary-container text-on-tertiary-container'
                    : 'bg-primary-container hover:bg-primary-fixed-dim text-on-primary-container'
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
                    <span className="material-symbols-outlined text-xl">
                      task_alt
                    </span>
                    <span>
                      {editingRowIndex != null
                        ? '¡Gasto Actualizado!'
                        : '¡Gasto Operativo Guardado!'}
                    </span>
                  </>
                ) : editingRowIndex != null ? (
                  <>
                    <span className="material-symbols-outlined text-xl">edit</span>
                    <span>Actualizar Gasto Operativo (Fila #{editingRowIndex})</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">save</span>
                    <span>Registrar Gasto Operativo</span>
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
        </section>

        {/* RESUMEN INFERIOR - LISTA CRONOLÓGICA DE GASTOS */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-base">
                history
              </span>
              <h3 className="text-headline-sm font-headline-sm text-on-surface font-bold">
                Movimientos Registrados
              </h3>
            </div>
            <span className="text-label-sm font-label-sm text-on-surface-variant font-bold">
              {gastos.length} registros
            </span>
          </div>

          {gastos.length === 0 ? (
            <div className="tactical-glass rounded-xl p-8 text-center flex flex-col items-center justify-center gap-2 border border-outline-variant/20">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
                inventory_2
              </span>
              <p className="text-body-md font-body-md text-on-surface-variant font-medium">
                Sin registros
              </p>
              <span className="text-label-sm font-label-sm text-outline">
                No hay gastos operativos registrados en la hoja ($0.00)
              </span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {gastos.map((g, idx) => {
                const amount = Number(g.monto) || 0;
                return (
                  <div
                    key={g.id || g.rowIndex || idx}
                    className="p-3 rounded-xl bg-surface-container-low/75 border border-primary-container/10 flex items-center justify-between hover:border-primary-container/30 transition-all gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary-container shrink-0">
                        <span className="material-symbols-outlined text-xl">
                          {getIconForCategory(g.categoria)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-body-md font-body-md font-semibold text-on-surface leading-tight">
                            {g.concepto}
                          </p>
                          {g.rowIndex != null && (
                            <span className="text-[10px] text-outline">#{g.rowIndex}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-label-sm font-label-sm text-primary-fixed">
                            {g.categoria}
                          </span>
                          <span className="text-body-sm font-body-sm text-on-surface-variant">
                            • {g.fecha}
                          </span>
                        </div>
                        {g.observaciones && (
                          <p className="text-body-sm font-body-sm text-on-surface-variant/80 mt-0.5 italic">
                            {g.observaciones}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span
                          className={`font-numeric-stat text-headline-sm font-bold block ${
                            amount === 0 ? 'text-tertiary' : 'text-error'
                          }`}
                        >
                          {amount === 0 ? '$0.00' : `-$${amount.toFixed(2)}`}
                        </span>
                        <p className="text-label-sm font-label-sm text-on-surface-variant">
                          {amount === 0 ? 'Donación' : 'Efectivo'}
                        </p>
                      </div>

                      {/* Botones Editar y Borrar */}
                      <div className="flex flex-col gap-1 shrink-0 ml-1">
                        <button
                          type="button"
                          title="Editar gasto"
                          onClick={() => handleStartLocalEdit(g)}
                          className="p-1.5 rounded-lg bg-surface-container-high hover:bg-primary-container hover:text-on-primary-container text-primary transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          type="button"
                          title="Borrar gasto"
                          onClick={() => onDeleteItem && onDeleteItem(g.rowIndex)}
                          className="p-1.5 rounded-lg bg-surface-container-high hover:bg-error hover:text-on-error text-error transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
