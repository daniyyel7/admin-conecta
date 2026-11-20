import { Injectable, computed, signal } from '@angular/core';
import { Observable, delay, map, of, tap, timer } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { ESTADO_LABEL } from '../../eventos/models/evento';
import { simularEstadoApi } from '../../eventos/services/eventos-store';
import {
  Collection,
  CollectionInput,
  Resource,
  ResourceInput,
  contarArchivos,
} from '../models/recurso';
import { COLECCIONES_MOCK } from './colecciones.mock';

/** Progreso de una subida: `progress` 0-100 y, al terminar, la `url` del archivo. */
export interface UploadProgress {
  progress: number;
  url?: string;
}

/**
 * Colecciones de recursos y sus recursos.
 * TODO: cambiar los `of(...)` por la API, p. ej.
 *   list()                    → GET    /recursos            (responde { allEvents: Collection[] })
 *   createCollection(d)       → POST   /recursos
 *   updateCollection(id, d)   → PUT    /recursos/:id
 *   removeCollection(id)      → DELETE /recursos/:id
 *   addResource(cid, d)       → POST   /recursos/:cid/resources
 *   updateResource(cid,id,d)  → PUT    /recursos/:cid/resources/:id
 *   removeResource(cid, id)   → DELETE /recursos/:cid/resources/:id
 *   upload(file)              → POST   /uploads (multipart, con reportProgress) → { url }
 */
@Injectable({ providedIn: 'root' })
export class ColeccionesStore {
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
    of(structuredClone(COLECCIONES_MOCK))
      .pipe(delay(400))
      .subscribe({
        next: (items) => {
          this._items.set(items);
          this.loaded = true;
          this._loading.set(false);
        },
        error: () => {
          this._error.set('No se pudieron cargar los recursos.');
          this._loading.set(false);
        },
      });
  }

  getById(id: string): Collection | undefined {
    return this._items().find((c) => c.id === id);
  }

  // ---------- Colecciones ----------

  createCollection(data: CollectionInput): Observable<Collection> {
    const id = this.nextId(this._items().map((c) => c.id));
    const nueva: Collection = {
      ...data,
      id,
      status: this.statusFor(data.date),
      link: `/recursos/${id}`,
      numberReources: contarArchivos(0),
      resources: [],
    };
    return of(nueva).pipe(
      delay(400),
      tap(() => this._items.update((list) => [nueva, ...list])),
    );
  }

  updateCollection(id: string, data: CollectionInput): Observable<Collection> {
    const actual = this.require(id);
    const status = this.statusFor(data.date, actual.status);
    const actualizada: Collection = {
      ...actual,
      ...data,
      status,
      // Los recursos heredan los datos de su colección.
      resources: actual.resources.map((r) => ({
        ...r,
        status,
        category: data.category,
        apartment: data.apartment,
        date: data.date,
      })),
    };
    return of(actualizada).pipe(delay(400), tap(() => this.replace(actualizada)));
  }

  setCollectionVisible(id: string, visible: boolean): Observable<Collection> {
    const actualizada = { ...this.require(id), visible };
    return of(actualizada).pipe(delay(200), tap(() => this.replace(actualizada)));
  }

  removeCollection(id: string): Observable<void> {
    return of(undefined).pipe(
      delay(300),
      tap(() => this._items.update((list) => list.filter((c) => c.id !== id))),
    );
  }

  // ---------- Recursos ----------

  addResource(collectionId: string, data: ResourceInput): Observable<Resource> {
    const col = this.require(collectionId);
    const recurso: Resource = {
      ...data,
      id: `${col.id}-${this.nextId(col.resources.map((r) => r.id.split('-').pop() ?? '0'))}`,
      status: col.status,
      category: col.category,
      apartment: col.apartment,
      date: col.date,
    };
    return of(recurso).pipe(
      delay(300),
      tap(() => this.setResources(col, [...col.resources, recurso])),
    );
  }

  updateResource(collectionId: string, resourceId: string, data: ResourceInput): Observable<Resource> {
    const col = this.require(collectionId);
    const actual = col.resources.find((r) => r.id === resourceId);
    if (!actual) throw new Error(`Recurso ${resourceId} no encontrado`);
    const recurso: Resource = { ...actual, ...data };
    return of(recurso).pipe(
      delay(300),
      tap(() => this.setResources(col, col.resources.map((r) => (r.id === resourceId ? recurso : r)))),
    );
  }

  setResourceVisible(collectionId: string, resourceId: string, visible: boolean): Observable<Resource> {
    const actual = this.require(collectionId).resources.find((r) => r.id === resourceId)!;
    return this.updateResource(collectionId, resourceId, { ...actual, visible });
  }

  removeResource(collectionId: string, resourceId: string): Observable<void> {
    const col = this.require(collectionId);
    return of(undefined).pipe(
      delay(300),
      tap(() => this.setResources(col, col.resources.filter((r) => r.id !== resourceId))),
    );
  }

  /** Simula la subida de un archivo con progreso. Devuelve una URL temporal del navegador. */
  upload(file: File): Observable<UploadProgress> {
    const pasos = 10;
    return timer(0, 120).pipe(
      map((i) => Math.min(100, Math.round((i / pasos) * 100))),
      takeWhile((p) => p < 100, true),
      map((progress) =>
        progress < 100 ? { progress } : { progress, url: URL.createObjectURL(file) },
      ),
    );
  }

  // ---------- Internos ----------

  private setResources(col: Collection, resources: Resource[]): void {
    // Toma la versión más reciente de la colección por si cambió mientras tanto.
    const actual = this.getById(col.id) ?? col;
    this.replace({ ...actual, resources, numberReources: contarArchivos(resources.length) });
  }

  private replace(col: Collection): void {
    this._items.update((list) => list.map((c) => (c.id === col.id ? col : c)));
  }

  private require(id: string): Collection {
    const col = this.getById(id);
    if (!col) throw new Error(`Colección ${id} no encontrada`);
    return col;
  }

  private nextId(ids: string[]): string {
    return String(Math.max(0, ...ids.map((x) => Number(x) || 0)) + 1);
  }

  /** Simula el estado que asigna la API según la fecha (un "Cancelado" se mantiene). */
  private statusFor(date: string, actual?: string): string {
    if (actual === ESTADO_LABEL.cancelado) return actual;
    return ESTADO_LABEL[simularEstadoApi({ fechaInicio: date })];
  }
}
