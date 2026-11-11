import React from 'react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid_view' },
  { id: 'arbitrajes', label: 'Arbitrajes', icon: 'sports' },
  { id: 'multas', label: 'Multas', icon: 'warning' },
  { id: 'gastos', label: 'Gastos', icon: 'inventory_2' },
];

export default function BottomNavBar({ activeTab, onChangeTab }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full z-50 flex justify-around items-center h-[68px] px-margin-mobile pb-safe bg-surface/95 backdrop-blur-xl shadow-lg border-t border-outline-variant/30 max-w-md mx-auto">
      {NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChangeTab(item.id)}
            className={`flex flex-col items-center justify-center transition-transform duration-150 active:scale-95 ${
              isActive
                ? "text-primary font-bold relative after:content-[''] after:w-4 after:h-0.5 after:bg-primary after:rounded-full after:mt-1"
                : 'text-on-surface-variant hover:text-primary-fixed'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[24px] ${
                isActive
                  ? 'material-symbols-fill drop-shadow-[0_0_8px_rgba(77,216,232,0.6)]'
                  : ''
              }`}
            >
              {item.icon}
            </span>
            <span className="font-label-sm text-label-sm mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
