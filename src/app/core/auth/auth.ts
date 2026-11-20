import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { aApiError } from '../api/api-error';

export interface Credentials {
  email: string;
  password: string;
}

/** El enlace para restablecer la contraseña venció o ya se usó (API: 410). */
export class ResetTokenInvalidError extends Error {
  constructor() {
    super('El enlace para restablecer la contraseña ya no es válido.');
  }
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface TokenResponse {
  accessToken: string;
  expiresIn: number;
}

interface LoginResponse extends TokenResponse {
  user: AdminUser;
}

/** Rutas de `/auth` que no llevan `Authorization` (usan la cookie o no requieren sesión). */
export const AUTH_PUBLICAS = [
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
];

/**
 * Sesión del panel contra la API (`api-umch`, sección 1 de docs/API-endpoints.md).
 *
 * - El `accessToken` (15 min) vive solo en memoria.
 * - El refresh token va en una cookie httpOnly que el navegador manda solo a `/auth`;
 *   al recargar la página la sesión se recupera con `refresh()`.
 */
@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly api = `${environment.apiUrl}/auth`;

  private readonly _user = signal<AdminUser | null>(null);
  private readonly _token = signal<string | null>(null);
  /** Un solo `refresh` a la vez aunque varias peticiones reciban 401 juntas. */
  private refreshEnCurso: Observable<string | null> | null = null;
  /** Ya se confirmó que no hay cookie de sesión: los guards no vuelven a preguntar hasta el login. */
  private sinSesion = false;

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null && this._token() !== null);

  /** Token actual para el interceptor. */
  accessToken(): string | null {
    return this._token();
  }

  login(credentials: Credentials): Observable<AdminUser> {
    return this.http
      .post<LoginResponse>(`${this.api}/login`, credentials, { withCredentials: true })
      .pipe(
        tap((r) => {
          this.sinSesion = false;
          this.setSesion(r.accessToken, r.user);
        }),
        map((r) => r.user),
        catchError((e) => throwError(() => aApiError(e, 'No se pudo iniciar sesión.'))),
      );
  }

  /**
   * Pide un access token nuevo con la cookie. Regresa el token o `null` si ya no hay sesión.
   * Si aún no se conoce al usuario (recién se recargó la página), también lo trae.
   */
  refresh(): Observable<string | null> {
    if (!this.isBrowser) return of(null);
    this.refreshEnCurso ??= this.http
      .post<TokenResponse>(`${this.api}/refresh`, {}, { withCredentials: true })
      .pipe(
        switchMap((r) => {
          this._token.set(r.accessToken);
          if (this._user()) return of(r.accessToken);
          return this.http.get<AdminUser>(`${this.api}/me`).pipe(
            tap((user) => this._user.set(user)),
            map(() => r.accessToken),
          );
        }),
        catchError(() => {
          this.limpiar();
          this.sinSesion = true;
          return of(null);
        }),
        finalize(() => (this.refreshEnCurso = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.refreshEnCurso;
  }

  /** ¿Hay sesión? Si no hay token en memoria intenta recuperarla con la cookie. */
  ensureSession(): Observable<boolean> {
    if (this.isAuthenticated()) return of(true);
    if (this.sinSesion) return of(false);
    return this.refresh().pipe(map((token) => token !== null));
  }

  /** Solicita el enlace para restablecer la contraseña (la API responde igual exista o no la cuenta). */
  requestPasswordReset(email: string): Observable<void> {
    return this.http
      .post<void>(`${this.api}/forgot-password`, { email })
      .pipe(catchError((e) => throwError(() => aApiError(e, 'No pudimos enviar el enlace.'))));
  }

  /** Comprueba que el enlace del correo siga siendo válido (410 si venció o ya se usó). */
  validateResetToken(token: string): Observable<void> {
    if (!token) return throwError(() => new ResetTokenInvalidError());
    return this.http
      .get<void>(`${this.api}/reset-password/validate`, { params: { token } })
      .pipe(catchError((e) => throwError(() => this.errorReset(e))));
  }

  /** Guarda la nueva contraseña usando el token del correo. */
  resetPassword(token: string, password: string): Observable<void> {
    return this.http
      .post<void>(`${this.api}/reset-password`, { token, password })
      .pipe(catchError((e) => throwError(() => this.errorReset(e))));
  }

  /** Cambia la contraseña del usuario con sesión iniciada (400 si la actual no es correcta). */
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http
      .post<void>(`${this.api}/change-password`, { currentPassword, newPassword })
      .pipe(
        catchError((e) => throwError(() => aApiError(e, 'No se pudo cambiar la contraseña.'))),
      );
  }

  /**
   * Cierra la sesión en la API (revoca el refresh y borra la cookie) y en el panel.
   * Termina siempre, aunque la API falle; navega al login después de que termine para que
   * la pantalla de login no recupere la sesión con la cookie anterior.
   */
  logout(): Observable<void> {
    this.limpiar();
    this.sinSesion = true;
    if (!this.isBrowser) return of(undefined);
    return this.http
      .post<void>(`${this.api}/logout`, {}, { withCredentials: true })
      .pipe(catchError(() => of(undefined)));
  }

  /** Olvida la sesión local (p. ej. cuando el refresh ya no es válido). */
  limpiar(): void {
    this._token.set(null);
    this._user.set(null);
  }

  private setSesion(token: string, user: AdminUser): void {
    this._token.set(token);
    this._user.set(user);
  }

  private errorReset(error: unknown): Error {
    const e = aApiError(error, 'No se pudo guardar la contraseña.');
    return e.status === 410 ? new ResetTokenInvalidError() : e;
  }
}
