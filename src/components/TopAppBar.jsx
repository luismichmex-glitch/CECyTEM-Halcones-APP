import React from 'react';

export default function TopAppBar({
  subtitle = 'Temporada 2026-2027 • CECYTEM 33 Capula',
  onRefresh,
  isSyncing = false,
  syncStatus = 'online',
}) {
  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 shadow-md w-full">
      <div className="flex justify-between items-center w-full px-margin-mobile py-space-sm h-16 max-w-md mx-auto">
        <div className="flex items-center gap-2.5">
          {/* Escudo oficial completo sin recortar en círculo */}
          <img
            alt="Halcones CECYTEM 33 Capula"
            className="w-11 h-11 object-contain shrink-0 drop-shadow-[0_2px_8px_rgba(77,216,232,0.35)]"
            src="./logo.png"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-headline-sm text-headline-sm text-primary tracking-tight leading-none font-bold">
                Club Halcones
              </span>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant tracking-wide mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high border border-outline-variant/40">
            <span
              className={`w-2 h-2 rounded-full ${
                isSyncing
                  ? 'bg-primary animate-ping'
                  : syncStatus === 'live'
                  ? 'bg-tertiary-container animate-pulse'
                  : 'bg-primary-container'
              }`}
            />
            <span className="font-label-sm text-label-sm text-tertiary font-semibold tracking-wider">
              {isSyncing ? 'Sync...' : syncStatus === 'live' ? 'Sheets Live' : 'Online'}
            </span>
          </div>
          <button
            aria-label="Sincronizar datos con Google Sheets"
            onClick={onRefresh}
            disabled={isSyncing}
            title="Refrescar desde Google Sheets"
            type="button"
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-surface-container text-primary hover:text-primary-fixed active:scale-95 transition-transform duration-150 border border-outline-variant/40 disabled:opacity-60"
          >
            <span
              className={`material-symbols-outlined text-[20px] ${
                isSyncing ? 'animate-spin' : ''
              }`}
            >
              sync
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
