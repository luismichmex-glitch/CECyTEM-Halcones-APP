/**
 * Módulo de Plantilla - Club Halcones CECYTEM 33 Capula
 * Gestión de plantilla de jugadores (Femenil y Varonil), dorsales,
 * posiciones técnicas, altas/bajas y fichas de registro oficial.
 */

export const RAMAS = {
  FEMENIL: 'Femenil',
  VARONIL: 'Varonil',
};

export const POSICIONES = [
  'Portero',
  'Defensa Central',
  'Lateral Derecho',
  'Lateral Izquierdo',
  'Mediocentro Defensivo',
  'Mediocentro Ofensivo',
  'Extremo Derecho',
  'Extremo Izquierdo',
  'Delantero Centro',
  'Segundo Delantero',
];

export function filterRosterByRama(plantilla, rama = RAMAS.FEMENIL) {
  if (!plantilla) return [];
  if (Array.isArray(plantilla)) {
    return plantilla.filter(
      (p) => (p.rama || '').toLowerCase() === rama.toLowerCase()
    );
  }
  return plantilla[rama] || [];
}
