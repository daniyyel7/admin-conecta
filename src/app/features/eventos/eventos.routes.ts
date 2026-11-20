import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '../../shared/unsaved-changes-guard';

const loadForm = () => import('./pages/evento-form/evento-form').then((m) => m.EventoForm);

export const EVENTOS_ROUTES: Routes = [
  {
    path: '',
    title: 'Eventos · Conecta 7',
    loadComponent: () => import('./pages/eventos-list/eventos-list').then((m) => m.EventosList),
  },
  {
    path: 'nuevo',
    title: 'Nuevo evento · Conecta 7',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: loadForm,
  },
  {
    path: ':id/editar',
    title: 'Editar evento · Conecta 7',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: loadForm,
  },
];
