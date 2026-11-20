import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { aApiError } from '../../../core/api/api-error';
import { EstadoEvento, Evento, EventoInput } from '../models/evento';

/** Lo que manda la API (además de los campos de `Evento`). */
interface EventoApi extends Evento {
  categoriaId?: string | null;
  visible?: boolean;
  motivoCancelacion?: string | null;
}

/**
 * Estado de la lista de eventos contra la API (sección 3 de docs/API-endpoints.md).
 * El `estado` lo calcula la API según las fechas; el panel nunca lo envía.
 */
@Injectable({ providedIn: 'root' })
export class EventosStore {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/eventos`;

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
    this.http.get<EventoApi[]>(this.api).subscribe({
      next: (eventos) => {
        this._eventos.set(eventos.map(normalizar));
        this.loaded = true;
        this._loading.set(false);
      },
      error: (e: unknown) => {
        this._error.set(aApiError(e, 'No se pudieron cargar los eventos.').message);
        this._loading.set(false);
      },
    });
  }

  getById(id: string): Evento | undefined {
    return this._eventos().find((e) => e.id === id);
  }

  /** Crea el evento y lo pone al inicio de la lista. */
  create(data: EventoInput): Observable<Evento> {
    return this.http.post<EventoApi>(this.api, cuerpo(data)).pipe(
      map(normalizar),
      tap((evento) => this._eventos.update((list) => [evento, ...list])),
      catchError((e) => throwError(() => aApiError(e, 'No se pudo crear el evento.'))),
    );
  }

  update(id: string, data: EventoInput): Observable<Evento> {
    return this.http.put<EventoApi>(`${this.api}/${id}`, cuerpo(data)).pipe(
      map(normalizar),
      tap((evento) => this.reemplazar(evento)),
      catchError((e) => throwError(() => aApiError(e, 'No se pudieron guardar los cambios.'))),
    );
  }

  /** Marca el evento como cancelado (no se elimina). */
  cancel(id: string, motivo?: string): Observable<Evento> {
    return this.http.post<EventoApi>(`${this.api}/${id}/cancelar`, motivo ? { motivo } : {}).pipe(
      map(normalizar),
      tap((evento) => this.reemplazar(evento)),
      catchError((e) => throwError(() => aApiError(e, 'No se pudo cancelar el evento.'))),
    );
  }

  /** Borrado lógico en la API: deja de aparecer en el panel y en la app. */
  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`).pipe(
      tap(() => this._eventos.update((list) => list.filter((e) => e.id !== id))),
      catchError((e) => throwError(() => aApiError(e, 'No se pudo eliminar el evento.'))),
    );
  }

  private reemplazar(evento: Evento): void {
    this._eventos.update((list) => list.map((e) => (e.id === evento.id ? evento : e)));
  }
}

/** Solo los campos que acepta la API (rechaza los que no conoce). */
function cuerpo(data: EventoInput) {
  return {
    nombre: data.nombre,
    descripcion: data.descripcion ?? '',
    departamentoId: data.departamentoId,
    fechaInicio: data.fechaInicio,
    fechaFin: data.fechaFin ?? data.fechaInicio,
    ubicacion: data.ubicacion,
    imagen: data.imagen ?? '',
  };
}

function normalizar(e: EventoApi): Evento {
  return {
    id: e.id,
    nombre: e.nombre,
    etiquetas: e.etiquetas ?? [],
    departamentoId: e.departamentoId,
    estado: e.estado,
    fechaInicio: e.fechaInicio,
    fechaFin: e.fechaFin,
    ubicacion: e.ubicacion,
    descripcion: e.descripcion,
    imagen: e.imagen || undefined,
  };
}

/** Estado según las fechas (igual que `estado_evento()` en la API). Útil para vistas previas. */
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
