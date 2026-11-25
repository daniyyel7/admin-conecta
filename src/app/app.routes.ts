import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth-guard';
import { SeoRouteData } from './core/seo/seo-title-strategy';

export const routes: Routes = [
  // Pantallas públicas
  {
    path: 'login',
    title: 'Iniciar sesión · Conecta 7 Administrador',
    data: {
      description:
        'Accede al portal administrador de Conecta7: gestión de recursos, eventos eclesiásticos y ministerios locales de la Unión Mexicana de Chiapas.',
      robots: 'index, follow',
    } satisfies SeoRouteData,
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/pages/login/login').then((m) => m.Login),
  },
  {
    path: 'recuperar-contrasena',
    title: 'Recuperar contraseña · Conecta 7',
    data: {
      description: 'Restablece la contraseña de tu cuenta del portal administrador de Conecta7.',
      robots: 'noindex, follow',
    } satisfies SeoRouteData,
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/forgot-password/forgot-password').then(
        (m) => m.ForgotPassword,
      ),
  },

  {
    // Enlace del correo: /restablecer-contrasena?token=XXXX (sin guard: puede abrirse con o sin sesión).
    path: 'restablecer-contrasena',
    title: 'Restablecer contraseña · Conecta 7',
    data: {
      description: 'Crea una nueva contraseña para tu cuenta del portal administrador de Conecta7.',
      robots: 'noindex, nofollow',
    } satisfies SeoRouteData,
    loadComponent: () =>
      import('./features/auth/pages/reset-password/reset-password').then((m) => m.ResetPassword),
  },

  // Panel (requiere sesión)
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Inicio · Conecta 7',
        loadComponent: () => import('./features/home/pages/home/home').then((m) => m.Home),
      },
      {
        path: 'eventos',
        loadChildren: () =>
          import('./features/eventos/eventos.routes').then((m) => m.EVENTOS_ROUTES),
      },
      {
        path: 'recursos',
        loadChildren: () =>
          import('./features/recursos/recursos.routes').then((m) => m.RECURSOS_ROUTES),
      },
      {
        path: 'avisos',
        loadChildren: () => import('./features/avisos/avisos.routes').then((m) => m.AVISOS_ROUTES),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
