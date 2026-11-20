import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { setDepartamentos } from './departamentos';

export interface Categoria {
  id: string;
  nombre: string;
}

/** Formatos y tamaño máximo de cada tipo de recurso (`GET /catalogos/tipos-recurso`). */
export interface LimiteTipo {
  type: string;
  label: string;
  mode: 'file' | 'url' | 'file-or-url';
  accept?: string;
  formats?: string;
  maxMb?: number;
}

/**
 * Listas desplegables que vienen de la API. Se cargan una vez al entrar al panel (shell).
 * Los departamentos quedan en la señal global `departamentos` (core/catalogos/departamentos).
 */
@Injectable({ providedIn: 'root' })
export class CatalogosStore {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/catalogos`;
  private cargado = false;

  private readonly _categorias = signal<Categoria[]>([]);
  private readonly _tipos = signal<LimiteTipo[]>([]);
  private readonly _error = signal<string | null>(null);

  readonly categorias = this._categorias.asReadonly();
  readonly tipos = this._tipos.asReadonly();
  readonly error = this._error.asReadonly();

  load(force = false): void {
    if (this.cargado && !force) return;
    this.cargado = true;
    forkJoin({
      departamentos: this.http.get<{ id: string; nombre: string; color?: string; activo: boolean }[]>(
        `${this.api}/departamentos`,
      ),
      categorias: this.http.get<Categoria[]>(`${this.api}/categorias-recursos`),
      tipos: this.http.get<LimiteTipo[]>(`${this.api}/tipos-recurso`),
    }).subscribe({
      next: ({ departamentos, categorias, tipos }) => {
        setDepartamentos(departamentos.filter((d) => d.activo));
        this._categorias.set(categorias);
        this._tipos.set(tipos);
        this._error.set(null);
      },
      error: () => {
        this.cargado = false;
        this._error.set('No se pudieron cargar los catálogos.');
      },
    });
  }

  /** Límites del tipo (o `undefined` si aún no cargan; el panel usa los suyos). */
  limite(type: string): LimiteTipo | undefined {
    return this._tipos().find((t) => t.type === type);
  }
}
