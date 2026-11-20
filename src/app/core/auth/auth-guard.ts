import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';

/** Permite el acceso solo con sesión iniciada; si no, redirige a /login. */
export const authGuard: CanActivateFn = () =>
  inject(Auth).isAuthenticated() || inject(Router).createUrlTree(['/login']);

/** Evita volver al login (o recuperar contraseña) con sesión iniciada. */
export const guestGuard: CanActivateFn = () =>
  !inject(Auth).isAuthenticated() || inject(Router).createUrlTree(['/']);
