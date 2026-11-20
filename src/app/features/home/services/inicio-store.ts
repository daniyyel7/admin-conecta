import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { aApiError } from '../../../core/api/api-error';
import { Evento } from '../../eventos/models/evento';

/** Máximo de eventos en el Inicio de la app (lo valida también la API). */
export const MAX_EVENTOS_INICIO = 5;

/**
 * Eventos elegidos para el Inicio de la app (`GET /home` → `events`), en su orden.
 * API: `GET` y `PUT /admin/inicio/eventos` (el PUT reemplaza la selección completa).
 */
@Injectable({ providedIn: 'root' })
export class InicioStore {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/inicio/eventos`;

  private readonly _seleccion = signal<Evento[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  /** Lo que está guardado en la API. */
  readonly seleccion = this._seleccion.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  load(): void {
    this._loading.set(true);
    this._error.set(null);
    this.http.get<Evento[]>(this.api).subscribe({
      next: (eventos) => {
        this._seleccion.set(eventos);
        this._loading.set(false);
      },
      error: (e: unknown) => {
        this._error.set(aApiError(e, 'No se pudieron cargar los eventos del Inicio.').message);
        this._loading.set(false);
      },
    });
  }

  /** Guarda la selección en este orden (la posición en la lista es el orden en la app). */
  guardar(ids: string[]): Observable<Evento[]> {
    return this.http.put<Evento[]>(this.api, { ids }).pipe(
      tap((eventos) => this._seleccion.set(eventos)),
      catchError((e) => throwError(() => aApiError(e, 'No se pudo guardar el Inicio.'))),
    );
  }
}
