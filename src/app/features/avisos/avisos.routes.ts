import { Routes } from '@angular/router';

export const AVISOS_ROUTES: Routes = [
  {
    path: '',
    title: 'Avisos · Conecta 7',
    loadComponent: () => import('./pages/avisos-list/avisos-list').then((m) => m.AvisosList),
  },
];
