/**
 * Módulo de Torneos y Calendario - Club Halcones CECYTEM 33 Capula
 * Gestión de fixture, ligas activas (UNLA, Liga Municipal),
 * roles de juego, jornadas y tabla general de posiciones.
 */

export const LIGAS_ACTIVAS = [
  { id: 'UNLA', nombre: 'Liga Universitaria UNLA', arbiDefault: 175 },
  { id: 'Liga Municipal', nombre: 'Liga Municipal de Fútbol', arbiDefault: 125 },
];

export function getUpcomingMatches(matches = []) {
  const today = new Date().toISOString().split('T')[0];
  return matches
    .filter((m) => m.fecha >= today)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export { default as PizarraScreen } from '../alineaciones/PizarraScreen';

