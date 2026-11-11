import React, { useState } from 'react';
import TopAppBar from '../components/TopAppBar';

function formatCurrency(num) {
  const n = Number(num) || 0;
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DashboardScreen({
  resumen,
  partidos,
  multas,
  gastos,
  lastSyncTime,
  isSyncing,
  syncStatus,
  onRefresh,
  onNavigate,
  onEditItem,
  onDeleteItem,
}) {
  const [filter, setFilter] = useState('todos');
  const [fabOpen, setFabOpen] = useState(false);

  const movements = [
    ...(partidos || []).map((p) => ({
      id: p.id || `p-${p.rowIndex}-${p.fecha}-${p.liga}`,
      rowIndex: p.rowIndex,
      originalItem: p,
      kind: 'partidos',
      tipo: 'PARTIDO',
      title: `${p.liga || 'UNLA'} ${p.rama || ''}`.trim(),
      subtitle: p.jornada ? `Partido ${p.jornada} • ${p.fecha}` : `Partido • ${p.fecha}`,
      badge: 'Finalizado',
      recaudacion: p.recaudacion,
      pagoArbitro: p.pagoArbitro,
      multasPartido: p.multasPartido,
      amount: p.saldoNeto,
    })),
    ...(multas || []).map((m) => ({
      id: m.id || `m-${m.rowIndex}-${m.jugador}-${m.fecha}`,
      rowIndex: m.rowIndex,
      originalItem: m,
      kind: 'multas',
      tipo: 'MULTA',
      title: `Sanción: ${m.motivo || 'Disciplinaria'}`,
      subtitle: `#${m.dorsal || '--'} ${m.jugador} (${m.rama || 'Femenil'})`,
      badge: 'COBRADA',
      note: m.sede ? `${m.fecha} • ${m.sede}` : `${m.fecha} • Cobrada en cancha`,
      amount: m.monto,
    })),
    ...(gastos || []).map((g) => ({
      id: g.id || `g-${g.rowIndex}-${g.concepto}-${g.fecha}`,
      rowIndex: g.rowIndex,
      originalItem: g,
      kind: 'gastos',
      tipo: 'GASTO',
      title: g.concepto,
      subtitle: `${g.categoria} • ${g.fecha}`,
      badge: 'Gasto',
      note: g.observaciones || 'Egreso operativo registrado',
      amount: -Math.abs(Number(g.monto) || 0),
    })),
  ];

  const filteredMovements = movements.filter((item) => {
    if (filter === 'todos') return true;
    return item.kind === filter;
  });

  return (
    <div className="pb-28">
      <TopAppBar
        subtitle="Temporada 2026-2027 • CECYTEM 33 Capula"
        onRefresh={onRefresh}
        isSyncing={isSyncing}
        syncStatus={syncStatus}
      />

      {/* Technical Staff Subheader Bar */}
      <div className="px-margin-mobile pt-3 pb-1 flex items-center justify-between max-w-md mx-auto">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary-fixed-dim text-sm">
            sports_soccer
          </span>
          <span className="font-label-md text-label-md text-on-surface-variant tracking-wider">
            PANEL TÉCNICO
          </span>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-surface-container-highest text-primary font-label-md text-label-md font-semibold border border-primary-container/20">
          D.T. Luis M. Martínez
        </span>
      </div>

      <main className="px-margin-mobile flex flex-col gap-space-md mt-2 max-w-md mx-auto">
        {/* Tarjeta Principal Destacada (Hero Card) */}
        <section className="hero-glow-card rounded-xl p-space-md relative overflow-hidden">
          {/* Watermark Oficial Logo */}
          <div className="absolute -right-4 -bottom-4 w-28 h-28 opacity-15 pointer-events-none">
            <img
              alt="Halcones 33 Capula"
              className="w-full h-full object-contain"
              src="./logo.png"
            />
          </div>
          <div className="absolute top-0 right-0 w-24 h-1 bg-gradient-to-l from-primary-container to-transparent" />
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary-container text-base">
                account_balance_wallet
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant tracking-wider font-semibold">
                SALDO NETO DISPONIBLE
              </span>
            </div>
            <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container-highest/80 text-primary-fixed-dim border border-primary-container/30">
              En Caja
            </span>
          </div>
          <div className="my-2">
            <h1 className="font-display-hero-mobile text-display-hero-mobile text-primary tracking-tight font-bold drop-shadow-[0_2px_12px_rgba(77,216,232,0.3)]">
              {formatCurrency(resumen?.saldoNetoDisponible ?? resumen?.saldoNeto ?? 0)}{' '}
              <span className="font-label-lg text-label-lg text-on-surface-variant font-normal">
                MXN
              </span>
            </h1>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-primary-container/15 mt-3">
            <div className="flex items-center gap-1.5 text-tertiary">
              <span className="material-symbols-outlined text-base font-bold">
                trending_up
              </span>
              <span className="font-label-md text-label-md font-bold">
                Sincronizado con Google Sheets
              </span>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Corte: {lastSyncTime}
            </span>
          </div>
        </section>

        {/* Grid de 4 Tarjetas KPI (formato 2x2) */}
        <section className="grid grid-cols-2 gap-space-sm">
          {/* KPI 1: Total Arbitraje */}
          <div
            onClick={() => onNavigate('arbitrajes')}
            className="tactical-glass rounded-xl p-3 flex flex-col justify-between relative group hover:border-primary-container transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant leading-tight">
                Total Arbitraje
              </span>
              <div className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-container border border-primary-container/20">
                <span className="material-symbols-outlined text-base">sports</span>
              </div>
            </div>
            <div className="mt-2.5">
              <p className="font-numeric-stat text-numeric-stat text-primary font-bold tracking-tight">
                {formatCurrency(resumen?.totalArbitraje || 0)}
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                {partidos.length > 0 ? `${partidos.length} partidos registrados` : 'Sin registros'}
              </p>
            </div>
          </div>

          {/* KPI 2: Pago Árbitros */}
          <div
            onClick={() => onNavigate('arbitrajes')}
            className="tactical-glass rounded-xl p-3 flex flex-col justify-between relative group hover:border-primary-container transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant leading-tight">
                Pago Árbitros
              </span>
              <div className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center text-error border border-error/30">
                <span className="material-symbols-outlined text-base">payments</span>
              </div>
            </div>
            <div className="mt-2.5">
              <p className="font-numeric-stat text-numeric-stat text-on-surface font-bold tracking-tight">
                {formatCurrency(resumen?.pagoArbitros || 0)}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container" />
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Liquidado en cancha
                </p>
              </div>
            </div>
          </div>

          {/* KPI 3: Total Multas */}
          <div
            onClick={() => onNavigate('multas')}
            className="tactical-glass rounded-xl p-3 flex flex-col justify-between relative group hover:border-secondary transition-colors border-secondary-container/30 cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant leading-tight">
                Total Multas
              </span>
              <div className="w-7 h-7 rounded-lg bg-secondary-container/40 flex items-center justify-center text-secondary border border-secondary/30">
                <span className="material-symbols-outlined text-base">warning</span>
              </div>
            </div>
            <div className="mt-2.5">
              <p className="font-numeric-stat text-numeric-stat text-secondary font-bold tracking-tight">
                {formatCurrency(resumen?.totalMultas || 0)}
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                {multas.length > 0 ? `${multas.length} sanciones registradas` : 'Sin registros'}
              </p>
            </div>
          </div>

          {/* KPI 4: Gastos Operativos */}
          <div
            onClick={() => onNavigate('gastos')}
            className="tactical-glass rounded-xl p-3 flex flex-col justify-between relative group hover:border-primary-container transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant leading-tight">
                Gastos Operativos
              </span>
              <div className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface-variant border border-outline-variant/30">
                <span className="material-symbols-outlined text-base">inventory_2</span>
              </div>
            </div>
            <div className="mt-2.5">
              <p className="font-numeric-stat text-numeric-stat text-on-surface font-bold tracking-tight">
                {formatCurrency(resumen?.gastosOperativos || 0)}
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                {gastos.length > 0 ? `${gastos.length} egresos registrados` : 'Sin registros'}
              </p>
            </div>
          </div>
        </section>

        {/* Sección Inferior - Últimos Movimientos */}
        <section className="mt-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary-container text-xl">
                receipt_long
              </span>
              Últimos Movimientos
            </h2>
            <span className="font-label-sm text-label-sm text-primary-container font-semibold">
              Temporada Activa
            </span>
          </div>

          {/* Filtro Rápido */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'partidos', label: 'Partidos' },
              { id: 'multas', label: 'Multas' },
              { id: 'gastos', label: 'Gastos' },
            ].map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg font-label-md text-label-md transition-all active:scale-95 ${
                    active
                      ? 'bg-primary-container text-on-primary-container font-bold shadow-sm shadow-primary-container/20'
                      : 'bg-surface-container-high text-on-surface-variant border border-outline-variant/30'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Lista de Movimientos o Estado Vacío */}
          {filteredMovements.length === 0 ? (
            <div className="tactical-glass rounded-xl p-8 text-center flex flex-col items-center justify-center gap-2 border border-outline-variant/20">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
                inbox
              </span>
              <p className="text-body-md font-body-md text-on-surface-variant font-medium">
                Sin registros
              </p>
              <span className="text-label-sm font-label-sm text-outline">
                No hay movimientos registrados en este filtro ($0.00)
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filteredMovements.map((mov) => {
                if (mov.kind === 'partidos') {
                  return (
                    <article
                      key={mov.id}
                      className="tactical-glass rounded-xl p-3.5 hover:bg-surface-container-high/60 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary-container border border-primary-container/20 shrink-0">
                            <span className="material-symbols-outlined">sports</span>
                          </div>
                          <div>
                            <h3 className="font-body-lg text-body-lg text-on-surface font-bold leading-tight">
                              {mov.title}
                            </h3>
                            <p className="font-body-sm text-body-sm text-on-surface-variant">
                              {mov.subtitle}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            title="Editar partido"
                            onClick={() => onEditItem('PARTIDO', mov.originalItem)}
                            className="p-1.5 rounded-lg bg-surface-container-high hover:bg-primary-container hover:text-on-primary-container text-primary transition-colors flex items-center justify-center cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            type="button"
                            title="Borrar partido"
                            onClick={() => onDeleteItem({ tipo: 'PARTIDO', rowIndex: mov.rowIndex })}
                            className="p-1.5 rounded-lg bg-surface-container-high hover:bg-error hover:text-on-error text-error transition-colors flex items-center justify-center cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-body-sm text-on-surface-variant">
                        <div className="flex gap-2 font-label-sm text-label-sm">
                          <span>
                            Arb: <strong className="text-on-surface">${mov.recaudacion}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Pago: <strong className="text-on-surface">${mov.pagoArbitro}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Multa:{' '}
                            <strong className="text-secondary">${mov.multasPartido}</strong>
                          </span>
                        </div>
                        <div
                          className={`font-numeric-stat text-numeric-stat font-bold tracking-tight ${
                            mov.amount >= 0 ? 'text-tertiary' : 'text-error'
                          }`}
                        >
                          {mov.amount >= 0 ? '+' : ''}
                          {formatCurrency(mov.amount)}{' '}
                          <span className="font-label-sm text-label-sm">MXN</span>
                        </div>
                      </div>
                    </article>
                  );
                }

                if (mov.kind === 'multas') {
                  return (
                    <article
                      key={mov.id}
                      className="tactical-glass rounded-xl p-3.5 hover:bg-surface-container-high/60 transition-colors border-primary-container/20"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary-container border border-primary-container/20 shrink-0">
                            <span className="material-symbols-outlined">gavel</span>
                          </div>
                          <div>
                            <h3 className="font-body-lg text-body-lg text-on-surface font-bold leading-tight">
                              {mov.title}
                            </h3>
                            <p className="font-body-sm text-body-sm text-on-surface-variant font-medium">
                              {mov.subtitle}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary font-label-sm text-label-sm font-semibold border border-tertiary/20">
                            {mov.badge}
                          </span>
                          <button
                            type="button"
                            title="Editar sanción"
                            onClick={() => onEditItem('MULTA', mov.originalItem)}
                            className="p-1.5 rounded-lg bg-surface-container-high hover:bg-primary-container hover:text-on-primary-container text-primary transition-colors flex items-center justify-center cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            type="button"
                            title="Borrar sanción"
                            onClick={() => onDeleteItem({ tipo: 'MULTA', rowIndex: mov.rowIndex })}
                            className="p-1.5 rounded-lg bg-surface-container-high hover:bg-error hover:text-on-error text-error transition-colors flex items-center justify-center cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-body-sm">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {mov.note}
                        </span>
                        <div className="font-numeric-stat text-numeric-stat text-tertiary font-bold tracking-tight">
                          +{formatCurrency(mov.amount)}{' '}
                          <span className="font-label-sm text-label-sm">MXN</span>
                        </div>
                      </div>
                    </article>
                  );
                }

                return (
                  <article
                    key={mov.id}
                    className="tactical-glass rounded-xl p-3.5 hover:bg-surface-container-high/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary-container border border-primary-container/20 shrink-0">
                          <span className="material-symbols-outlined">inventory_2</span>
                        </div>
                        <div>
                          <h3 className="font-body-lg text-body-lg text-on-surface font-bold leading-tight">
                            {mov.title}
                          </h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            {mov.subtitle}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          title="Editar gasto"
                          onClick={() => onEditItem('GASTO', mov.originalItem)}
                          className="p-1.5 rounded-lg bg-surface-container-high hover:bg-primary-container hover:text-on-primary-container text-primary transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          type="button"
                          title="Borrar gasto"
                          onClick={() => onDeleteItem({ tipo: 'GASTO', rowIndex: mov.rowIndex })}
                          className="p-1.5 rounded-lg bg-surface-container-high hover:bg-error hover:text-on-error text-error transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-body-sm">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        {mov.note}
                      </span>
                      <div className="font-numeric-stat text-numeric-stat text-error font-bold tracking-tight">
                        {formatCurrency(mov.amount)}{' '}
                        <span className="font-label-sm text-label-sm">MXN</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Botón Flotante de Acción Rápida (FAB) */}
      <aside className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2">
        {fabOpen && (
          <div className="tactical-glass rounded-xl p-2 flex flex-col gap-1.5 shadow-xl border border-primary-container/40 mb-1">
            <button
              type="button"
              onClick={() => {
                setFabOpen(false);
                onNavigate('arbitrajes');
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-high hover:bg-primary-container hover:text-on-primary-container text-on-surface font-label-md text-label-md transition-colors text-left"
            >
              <span className="material-symbols-outlined text-base">sports</span>
              Registrar Partido
            </button>
            <button
              type="button"
              onClick={() => {
                setFabOpen(false);
                onNavigate('multas');
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-high hover:bg-secondary-container hover:text-on-secondary-container text-on-surface font-label-md text-label-md transition-colors text-left"
            >
              <span className="material-symbols-outlined text-base text-secondary">
                warning
              </span>
              Registrar Multa
            </button>
            <button
              type="button"
              onClick={() => {
                setFabOpen(false);
                onNavigate('gastos');
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-high hover:bg-primary-container hover:text-on-primary-container text-on-surface font-label-md text-label-md transition-colors text-left"
            >
              <span className="material-symbols-outlined text-base">inventory_2</span>
              Registrar Gasto
            </button>
          </div>
        )}
        <button
          aria-label="Registro rápido en cancha"
          type="button"
          onClick={() => setFabOpen((prev) => !prev)}
          className="w-14 h-14 rounded-full bg-[#FF7043] text-surface-container-lowest fab-shadow flex items-center justify-center active:scale-90 transition-all duration-150 hover:brightness-110"
        >
          <span className="material-symbols-outlined text-3xl font-bold">
            {fabOpen ? 'close' : 'add'}
          </span>
        </button>
      </aside>
    </div>
  );
}
