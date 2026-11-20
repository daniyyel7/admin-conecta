/**
 * Modelos de Recursos, con los mismos nombres de campo que el JSON de la API
 * (`allEvents` → colecciones, `resources` → recursos).
 */

export type ResourceType = 'pdf' | 'document' | 'video' | 'audio' | 'image' | 'drive' | 'link';

/** Estado que manda la API ("En curso", "Próximo", "Finalizado", "Cancelado"). */
export type ApiStatus = string;

export interface Resource {
  id: string;
  type: ResourceType;
  visible: boolean;
  status: ApiStatus;
  category: string;
  /** Nombre del departamento (la API usa `apartment`). */
  apartment: string;
  /** Fecha ISO (yyyy-mm-dd). */
  date: string;
  /** URL del archivo subido o del enlace externo. */
  link: string;
  title: string;
  description: string;
}

/** Colección de recursos (en la API: un elemento de `allEvents`). */
export interface Collection {
  id: string;
  visible: boolean;
  status: ApiStatus;
  category: string;
  apartment: string;
  date: string;
  location: string;
  link: string;
  title: string;
  /** Texto que arma la API, p. ej. "7 archivos" (el panel calcula el número real). */
  numberReources: string;
  description: string;
  resources: Resource[];
}

/** Lo que el panel envía al crear/editar una colección (id, status y link los pone la API). */
export type CollectionInput = Pick<
  Collection,
  'title' | 'description' | 'apartment' | 'category' | 'date' | 'location' | 'visible'
>;

/** Lo que el panel envía al crear/editar un recurso (status, category, apartment y date se heredan de la colección). */
export type ResourceInput = Pick<Resource, 'type' | 'title' | 'description' | 'link' | 'visible'>;

/** Cómo se captura el contenido de cada tipo de recurso. */
export type SourceMode = 'file' | 'url' | 'file-or-url';

export interface ResourceTypeConfig {
  type: ResourceType;
  label: string;
  /** Texto corto para el selector de tipo. */
  hint: string;
  mode: SourceMode;
  /** Para `<input type=file accept>`. */
  accept?: string;
  /** Formatos legibles, p. ej. "PDF". */
  formats?: string;
  maxMb?: number;
  /** Validación del enlace (cuando el modo admite URL). */
  urlPattern?: RegExp;
  urlPlaceholder?: string;
  urlHelp?: string;
  /** Color del icono (dato de presentación, igual en ambos temas). */
  color: string;
  /** Trazos SVG del icono (viewBox 24x24). */
  icon: string[];
}

export const RESOURCE_TYPES: ResourceTypeConfig[] = [
  {
    type: 'pdf',
    label: 'PDF',
    hint: 'Libros, guías, programas',
    mode: 'file',
    accept: '.pdf,application/pdf',
    formats: 'PDF',
    maxMb: 25,
    color: '#ef4444',
    icon: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z', 'M14 3v5h5', 'M9 13h6M9 17h4'],
  },
  {
    type: 'document',
    label: 'Documento',
    hint: 'Word, PowerPoint, Excel',
    mode: 'file',
    accept: '.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.odp,.txt',
    formats: 'DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT',
    maxMb: 25,
    color: '#3b82f6',
    icon: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z', 'M14 3v5h5', 'M9 12h6M9 15h6M9 18h3'],
  },
  {
    type: 'video',
    label: 'Video',
    hint: 'Archivo o YouTube / Vimeo',
    mode: 'file-or-url',
    accept: 'video/*',
    formats: 'MP4, MOV, WEBM',
    maxMb: 500,
    urlPattern: /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\/\S+$/i,
    urlPlaceholder: 'https://www.youtube.com/watch?v=…',
    urlHelp: 'Enlace de YouTube o Vimeo.',
    color: '#a855f7',
    icon: ['M4 6h11a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z', 'm16 10 5-3v10l-5-3'],
  },
  {
    type: 'audio',
    label: 'Audio',
    hint: 'Sermones, música, podcasts',
    mode: 'file',
    accept: 'audio/*',
    formats: 'MP3, M4A, WAV, OGG',
    maxMb: 100,
    color: '#10b981',
    icon: ['M9 18V5l12-2v13', 'M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  },
  {
    type: 'image',
    label: 'Imagen',
    hint: 'Carteles, infografías',
    mode: 'file',
    accept: 'image/*',
    formats: 'JPG, PNG, WEBP',
    maxMb: 10,
    color: '#ec4899',
    icon: ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z', 'M9 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z', 'm21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21'],
  },
  {
    type: 'drive',
    label: 'Google Drive',
    hint: 'Carpeta o archivo de Drive',
    mode: 'url',
    urlPattern: /^https:\/\/(drive|docs)\.google\.com\/\S+$/i,
    urlPlaceholder: 'https://drive.google.com/drive/folders/…',
    urlHelp: 'Asegúrate de que esté compartido como "Cualquier persona con el enlace".',
    color: '#eab308',
    icon: ['M8.5 3h7l6 10.5-3.5 6H6l-3.5-6Z', 'm8.5 3 9.5 16.5M15.5 3 6 19.5M2.5 13.5h19'],
  },
  {
    type: 'link',
    label: 'Enlace',
    hint: 'Cualquier página web',
    mode: 'url',
    urlPattern: /^https?:\/\/[^\s.]+\.\S+$/i,
    urlPlaceholder: 'https://…',
    urlHelp: 'Debe empezar con https://',
    color: '#94a3b8',
    icon: ['M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7', 'M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7'],
  },
];

const TYPE_BY_ID = new Map(RESOURCE_TYPES.map((t) => [t.type, t]));

export function typeConfig(type: ResourceType): ResourceTypeConfig {
  return TYPE_BY_ID.get(type) ?? RESOURCE_TYPES[RESOURCE_TYPES.length - 1];
}

/** Clase de la insignia de estado (reutiliza las de eventos). */
export function statusClass(status: ApiStatus): string {
  const s = status
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  if (s.includes('curso')) return 'en-curso';
  if (s.includes('proximo')) return 'proximo';
  if (s.includes('cancel')) return 'cancelado';
  return 'finalizado';
}

/** "1 archivo" / "5 archivos" */
export function contarArchivos(n: number): string {
  return `${n} ${n === 1 ? 'archivo' : 'archivos'}`;
}

/** Nombre legible del archivo a partir de su URL. */
export function nombreArchivo(link: string): string {
  if (link.startsWith('blob:')) return 'Archivo subido';
  try {
    const path = new URL(link, 'https://x').pathname;
    return decodeURIComponent(path.split('/').filter(Boolean).pop() ?? link);
  } catch {
    return link;
  }
}
