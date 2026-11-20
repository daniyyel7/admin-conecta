import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, delay, mergeMap, of, tap, throwError, timer } from 'rxjs';

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
  email: string;
  name: string;
}

const STORAGE_KEY = 'c7.admin.user';

/**
 * Servicio de autenticación.
 * TODO: reemplazar el mock de `login` por la llamada real a la API
 * (p. ej. `this.http.post<LoginResponse>(`${apiUrl}/auth/login`, credentials)`)
 * y guardar el token que devuelva en lugar del usuario.
 */
@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly _user = signal<AdminUser | null>(this.restore());

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  login({ email, password }: Credentials): Observable<AdminUser> {
    // Mock temporal: cualquier contraseña de 6+ caracteres es válida.
    if (password.length < 6) {
      return errorDespues(600, () => new Error('Usuario o contraseña incorrectos.'));
    }
    return of({ email, name: nameFromEmail(email) }).pipe(
      delay(600),
      tap((user) => this.setUser(user)),
    );
  }

  /**
   * Solicita el envío del enlace para restablecer la contraseña.
   * TODO: reemplazar por `this.http.post<void>(`${apiUrl}/auth/forgot-password`, { email })`.
   * La API debería responder igual exista o no la cuenta, para no revelar qué correos están registrados.
   */
  requestPasswordReset(email: string): Observable<void> {
    return of(void email).pipe(delay(800));
  }

  /**
   * Comprueba que el enlace del correo siga siendo válido.
   * TODO: `this.http.get<void>(`${apiUrl}/auth/reset-password/validate`, { params: { token } })`
   * (la API responde 410 si el token venció o ya se usó).
   */
  validateResetToken(token: string): Observable<void> {
    // Mock: un token vacío o "vencido" no es válido.
    if (!token || token === 'vencido') {
      return errorDespues(500, () => new ResetTokenInvalidError());
    }
    return of(undefined).pipe(delay(500));
  }

  /**
   * Guarda la nueva contraseña usando el token del correo.
   * TODO: `this.http.post<void>(`${apiUrl}/auth/reset-password`, { token, password })`.
   */
  resetPassword(token: string, password: string): Observable<void> {
    if (!token || token === 'vencido') {
      return errorDespues(700, () => new ResetTokenInvalidError());
    }
    return of(void password).pipe(delay(700));
  }

  /**
   * Cambia la contraseña del usuario con sesión iniciada.
   * TODO: `this.http.post<void>(`${apiUrl}/auth/change-password`, { currentPassword, newPassword })`
   * (la API responde 400/422 si la contraseña actual no es correcta).
   */
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    // Mock: igual que el login, la contraseña actual "correcta" es cualquiera de 6+ caracteres.
    if (currentPassword.length < 6) {
      return errorDespues(700, () => new Error('La contraseña actual no es correcta.'));
    }
    return of(void newPassword).pipe(delay(700));
  }

  logout(): void {
    this.setUser(null);
  }

  private setUser(user: AdminUser | null): void {
    this._user.set(user);
    if (!this.isBrowser) return;
    try {
      if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Almacenamiento no disponible (modo privado, etc.): la sesión vive solo en memoria.
    }
  }

  private restore(): AdminUser | null {
    if (!this.isBrowser) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AdminUser) : null;
    } catch {
      return null;
    }
  }
}

/** "david.mazariegos@conecta7.org" → "David Mazariegos" (solo para el mock). */
function nameFromEmail(email: string): string {
  return email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

/** Error simulado que llega después de `ms` (como una respuesta real de la API). */
function errorDespues(ms: number, crear: () => Error): Observable<never> {
  return timer(ms).pipe(mergeMap(() => throwError(crear)));
}
