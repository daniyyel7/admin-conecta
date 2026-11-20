import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { Auth } from './auth';

/**
 * Permite el acceso solo con sesión iniciada; si no, redirige a /login.
 * Al recargar la página recupera la sesión con la cookie (refresh) antes de decidir.
 */
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(Auth)
    .ensureSession()
    .pipe(map((ok) => ok || router.createUrlTree(['/login'])));
};

/** Evita volver al login (o recuperar contraseña) con sesión iniciada. */
export const guestGuard: CanActivateFn = () => {
  // En el pre-render del servidor no hay sesión que revisar.
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
  const router = inject(Router);
  return inject(Auth)
    .ensureSession()
    .pipe(map((ok) => (ok ? router.createUrlTree(['/']) : true)));
};
