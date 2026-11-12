import React, { useState, useEffect, useCallback } from 'react';
import BottomNavBar from './components/BottomNavBar';
import {
  DashboardScreen,
  ArbitrajesScreen,
  MultasScreen,
  GastosScreen,
  INITIAL_STATE,
  fetchHalconesData,
  postHalconesRecord,
} from './modules/finanzas';
import { PlantillaScreen } from './modules/plantilla';
import { PizarraScreen } from './modules/alineaciones';


const STORAGE_KEY = 'halcones_cecytem33_finanzas_v2';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingItem, setEditingItem] = useState(null);

  const [appState, setAppState] = useState(() => {
    try {
      localStorage.removeItem('halcones_cecytem33_finanzas_v1');
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          resumen: { ...INITIAL_STATE.resumen, ...parsed.resumen },
          plantilla: parsed.plantilla || INITIAL_STATE.plantilla,
          partidos: Array.isArray(parsed.partidos) ? parsed.partidos : [],
          multas: Array.isArray(parsed.multas) ? parsed.multas : [],
          gastos: Array.isArray(parsed.gastos) ? parsed.gastos : [],
        };
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_STATE;
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('online');
  const [lastSyncTime, setLastSyncTime] = useState(() =>
    new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  );
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, tone = 'cyan') => {
    setToast({ message, tone });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3200);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch {
      // ignore
    }
  }, [appState]);

  const handleRefresh = useCallback(
    async (silent = false) => {
      setIsSyncing(true);
      try {
        const remote = await fetchHalconesData();
        setAppState({
          resumen: remote.resumen || INITIAL_STATE.resumen,
          plantilla: remote.plantilla || INITIAL_STATE.plantilla,
          partidos: remote.partidos || [],
          multas: remote.multas || [],
          gastos: remote.gastos || [],
        });
        setSyncStatus('live');
        setLastSyncTime(
          new Date().toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
          })
        );
        if (!silent) {
          showToast('Datos sincronizados con Google Sheets', 'emerald');
        }
      } catch (err) {
        setSyncStatus('online');
        setLastSyncTime(
          new Date().toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
          })
        );
        if (!silent) {
          showToast('Error al conectar con Google Sheets', 'coral');
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [showToast]
  );

  // Al abrir la app, sincronizar directamente con Google Sheets
  useEffect(() => {
    handleRefresh(true);
  }, [handleRefresh]);

  const handleStartEdit = (tipo, item) => {
    setEditingItem({ tipo, data: item });
    if (tipo === 'PARTIDO') setActiveTab('arbitrajes');
    else if (tipo === 'MULTA') setActiveTab('multas');
    else if (tipo === 'GASTO') setActiveTab('gastos');
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  const handleSavePartido = async (payload) => {
    setIsSyncing(true);
    try {
      await postHalconesRecord({
        ...payload,
        tipo: 'PARTIDO',
        accion: payload.accion || (payload.rowIndex != null ? 'EDITAR' : 'CREAR'),
      });
      setEditingItem(null);
      showToast(
        payload.accion === 'EDITAR'
          ? 'Partido actualizado en Google Sheets'
          : 'Partido registrado en Google Sheets',
        'emerald'
      );
      await handleRefresh(true);
    } catch (err) {
      showToast('Error al guardar partido', 'coral');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveMulta = async (payload) => {
    setIsSyncing(true);
    try {
      await postHalconesRecord({
        ...payload,
        tipo: 'MULTA',
        accion: payload.accion || (payload.rowIndex != null ? 'EDITAR' : 'CREAR'),
      });
      setEditingItem(null);
      showToast(
        payload.accion === 'EDITAR'
          ? 'Multa actualizada en Google Sheets'
          : 'Multa registrada en Google Sheets',
        'coral'
      );
      await handleRefresh(true);
    } catch (err) {
      showToast('Error al guardar multa', 'coral');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveGasto = async (payload) => {
    setIsSyncing(true);
    try {
      const accion = payload.accion || (payload.rowIndex != null ? 'EDITAR' : 'CREAR');
      await postHalconesRecord({
        tipo: 'GASTO',
        accion,
        ...(payload.rowIndex != null ? { rowIndex: payload.rowIndex } : {}),
        fecha: payload.fecha,
        concepto: payload.concepto,
        categoria: payload.categoria,
        monto: payload.monto,
        observaciones: payload.observaciones,
      });
      setEditingItem(null);
      showToast(
        accion === 'EDITAR'
          ? 'Gasto actualizado en Google Sheets'
          : 'Gasto registrado en Google Sheets',
        'emerald'
      );
      await handleRefresh(true);
    } catch (err) {
      showToast('Error al guardar gasto', 'coral');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteRecord = async ({ tipo, rowIndex }) => {
    if (rowIndex == null) {
      showToast('No se puede borrar: sin identificador de fila (rowIndex)', 'coral');
      return;
    }
    const confirmed = window.confirm('¿Seguro que deseas borrar este registro?');
    if (!confirmed) return;

    setIsSyncing(true);
    try {
      await postHalconesRecord({
        tipo,
        accion: 'BORRAR',
        rowIndex,
      });
      showToast(`Registro eliminado de Google Sheets`, 'emerald');
      await handleRefresh(true);
    } catch (err) {
      showToast('Error al borrar registro', 'coral');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface relative">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full tactical-glass border border-primary-container/50 shadow-xl flex items-center gap-2 max-w-[90vw]">
          <span
            className={`w-2 h-2 rounded-full ${
              toast.tone === 'coral'
                ? 'bg-secondary'
                : toast.tone === 'emerald'
                ? 'bg-tertiary'
                : 'bg-primary'
            }`}
          />
          <span className="font-label-md text-label-md text-on-surface whitespace-nowrap">
            {toast.message}
          </span>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <DashboardScreen
          resumen={appState.resumen}
          partidos={appState.partidos}
          multas={appState.multas}
          gastos={appState.gastos}
          lastSyncTime={lastSyncTime}
          isSyncing={isSyncing}
          syncStatus={syncStatus}
          onRefresh={() => handleRefresh(false)}
          onNavigate={setActiveTab}
          onEditItem={handleStartEdit}
          onDeleteItem={handleDeleteRecord}
        />
      )}

      {activeTab === 'arbitrajes' && (
        <ArbitrajesScreen
          partidos={appState.partidos}
          multas={appState.multas}
          onSavePartido={handleSavePartido}
          onRefresh={() => handleRefresh(false)}
          isSyncing={isSyncing}
          syncStatus={syncStatus}
          editingItem={editingItem?.tipo === 'PARTIDO' ? editingItem.data : null}
          onCancelEdit={handleCancelEdit}
          onEditItem={(item) => handleStartEdit('PARTIDO', item)}
          onDeleteItem={(rowIndex) => handleDeleteRecord({ tipo: 'PARTIDO', rowIndex })}
        />
      )}

      {activeTab === 'multas' && (
        <MultasScreen
          plantilla={appState.plantilla}
          multas={appState.multas}
          totalMultas={appState.resumen.totalMultas}
          onSaveMulta={handleSaveMulta}
          onRefresh={() => handleRefresh(false)}
          isSyncing={isSyncing}
          syncStatus={syncStatus}
          editingItem={editingItem?.tipo === 'MULTA' ? editingItem.data : null}
          onCancelEdit={handleCancelEdit}
          onEditItem={(item) => handleStartEdit('MULTA', item)}
          onDeleteItem={(rowIndex) => handleDeleteRecord({ tipo: 'MULTA', rowIndex })}
        />
      )}

      {activeTab === 'gastos' && (
        <GastosScreen
          gastos={appState.gastos}
          gastosOperativos={appState.resumen.gastosOperativos}
          onSaveGasto={handleSaveGasto}
          onRefresh={() => handleRefresh(false)}
          isSyncing={isSyncing}
          syncStatus={syncStatus}
          editingItem={editingItem?.tipo === 'GASTO' ? editingItem.data : null}
          onCancelEdit={handleCancelEdit}
          onEditItem={(item) => handleStartEdit('GASTO', item)}
          onDeleteItem={(rowIndex) => handleDeleteRecord({ tipo: 'GASTO', rowIndex })}
        />
      )}

      {activeTab === 'plantilla' && (
        <PlantillaScreen
          plantilla={appState.plantilla}
          onRefreshGlobal={() => handleRefresh(false)}
          isSyncingGlobal={isSyncing}
          syncStatus={syncStatus}
        />
      )}

      {activeTab === 'pizarra' && (
        <PizarraScreen
          onRefreshGlobal={() => handleRefresh(false)}
          isSyncingGlobal={isSyncing}
          syncStatus={syncStatus}
        />
      )}

      <BottomNavBar activeTab={activeTab} onChangeTab={setActiveTab} />
    </div>
  );
}
