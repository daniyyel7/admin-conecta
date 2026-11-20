import { normalizar } from '../../shared/format';

export interface Departamento {
  id: string;
  nombre: string;
  /** Color del punto indicador (se ve bien en tema claro y oscuro). */
  color: string;
}

/** Departamentos de la Unión. Compartido por Eventos y Recursos. */
export const DEPARTAMENTOS: Departamento[] = [
  { id: 'evangelismo', nombre: 'Evangelismo / Conquistadores', color: '#f39c1f' },
  { id: 'juvenil', nombre: 'Ministerio Juvenil', color: '#f4a77a' },
  { id: 'escuela-sabatica', nombre: 'Escuela Sabática', color: '#eab308' },
  { id: 'mujer', nombre: 'Ministerio de la Mujer', color: '#e9a8b8' },
  { id: 'personal', nombre: 'Ministerio Personal', color: '#60a5fa' },
  { id: 'mayordomia', nombre: 'Mayordomía Cristiana', color: '#9ca3af' },
  { id: 'infantil', nombre: 'Ministerio Infantil', color: '#a78bfa' },
];

const SIN_DEPARTAMENTO: Departamento = { id: '', nombre: 'Sin departamento', color: '#9ca3af' };

export function departamentoPorId(id: string): Departamento {
  return DEPARTAMENTOS.find((d) => d.id === id) ?? { ...SIN_DEPARTAMENTO, id };
}

/**
 * Busca por nombre sin importar acentos ni mayúsculas (la API de recursos manda el nombre,
 * p. ej. "Escuela sábatica").
 */
export function departamentoPorNombre(nombre: string): Departamento {
  const n = normalizar(nombre);
  return DEPARTAMENTOS.find((d) => normalizar(d.nombre) === n) ?? { ...SIN_DEPARTAMENTO, nombre };
}
