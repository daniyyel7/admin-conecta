import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { aApiError } from '../../../core/api/api-error';
import { Aviso, AvisoInput } from '../models/aviso';

/** Orden de la app: más recientes primero y, el mismo día, los importantes antes. */
const ordenar = (lista: Aviso[]) =>
  [...lista].sort(
    (a, b) =>
      b.fecha.localeCompare(a.fecha) ||
      Number(b.importante) - Number(a.importante) ||
      Number(b.id) - Number(a.id),
  );

/** Avisos generales contra la API (`/admin/avisos`). */
@Injectable({ providedIn: 'root' })
export class AvisosStore {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/avisos`;

  private readonly _items = signal<Aviso[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private loaded = false;

  readonly avisos = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly total = computed(() => this._items().length);
  readonly visibles = computed(() => this._items().filter((a) => a.visible).length);
  readonly importantes = computed(() => this._items().filter((a) => a.importante).length);

  load(force = false): void {
    if (this.loaded && !force) return;
    this._loading.set(true);
    this._error.set(null);
    this.http.get<Aviso[]>(this.api).subscribe({
      next: (avisos) => {
        this._items.set(ordenar(avisos));
        this.loaded = true;
        this._loading.set(false);
      },
      error: (e: unknown) => {
        this._error.set(aApiError(e, 'No se pudieron cargar los avisos.').message);
        this._loading.set(false);
      },
    });
  }

  create(data: AvisoInput): Observable<Aviso> {
    return this.http.post<Aviso>(this.api, data).pipe(
      tap((nuevo) => this._items.update((list) => ordenar([nuevo, ...list]))),
      catchError((e) => throwError(() => aApiError(e, 'No se pudo crear el aviso.'))),
    );
  }

  update(id: string, data: AvisoInput): Observable<Aviso> {
    return this.http.put<Aviso>(`${this.api}/${id}`, data).pipe(
      tap((a) => this.replace(a)),
      catchError((e) => throwError(() => aApiError(e, 'No se pudieron guardar los cambios.'))),
    );
  }

  setVisible(id: string, visible: boolean): Observable<Aviso> {
    return this.http.patch<Aviso>(`${this.api}/${id}/visible`, { visible }).pipe(
      tap((a) => this.replace(a)),
      catchError((e) => throwError(() => aApiError(e, 'No se pudo completar la acción.'))),
    );
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`).pipe(
      tap(() => this._items.update((list) => list.filter((a) => a.id !== id))),
      catchError((e) => throwError(() => aApiError(e, 'No se pudo eliminar el aviso.'))),
    );
  }

  private replace(a: Aviso): void {
    this._items.update((list) => ordenar(list.map((x) => (x.id === a.id ? a : x))));
  }
}
