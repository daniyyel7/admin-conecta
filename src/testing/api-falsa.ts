import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { EnvironmentProviders, Provider } from '@angular/core';
import { Observable, map, mergeMap, throwError, timer, takeWhile } from 'rxjs';
import { environment } from '../environments/environment';
import { ArchivosService, DestinoArchivo, UploadProgress } from '../app/core/api/archivos';
import { Evento, EventoInput } from '../app/features/eventos/models/evento';
import { simularEstadoApi } from '../app/features/eventos/services/eventos-store';
import { Collection, Resource, RESOURCE_TYPES, contarArchivos } from '../app/features/recursos/models/recurso';
import { COLECCIONES_MOCK, PORTADA_DEFAULT } from './colecciones.mock';
import { EVENTOS_MOCK } from './eventos.mock';
import { AVISOS_MOCK } from './avisos.mock';
import { Aviso } from '../app/features/avisos/models/aviso';

/** Departamentos de ejemplo (los mismos ids que usan los datos de prueba). */
export const DEPARTAMENTOS_DEMO = [
  { id: 'evangelismo', nombre: 'Evangelismo / Conquistadores', color: '#f39c1f' },
  { id: 'juvenil', nombre: 'Ministerio Juvenil', color: '#f4a77a' },
  { id: 'escuela-sabatica', nombre: 'Escuela Sabática', color: '#eab308' },
  { id: 'mujer', nombre: 'Ministerio de la Mujer', color: '#e9a8b8' },
  { id: 'personal', nombre: 'Ministerio Personal', color: '#60a5fa' },
  { id: 'mayordomia', nombre: 'Mayordomía Cristiana', color: '#9ca3af' },
  { id: 'infantil', nombre: 'Ministerio Infantil', color: '#a78bfa' },
];

const CATEGORIAS_DEMO = ['Libros', 'Devocionales', 'Sermones', 'Estudios bíblicos', 'Capacitación', 'Programas', 'Música', 'Niños', 'Eventos'];

const RETRASO_MS = 10;

const ok = <T>(body: T, status = 200) =>
  timer(RETRASO_MS).pipe(map(() => new HttpResponse({ status, body })));

const falla = (status: number, message: string, errors?: Record<string, string[]>) =>
  timer(RETRASO_MS).pipe(
    mergeMap(() => throwError(() => new HttpErrorResponse({ status, error: { message, errors } }))),
  );

const siguienteId = (ids: string[]) => String(Math.max(0, ...ids.map((x) => Number(x) || 0)) + 1);

/**
 * API en memoria para las pruebas: responde como `api-umch` (mismas rutas y forma del JSON)
 * con los datos de ejemplo. Cada llamada crea un estado nuevo.
 */
