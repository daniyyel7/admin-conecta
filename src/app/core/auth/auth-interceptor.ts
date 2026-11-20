import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AUTH_PUBLICAS, Auth } from './auth';

function esDeLaApi(req: HttpRequest<unknown>): boolean {
  return req.url.startsWith(environment.apiUrl);
}

function esPublica(req: HttpRequest<unknown>): boolean {
  const ruta = req.url.slice(environment.apiUrl.length);
  return AUTH_PUBLICAS.some((p) => ruta.startsWith(p));
}

function conToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

/**
 * Agrega `Authorization: Bearer` a las peticiones a la API. Si alguna responde 401
 * (el access token venció), renueva la sesión una vez y la repite; si no se puede,
 * manda al login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!esDeLaApi(req) || esPublica(req)) return next(req);

  const auth = inject(Auth);
  const router = inject(Router);

  return next(conToken(req, auth.accessToken())).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return auth.refresh().pipe(
        switchMap((token) => {
          if (!token) {
            router.navigate(['/login']);
            return throwError(() => error);
          }
          return next(conToken(req, token));
        }),
      );
    }),
  );
};
