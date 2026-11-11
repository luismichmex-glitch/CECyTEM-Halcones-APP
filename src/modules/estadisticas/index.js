/**
 * Módulo de Estadísticas - Club Halcones CECYTEM 33 Capula
 * Tabla de goleo individual, asistencias, control de tarjetas disciplinarias
 * (amarillas / rojas) y minutos disputados por jornada.
 */

export const METRICAS_DISPONIBLES = [
  { id: 'goles', label: 'Goles anotados', icon: 'sports_soccer' },
  { id: 'asistencias', label: 'Asistencias', icon: 'handshake' },
  { id: 'amarillas', label: 'Tarjetas Amarillas', icon: 'style' },
  { id: 'rojas', label: 'Tarjetas Rojas', icon: 'warning' },
  { id: 'minutos', label: 'Minutos jugados', icon: 'timer' },
];

export function computeLeaderboard(records = [], metric = 'goles') {
  const tally = {};
  records.forEach((r) => {
    const key = r.jugadorId || r.jugador || 'Desconocido';
    tally[key] = (tally[key] || 0) + (Number(r[metric]) || 0);
  });
  return Object.entries(tally)
    .map(([jugador, total]) => ({ jugador, total }))
    .sort((a, b) => b.total - a.total);
}