export function crearApiFalsa() {
  const estado = {
    eventos: structuredClone(EVENTOS_MOCK) as Evento[],
    colecciones: structuredClone(COLECCIONES_MOCK) as Collection[],
    avisos: structuredClone(AVISOS_MOCK) as Aviso[],
    sesion: false,
    /** Ids de los eventos elegidos para el Inicio, en orden. */
    inicio: [] as string[],
  };

  const statusColeccion = (date: string) =>
    simularEstadoApi({ fechaInicio: date }) === 'proximo' ? 'Próximo' : 'En curso';

  const rutas = (req: HttpRequest<unknown>): Observable<HttpResponse<unknown>> => {
    const ruta = req.url.slice(environment.apiUrl.length).split('?')[0];
    const body = (req.body ?? {}) as Record<string, unknown>;
    const m = req.method;
    let p: RegExpMatchArray | null;

    // ── Auth ──
    if (m === 'POST' && ruta === '/auth/login') {
      if (String(body['password'] ?? '').length < 6) return falla(401, 'Correo o contraseña incorrectos.');
      estado.sesion = true;
      return ok({ accessToken: 't', expiresIn: 900, user: { id: 'u1', email: body['email'], name: 'David Mazariegos', role: 'admin' } });
    }
    if (m === 'POST' && ruta === '/auth/refresh') {
      return estado.sesion ? ok({ accessToken: 't2', expiresIn: 900 }) : falla(401, 'Tu sesión terminó.');
    }
    if (m === 'GET' && ruta === '/auth/me') {
      return ok({ id: 'u1', email: 'david.mazariegos@conecta7.org', name: 'David Mazariegos', role: 'admin' });
    }
    if (m === 'POST' && ruta === '/auth/logout') {
      estado.sesion = false;
      return ok(null, 204);
    }
    if (m === 'POST' && ruta === '/auth/forgot-password') return ok(null, 204);
    if (ruta === '/auth/reset-password/validate' || ruta === '/auth/reset-password') {
      const token = m === 'GET' ? req.params.get('token') : body['token'];
      return token === 'vencido' ? falla(410, 'El enlace ya no es válido.') : ok(null, 204);
    }
    if (m === 'POST' && ruta === '/auth/change-password') {
      if (String(body['currentPassword'] ?? '').length < 6) {
        return falla(400, 'La contraseña actual no es correcta.', {
          currentPassword: ['La contraseña actual no es correcta.'],
        });
      }
      return ok(null, 204);
    }

    // ── Catálogos ──
    if (ruta === '/catalogos/departamentos') return ok(DEPARTAMENTOS_DEMO.map((d) => ({ ...d, activo: true })));
    if (ruta === '/catalogos/categorias-recursos') {
      return ok(CATEGORIAS_DEMO.map((nombre) => ({ id: nombre.toLowerCase(), nombre })));
    }
    if (ruta === '/catalogos/tipos-recurso') {
      return ok(RESOURCE_TYPES.map((t) => ({ type: t.type, label: t.label, mode: t.mode, accept: t.accept, maxMb: t.maxMb })));
    }

    // ── Inicio de la app ──
    if (ruta === '/inicio/eventos') {
      const elegidos = () => estado.inicio.map((id) => estado.eventos.find((e) => e.id === id)).filter(Boolean);
      if (m === 'GET') return ok(elegidos());
      const ids = (body['ids'] as string[]) ?? [];
      if (ids.length > 5) return falla(400, 'Máximo 5 eventos.', { ids: ['Máximo 5 eventos.'] });
      const malo = ids.map((id) => estado.eventos.find((e) => e.id === id)).find((e) => !e || e.estado === 'finalizado' || e.estado === 'cancelado');
      if (malo !== undefined) return falla(400, 'Ese evento no puede salir en el Inicio.', { ids: ['No válido.'] });
      estado.inicio = [...ids];
      return ok(elegidos());
    }

    // ── Avisos generales ──
    if (ruta === '/avisos' && m === 'GET') return ok(structuredClone(estado.avisos));
    if (ruta === '/avisos' && m === 'POST') {
      const aviso = { ...(body as unknown as Aviso), id: siguienteId(estado.avisos.map((a) => a.id)) };
      estado.avisos.unshift(aviso);
      return ok(aviso, 201);
    }
    if ((p = ruta.match(/^\/avisos\/([^/]+)(\/visible)?$/))) {
      const i = estado.avisos.findIndex((a) => a.id === p![1]);
      if (i < 0) return falla(404, 'El aviso no existe.');
      if (m === 'DELETE') {
        estado.avisos.splice(i, 1);
        return ok(null, 204);
      }
      estado.avisos[i] = p[2]
        ? { ...estado.avisos[i], visible: Boolean(body['visible']) }
        : { ...(body as unknown as Aviso), id: estado.avisos[i].id };
      return ok(estado.avisos[i]);
    }

    // ── Eventos ──
    if (ruta === '/eventos' && m === 'GET') return ok(structuredClone(estado.eventos));
    if (ruta === '/eventos' && m === 'POST') {
      const d = body as unknown as EventoInput;
      const evento: Evento = { ...d, etiquetas: [], id: siguienteId(estado.eventos.map((e) => e.id)), estado: simularEstadoApi(d) };
      estado.eventos.unshift(evento);
      return ok(evento, 201);
    }
    if ((p = ruta.match(/^\/eventos\/([^/]+)(\/cancelar)?$/))) {
      const i = estado.eventos.findIndex((e) => e.id === p![1]);
      if (i < 0) return falla(404, 'No existe.');
      const actual = estado.eventos[i];
      if (p[2]) {
        if (actual.estado === 'cancelado' || actual.estado === 'finalizado') return falla(409, 'No se puede cancelar.');
        estado.eventos[i] = { ...actual, estado: 'cancelado' };
        return ok(estado.eventos[i]);
      }
      if (m === 'GET') return ok(actual);
      if (m === 'DELETE') {
        estado.eventos.splice(i, 1);
        return ok(null, 204);
      }
      const d = body as unknown as EventoInput;
      estado.eventos[i] = { ...actual, ...d, estado: actual.estado === 'cancelado' ? 'cancelado' : simularEstadoApi(d) };
      return ok(estado.eventos[i]);
    }

    // ── Colecciones y recursos ──
    const col = (id: string) => estado.colecciones.find((c) => c.id === id);
    const conConteo = (c: Collection) => ({ ...c, numberReources: contarArchivos(c.resources.length) });
    if (ruta === '/recursos' && m === 'GET') return ok({ allEvents: structuredClone(estado.colecciones) });
    if (ruta === '/recursos' && m === 'POST') {
      const d = body as unknown as Collection;
      const id = siguienteId(estado.colecciones.map((c) => c.id));
      const nueva: Collection = { ...d, id, status: statusColeccion(d.date), link: `/recursos/${id}`, numberReources: contarArchivos(0), resources: [] };
      estado.colecciones.unshift(nueva);
      return ok(nueva, 201);
    }
    if ((p = ruta.match(/^\/recursos\/([^/]+)(\/visible)?$/))) {
      const c = col(p[1]);
      if (!c) return falla(404, 'La colección no existe.');
      if (m === 'GET') return ok(c);
      if (m === 'DELETE') {
        estado.colecciones = estado.colecciones.filter((x) => x !== c);
        return ok(null, 204);
      }
      if (p[2]) c.visible = Boolean(body['visible']);
      else {
        Object.assign(c, body, { status: statusColeccion(String(body['date'])) });
        c.resources = c.resources.map((r) => ({ ...r, status: c.status, category: c.category, apartment: c.apartment, date: c.date }));
      }
      return ok(conConteo(c));
    }
    if ((p = ruta.match(/^\/recursos\/([^/]+)\/resources(?:\/([^/]+))?(\/visible)?$/))) {
      const c = col(p[1]);
      if (!c) return falla(404, 'La colección no existe.');
      const heredado = { status: c.status, category: c.category, apartment: c.apartment, date: c.date };
      // Como la API: sin portada propia se manda la por defecto.
      const conPortada = (b: Record<string, unknown>) => {
        const { image, ...resto } = b as unknown as Resource & { image: string | null };
        return { ...resto, image: image || PORTADA_DEFAULT, customImage: !!image };
      };
      if (!p[2] && m === 'POST') {
        const r = { ...conPortada(body), ...heredado, id: siguienteId(c.resources.map((x) => x.id)) };
        c.resources.push(r);
        return ok(r, 201);
      }
      const i = c.resources.findIndex((r) => r.id === p![2]);
      if (i < 0) return falla(404, 'El recurso no existe.');
      if (m === 'DELETE') {
        c.resources.splice(i, 1);
        return ok(null, 204);
      }
      c.resources[i] = p[3]
        ? { ...c.resources[i], visible: Boolean(body['visible']) }
        : { ...c.resources[i], ...conPortada(body), ...heredado };
      return ok(c.resources[i]);
    }

    return falla(404, `Ruta no simulada: ${m} ${ruta}`);
  };

  const interceptor: HttpInterceptorFn = (req, next) =>
    req.url.startsWith(environment.apiUrl) ? rutas(req) : next(req);

  /** Subida simulada: progreso en pasos y al final una URL de /media/publico. */
  const archivos: Pick<ArchivosService, 'subir'> = {
    subir: (file: File, destino: DestinoArchivo): Observable<UploadProgress> => {
      const carpeta =
        destino.destino === 'recurso'
          ? `${destino.tipo}/col-${destino.coleccion}`
          : destino.destino === 'recurso-portada'
            ? `imagenes/col-${destino.coleccion}`
            : 'imagenes/eventos';
      return timer(0, 20).pipe(
        map((i) => Math.min(100, i * 25)),
        takeWhile((pr) => pr < 100, true),
        map((progress) =>
          progress < 100
            ? { progress }
            : { progress, url: `https://app.umch.org.mx/media/publico/${carpeta}/${encodeURIComponent(file.name)}` },
        ),
      );
    },
  };

  return { estado, interceptor, archivos };
}

/** Providers para pruebas: HttpClient contra la API falsa y subida simulada. */
export function proveerApiFalsa(
  configurar?: (estado: ReturnType<typeof crearApiFalsa>['estado']) => void,
): (Provider | EnvironmentProviders)[] {
  const api = crearApiFalsa();
  configurar?.(api.estado);
  return [
    provideHttpClient(withInterceptors([api.interceptor])),
    { provide: ArchivosService, useValue: api.archivos },
  ];
}

