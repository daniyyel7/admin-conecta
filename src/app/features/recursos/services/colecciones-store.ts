import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { aApiError } from '../../../core/api/api-error';
import { ArchivosService, UploadProgress } from '../../../core/api/archivos';
import {
  Collection,
  CollectionInput,
  Resource,
  ResourceInput,
  contarArchivos,
} from '../models/recurso';

export type { UploadProgress } from '../../../core/api/archivos';

/**
 * Colecciones de recursos y sus recursos contra la API (secciones 5 y 6 de docs/API-endpoints.md).
 * Los ids son los mismos que ve la app: el de la colección y, dentro de ella, el de cada recurso.
 */
@Injectable({ providedIn: 'root' })
export class ColeccionesStore {
  private readonly http = inject(HttpClient);
  private readonly archivos = inject(ArchivosService);
  private readonly api = `${environment.apiUrl}/recursos`;

  private readonly _items = signal<Collection[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private loaded = false;

  readonly colecciones = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly total = computed(() => this._items().length);
  readonly totalRecursos = computed(() =>
    this._items().reduce((n, c) => n + c.resources.length, 0),
  );
  readonly visibles = computed(() => this._items().filter((c) => c.visible).length);

  load(force = false): void {
    if (this.loaded && !force) return;
    this._loading.set(true);
    this._error.set(null);
    this.http.get<{ allEvents: Collection[] }>(this.api).subscribe({
      next: ({ allEvents }) => {
        this._items.set(allEvents);
        this.loaded = true;
        this._loading.set(false);
      },
      error: (e: unknown) => {
        this._error.set(aApiError(e, 'No se pudieron cargar los recursos.').message);
        this._loading.set(false);
      },
    });
  }

  getById(id: string): Collection | undefined {
    return this._items().find((c) => c.id === id);
  }

  // ---------- Colecciones ----------

  createCollection(data: CollectionInput): Observable<Collection> {
    return this.http.post<Collection>(this.api, data).pipe(
      tap((nueva) => this._items.update((list) => [nueva, ...list])),
      catchError((e) => throwError(() => aApiError(e, 'No se pudo crear la colección.'))),
    );
  }

  /** La API devuelve la colección con sus recursos ya actualizados (heredan sus datos). */
  updateCollection(id: string, data: CollectionInput): Observable<Collection> {
    return this.http.put<Collection>(`${this.api}/${id}`, data).pipe(
      tap((c) => this.replace(c)),
      catchError((e) => throwError(() => aApiError(e, 'No se pudieron guardar los cambios.'))),
    );
  }

  setCollectionVisible(id: string, visible: boolean): Observable<Collection> {
    return this.http.patch<Collection>(`${this.api}/${id}/visible`, { visible }).pipe(
      tap((c) => this.replace(c)),
      catchError((e) => throwError(() => aApiError(e, 'No se pudo cambiar la visibilidad.'))),
    );
  }

  /** Borrado lógico de la colección y sus recursos (los archivos se conservan). */
  removeCollection(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`).pipe(
      tap(() => this._items.update((list) => list.filter((c) => c.id !== id))),
      catchError((e) => throwError(() => aApiError(e, 'No se pudo eliminar la colección.'))),
    );
  }

  // ---------- Recursos ----------

  addResource(collectionId: string, data: ResourceInput): Observable<Resource> {
    return this.http.post<Resource>(`${this.api}/${collectionId}/resources`, data).pipe(
      tap((r) => this.setResources(collectionId, (list) => [...list, r])),
      catchError((e) => throwError(() => aApiError(e, 'No se pudo agregar el recurso.'))),
    );
  }

  updateResource(collectionId: string, resourceId: string, data: ResourceInput): Observable<Resource> {
    return this.http
      .put<Resource>(`${this.api}/${collectionId}/resources/${resourceId}`, data)
      .pipe(
        tap((r) => this.setResources(collectionId, (list) => list.map((x) => (x.id === r.id ? r : x)))),
        catchError((e) => throwError(() => aApiError(e, 'No se pudo guardar el recurso.'))),
      );
  }

  setResourceVisible(collectionId: string, resourceId: string, visible: boolean): Observable<Resource> {
    return this.http
      .patch<Resource>(`${this.api}/${collectionId}/resources/${resourceId}/visible`, { visible })
      .pipe(
        tap((r) => this.setResources(collectionId, (list) => list.map((x) => (x.id === r.id ? r : x)))),
        catchError((e) => throwError(() => aApiError(e, 'No se pudo cambiar la visibilidad.'))),
      );
  }

  removeResource(collectionId: string, resourceId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${collectionId}/resources/${resourceId}`).pipe(
      tap(() => this.setResources(collectionId, (list) => list.filter((r) => r.id !== resourceId))),
      catchError((e) => throwError(() => aApiError(e, 'No se pudo eliminar el recurso.'))),
    );
  }

  /** Sube el archivo de un recurso a la carpeta de su colección; al terminar trae la `url`. */
  upload(file: File, tipo: string, coleccionId: string): Observable<UploadProgress> {
    return this.archivos.subir(file, { destino: 'recurso', tipo, coleccion: coleccionId });
  }

  // ---------- Internos ----------

  private setResources(collectionId: string, cambio: (list: Resource[]) => Resource[]): void {
    const col = this.getById(collectionId);
    if (!col) return;
    const resources = cambio(col.resources);
    this.replace({ ...col, resources, numberReources: contarArchivos(resources.length) });
  }

  private replace(col: Collection): void {
    this._items.update((list) => list.map((c) => (c.id === col.id ? col : c)));
  }
}
