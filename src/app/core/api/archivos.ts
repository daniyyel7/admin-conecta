import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Auth } from '../auth/auth';
import { ApiError } from './api-error';

/** Progreso de una subida: `progress` 0-100 y, al terminar, la `url` del archivo. */
export interface UploadProgress {
  progress: number;
  url?: string;
}

/** Dónde se guarda el archivo (la API aplica los límites de cada tipo). */
export type DestinoArchivo =
  | { destino: 'evento-portada' }
  | { destino: 'recurso'; tipo: string; coleccion: string }
  | { destino: 'recurso-portada'; coleccion: string };

interface RespuestaSubida {
  url: string;
  nombre: string;
  tamano: number;
  mimeType: string;
}

/**
 * Subida de archivos a `POST /archivos` (sección 4.1).
 *
 * Usa XMLHttpRequest y no HttpClient porque el backend `fetch` de Angular no informa el
 * progreso de las subidas (el panel muestra una barra). Por eso agrega el token a mano y,
 * si la sesión venció (401), la renueva y reintenta una vez.
 */
@Injectable({ providedIn: 'root' })
export class ArchivosService {
  private readonly auth = inject(Auth);

  subir(file: File, destino: DestinoArchivo): Observable<UploadProgress> {
    const params = new URLSearchParams(destino as Record<string, string>);
    const url = `${environment.apiUrl}/archivos?${params}`;
    return this.enviar(url, file, this.auth.accessToken()).pipe(
      catchError((error: unknown) => {
        if (!(error instanceof ApiError) || error.status !== 401) return throwError(() => error);
        return this.auth.refresh().pipe(
          switchMap((token) => (token ? this.enviar(url, file, token) : throwError(() => error))),
        );
      }),
    );
  }

  private enviar(url: string, file: File, token: string | null): Observable<UploadProgress> {
    if (typeof XMLHttpRequest === 'undefined') return of({ progress: 0 });
    return new Observable<UploadProgress>((subscriber) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.responseType = 'json';

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          // 99 como máximo hasta que el servidor confirme que lo guardó.
          subscriber.next({ progress: Math.min(99, Math.round((e.loaded / e.total) * 100)) });
        }
      };
      xhr.onload = () => {
        const body = (xhr.response ?? {}) as Partial<RespuestaSubida> & {
          message?: string;
          errors?: Record<string, string[]>;
        };
        if (xhr.status >= 200 && xhr.status < 300 && body.url) {
          subscriber.next({ progress: 100, url: body.url });
          subscriber.complete();
        } else {
          subscriber.error(
            new ApiError(body.message ?? 'No se pudo subir el archivo.', xhr.status, body.errors ?? {}),
          );
        }
      };
      xhr.onerror = () =>
        subscriber.error(new ApiError('No hay conexión con el servidor. Inténtalo de nuevo.', 0));

      const data = new FormData();
      data.append('file', file);
      xhr.send(data);
      subscriber.next({ progress: 0 });
      return () => {
        if (xhr.readyState !== XMLHttpRequest.DONE) xhr.abort();
      };
    });
  }
}
