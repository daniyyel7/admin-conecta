import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Pantallas públicas: se pre-renderizan en el build.
  { path: 'login', renderMode: RenderMode.Prerender },
  { path: 'recuperar-contrasena', renderMode: RenderMode.Prerender },
  // El token del enlace se valida en el navegador.
  { path: 'restablecer-contrasena', renderMode: RenderMode.Client },
  // Panel: depende de la sesión del navegador, se renderiza en el cliente.
  { path: '**', renderMode: RenderMode.Client },
];
