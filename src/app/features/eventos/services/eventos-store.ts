import { Injectable, computed, signal } from '@angular/core';
import { Observable, delay, of, tap } from 'rxjs';
import { EstadoEvento, Evento, EventoInput } from '../models/evento';
import { EVENTOS_MOCK } from './eventos.mock';

/**
 * Estado de la lista de eventos.
 * TODO: cambiar los `of(...)` por llamadas a la API, p. ej.
 *   list()      → this.http.get<Evento[]>(`${apiUrl}/eventos`)
 *   create(d)   → this.http.post<Evento>(`${apiUrl}/eventos`, d)
 *   update(id)  → this.http.put<Evento>(`${apiUrl}/eventos/${id}`, d)
 *   cancel(id)  → this.http.post<Evento>(`${apiUrl}/eventos/${id}/cancelar`, {})
 *   remove(id)  → this.http.delete(`${apiUrl}/eventos/${id}`)
 * El `estado` lo calcula la API según las fechas; el panel nunca lo envía.
 * La imagen de portada debería subirse aparte (multipart) y guardar solo su URL.
 */
@Injectable({ providedIn: 'root' })
export class EventosStore {
  private readonly _eventos = signal<Evento[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private loaded = false;

  readonly eventos = this._eventos.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly total = computed(() => this._eventos().length);
  readonly enCurso = computed(() => this._eventos().filter((e) => e.estado === 'en-curso').length);

  /** Carga la lista una vez (o siempre con `force`). */
  load(force = false): void {
    if (this.loaded && !force) return;
    this._loading.set(true);
    this._error.set(null);
    of(structuredClone(EVENTOS_MOCK))
      .pipe(delay(400))
      .subscribe({
        next: (eventos) => {
          this._eventos.set(eventos);
          this.loaded = true;
          this._loading.set(false);
        },
        error: () => {
          this._error.set('No se pudieron cargar los eventos.');
          this._loading.set(false);
        },
      });
  }

  getById(id: string): Evento | undefined {
    return this._eventos().find((e) => e.id === id);
  }

  /** Crea el evento y lo pone al inicio de la lista. */
  create(data: EventoInput): Observable<Evento> {
    const evento: Evento = {
      ...structuredClone(data),
      id: this.nextId(),
      estado: simularEstadoApi(data),
    };
    return of(evento).pipe(
      delay(500),
      tap(() => this._eventos.update((list) => [evento, ...list])),
    );
  }

  update(id: string, data: EventoInput): Observable<Evento> {
    const actual = this.getById(id);
    const evento: Evento = {
      ...structuredClone(data),
      id,
      // Un evento cancelado sigue cancelado aunque se editen sus datos.
      estado: actual?.estado === 'cancelado' ? 'cancelado' : simularEstadoApi(data),
    };
    return of(evento).pipe(
      delay(500),
      tap(() => this._eventos.update((list) => list.map((e) => (e.id === id ? evento : e)))),
    );
  }

  /** Marca el evento como cancelado (no se elimina). */
  cancel(id: string): Observable<Evento> {
    const actual = this.getById(id);
    if (!actual) throw new Error(`Evento ${id} no encontrado`);
    const evento: Evento = { ...actual, estado: 'cancelado' };
    return of(evento).pipe(
      delay(300),
      tap(() => this._eventos.update((list) => list.map((e) => (e.id === id ? evento : e)))),
    );
  }

  remove(id: string): Observable<void> {
    return of(undefined).pipe(
      delay(300),
      tap(() => this._eventos.update((list) => list.filter((e) => e.id !== id))),
    );
  }

  private nextId(): string {
    const max = Math.max(0, ...this._eventos().map((e) => Number(e.id.split('-').pop()) || 0));
    return `EVT-2026-${String(max + 1).padStart(3, '0')}`;
  }
}

/** Simula lo que hará la API: estado según las fechas del evento y la fecha de hoy. */
export function simularEstadoApi(
  { fechaInicio, fechaFin }: Pick<Evento, 'fechaInicio' | 'fechaFin'>,
  hoy = new Date(),
): EstadoEvento {
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = iso(hoy);
  if (today < fechaInicio) return 'proximo';
  if (today > (fechaFin ?? fechaInicio)) return 'finalizado';
  return 'en-curso';
}
