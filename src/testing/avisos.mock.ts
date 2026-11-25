import { Aviso } from '../app/features/avisos/models/aviso';

/** Avisos de ejemplo (mismo orden que regresa la API: fecha desc, importantes primero). */
export const AVISOS_MOCK: Aviso[] = [
  {
    id: '2',
    titulo: 'Cambio de horario para Evento',
    mensaje: 'Revisa nuevamente la agenda: se intercambian las actividades de hoy y mañana.',
    fecha: '2026-08-12',
    importante: true,
    icono: 'material-symbols:notifications',
    visible: true,
  },
  {
    id: '3',
    titulo: 'Reunión General',
    mensaje: 'Acompáñanos hoy a las 6:00 p. m. en el escenario principal.',
    fecha: '2026-08-12',
    importante: false,
    icono: 'material-symbols:campaign',
    visible: true,
  },
  {
    id: '1',
    titulo: 'Mantengamos limpio el campamento',
    mensaje: 'Deposita la basura en los contenedores correspondientes.',
    fecha: '2026-08-05',
    importante: false,
    icono: 'material-symbols:notifications',
    visible: false,
  },
];
