import { signal } from '@angular/core';
import { normalizar } from '../../shared/format';

export interface Departamento {
  /** Slug que manda la API (p. ej. "juvenil"). */
  id: string;
  nombre: string;
  /** Color del punto indicador (se ve bien en tema claro y oscuro). */
  color: string;
}

/** Colores para departamentos que no traen uno desde la API. */
const COLORES = ['#f39c1f', '#f4a77a', '#eab308', '#e9a8b8', '#60a5fa', '#9ca3af', '#a78bfa', '#34d399'];

const _departamentos = signal<Departamento[]>([]);

/**
 * Departamentos de la Unión (vienen de `GET /catalogos/departamentos`, los carga
 * `CatalogosStore`). Compartido por Eventos y Recursos. Es una señal: léela con `departamentos()`.
 */
export const departamentos = _departamentos.asReadonly();

export function setDepartamentos(lista: Array<Omit<Departamento, 'color'> & { color?: string | null }>): void {
  _departamentos.set(
    lista.map((d, i) => ({ id: d.id, nombre: d.nombre, color: d.color || COLORES[i % COLORES.length] })),
  );
}

const SIN_DEPARTAMENTO: Departamento = { id: '', nombre: 'Sin departamento', color: '#9ca3af' };

export function departamentoPorId(id: string): Departamento {
  return _departamentos().find((d) => d.id === id) ?? { ...SIN_DEPARTAMENTO, id };
}

/**
 * Busca por nombre sin importar acentos ni mayúsculas (la API de recursos manda el nombre,
 * p. ej. "Escuela Sabática").
 */
export function departamentoPorNombre(nombre: string): Departamento {
  const n = normalizar(nombre);
  return _departamentos().find((d) => normalizar(d.nombre) === n) ?? { ...SIN_DEPARTAMENTO, nombre };
}
