import { Routes } from '@angular/router';

export const RECURSOS_ROUTES: Routes = [
  {
    path: '',
    title: 'Recursos · Conecta 7',
    loadComponent: () =>
      import('./pages/colecciones-list/colecciones-list').then((m) => m.ColeccionesList),
  },
  {
    path: ':id',
    title: 'Colección de recursos · Conecta 7',
    loadComponent: () =>
      import('./pages/coleccion-detail/coleccion-detail').then((m) => m.ColeccionDetail),
  },
];
