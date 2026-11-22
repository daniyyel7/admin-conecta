import { Collection, Resource, ResourceType, contarArchivos } from '../app/features/recursos/models/recurso';

/** Datos de ejemplo con la forma del JSON de la API, mientras no exista el endpoint. */

type Base = Pick<Collection, 'status' | 'category' | 'apartment' | 'date'>;

function recursos(base: Base, items: [ResourceType, string, string, string, boolean?][]): Resource[] {
  return items.map(([type, title, description, link, visible = true], i) => ({
    id: String(i + 1),
    type,
    visible,
    ...base,
    link,
    title,
    description,
    image: PORTADA_DEFAULT,
    customImage: false,
  }));
}

function coleccion(
  id: string,
  data: Omit<Collection, 'id' | 'link' | 'numberReources' | 'resources'>,
  items: [ResourceType, string, string, string, boolean?][],
): Collection {
  const resources = recursos(data, items).map((r, i) => ({ ...r, id: `${id}-${i + 1}` }));
  return {
    id,
    ...data,
    link: `/recursos/${id}`,
    numberReources: contarArchivos(resources.length),
    resources,
  };
}

const PDF = 'https://app.umch.org.mx/media/publico/pdf';

/** Portada que manda la API cuando el recurso no tiene una propia. */
export const PORTADA_DEFAULT = 'https://app.umch.org.mx/media/publico/imagenes/_predeterminadas/recurso.png';

export const COLECCIONES_MOCK: Collection[] = [
  coleccion(
    '1',
    {
      visible: true,
      status: 'En curso',
      category: 'Libros',
      apartment: 'Escuela Sabática',
      date: '2026-11-01',
      location: 'Unión Mexicana de Chiapas',
      title: 'Libros UMCH 2026',
      description: 'Libros y guías oficiales del año para iglesias y distritos.',
    },
    [
      ['pdf', 'Revive 2026', 'Guía de programas', `${PDF}/revive2027.pdf`],
      ['pdf', 'Generación Transformada', 'Ministerio Juvenil', `${PDF}/generaciontransformada2027.pdf`],
      ['pdf', 'Escuela Sabática', 'Programas de cada sábado', `${PDF}/escuelasabatica2026.pdf`],
      ['pdf', 'Guía para Líderes', 'Grupos pequeños familiares', `${PDF}/guialideres2026.pdf`],
      ['pdf', 'Orden del culto', 'Reavivados 2026', `${PDF}/ordenculto2026.pdf`],
    ],
  ),
  coleccion(
    '2',
    {
      visible: true,
      status: 'En curso',
      category: 'Devocionales',
      apartment: 'Ministerio Juvenil',
      date: '2026-11-10',
      location: 'En línea',
      title: 'Devocionales Juveniles',
      description: 'Audios, videos y material visual para la semana de oración juvenil.',
    },
    [
      ['audio', 'Invencibles', 'Canto tema 2026', 'https://app.umch.org.mx/audios/invencibles.mp3'],
      ['video', 'Mensaje de bienvenida', 'Pr. de jóvenes de la Unión', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
      ['image', 'Cartel oficial', 'Para redes sociales', 'https://app.umch.org.mx/media/publico/img/cartel-jovenes.png'],
      ['link', 'Plan de lectura', 'Reavivados por su Palabra', 'https://www.reavivadosporsupalabra.org'],
    ],
  ),
  coleccion(
    '3',
    {
      visible: true,
      status: 'Próximo',
      category: 'Capacitación',
      apartment: 'Evangelismo / Conquistadores',
      date: '2026-12-13',
      location: 'Iglesia Central, Tuxtla Gutiérrez',
      title: 'Material de Conquistadores',
      description: 'Especialidades, investiduras y formatos para directores de club.',
    },
    [
      ['drive', 'Carpeta de especialidades', 'Requisitos y hojas de trabajo', 'https://drive.google.com/drive/folders/1EBW7-wf0l6JDsDibyQNKcCf0ZR_LoifM'],
      ['pdf', 'Manual de investidura', 'Guías Mayores', `${PDF}/investidura2026.pdf`],
      ['document', 'Formato de inscripción', 'Excel para el club', 'https://app.umch.org.mx/media/publico/docs/inscripcion.xlsx'],
    ],
  ),
  coleccion(
    '4',
    {
      visible: true,
      status: 'Finalizado',
      category: 'Sermones',
      apartment: 'Mayordomía Cristiana',
      date: '2026-09-20',
      location: 'Todas las iglesias',
      title: 'Sermones de Mayordomía',
      description: 'Sermones y presentaciones del mes de la mayordomía.',
    },
    [
      ['audio', 'Fieles en lo poco', 'Sermón del primer sábado', 'https://app.umch.org.mx/audios/fieles.mp3'],
      ['document', 'Presentación', 'Diapositivas del sermón', 'https://app.umch.org.mx/media/publico/docs/mayordomia.pptx'],
      ['pdf', 'Bosquejos', '4 bosquejos para el mes', `${PDF}/bosquejos-mayordomia.pdf`],
    ],
  ),
  coleccion(
    '5',
    {
      visible: false,
      status: 'Próximo',
      category: 'Eventos',
      apartment: 'Ministerio de la Mujer',
      date: '2027-03-06',
      location: 'Todas las iglesias',
      title: 'Día de la Mujer 2027',
      description: 'Material para el sábado de la mujer (en preparación).',
    },
    [
      ['image', 'Cartel', 'Versión preliminar', 'https://app.umch.org.mx/media/publico/img/mujer2027.png', false],
      ['pdf', 'Programa', 'Orden del sábado', `${PDF}/mujer2027.pdf`],
    ],
  ),
  coleccion(
    '6',
    {
      visible: true,
      status: 'Próximo',
      category: 'Niños',
      apartment: 'Ministerio Infantil',
      date: '2027-07-12',
      location: 'Iglesias locales',
      title: 'Escuela Bíblica de Vacaciones',
      description: 'Lecciones, manualidades y cantos para la EBV.',
    },
    [
      ['drive', 'Manualidades', 'Plantillas para imprimir', 'https://drive.google.com/drive/folders/1EBW7-wf0l6JDsDibyQNKcCf0ZR_LoifM'],
      ['video', 'Cantos con mímica', 'Lista de reproducción', 'https://www.youtube.com/playlist?list=PL123'],
    ],
  ),
];
