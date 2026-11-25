/** Aviso general tal como lo regresa `GET /admin/avisos`. La app lo recibe en `/avisos/generales`. */
export interface Aviso {
  /** El mismo número que recibe la app como `id`. */
  id: string;
  titulo: string;
  mensaje: string;
  /** aaaa-mm-dd */
  fecha: string;
  importante: boolean;
  /** Nombre del icono (Iconify) que muestra la app. */
  icono: string;
  visible: boolean;
}

export type AvisoInput = Omit<Aviso, 'id'>;

export const ICONO_AVISO_DEFAULT = 'material-symbols:notifications';

/** Iconos que puede elegir el administrador (los dibuja la app con Iconify). */
export const ICONOS_AVISO: { value: string; label: string }[] = [
  { value: ICONO_AVISO_DEFAULT, label: 'Notificación' },
  { value: 'material-symbols:campaign', label: 'Anuncio' },
  { value: 'material-symbols:event', label: 'Evento' },
  { value: 'material-symbols:schedule', label: 'Horario' },
  { value: 'material-symbols:info', label: 'Información' },
  { value: 'material-symbols:warning', label: 'Advertencia' },
];

export const etiquetaIcono = (icono: string): string =>
  ICONOS_AVISO.find((i) => i.value === icono)?.label ?? icono;
