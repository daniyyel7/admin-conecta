import { Departamento, departamentoPorId } from '../../../core/catalogos/departamentos';

// Reexportados para no cambiar los imports existentes de la sección de eventos.
export { DEPARTAMENTOS, type Departamento } from '../../../core/catalogos/departamentos';
export { formatFecha, normalizar } from '../../../shared/format';

/**
 * Lo asigna la API: `proximo`, `en-curso` y `finalizado` según las fechas;
 * `cancelado` cuando un administrador cancela el evento.
 */
export type EstadoEvento = 'en-curso' | 'proximo' | 'finalizado' | 'cancelado';

export interface Evento {
  /** p. ej. "EVT-2026-105" */
  id: string;
  nombre: string;
  /** Etiquetas cortas que se muestran después del ID, p. ej. ["Convivencia & Oración"]. */
  etiquetas: string[];
  departamentoId: string;
  estado: EstadoEvento;
  /** Fecha ISO (yyyy-mm-dd). */
  fechaInicio: string;
  fechaFin?: string;
  ubicacion: string;
  descripcion?: string;
  /** URL de la imagen de portada; si falta se muestra una miniatura generada. */
  imagen?: string;
}

/** Datos que se envían al crear o editar (el ID y el estado los asigna la API). */
export type EventoInput = Omit<Evento, 'id' | 'estado'>;

/** Solo se pueden cancelar eventos que aún no terminan. */
export function sePuedeCancelar(evento: Pick<Evento, 'estado'>): boolean {
  return evento.estado === 'proximo' || evento.estado === 'en-curso';
}

export const ESTADOS: { id: EstadoEvento; label: string }[] = [
  { id: 'en-curso', label: 'En curso' },
  { id: 'proximo', label: 'Próximo' },
  { id: 'finalizado', label: 'Finalizado' },
  { id: 'cancelado', label: 'Cancelado' },
];

export const ESTADO_LABEL: Record<EstadoEvento, string> = Object.fromEntries(
  ESTADOS.map((e) => [e.id, e.label]),
) as Record<EstadoEvento, string>;

export function departamentoDe(evento: Pick<Evento, 'departamentoId'>): Departamento {
  return departamentoPorId(evento.departamentoId);
}
