import { Evento } from '../models/evento';

/** Datos de ejemplo mientras no exista la API. */
export const EVENTOS_MOCK: Evento[] = [
  { id: 'EVT-2026-012', nombre: 'Camporee de Conquistadores 2026', etiquetas: ['Campamento', 'Conquistadores'], departamentoId: 'evangelismo', estado: 'en-curso', fechaInicio: '2026-11-18', fechaFin: '2026-11-22', ubicacion: 'Campamento Las Nubes, Chiapas' },
  { id: 'EVT-2026-034', nombre: 'Congreso Juvenil: Generación Transformada', etiquetas: ['Congreso', 'Sábado'], departamentoId: 'juvenil', estado: 'proximo', fechaInicio: '2026-12-05', ubicacion: 'Tuxtla Gutiérrez, Chiapas' },
  { id: 'EVT-2026-021', nombre: 'Capacitación de Escuela Sabática – Trimestre 1', etiquetas: ['Capacitación', 'Maestros'], departamentoId: 'escuela-sabatica', estado: 'proximo', fechaInicio: '2026-12-12', ubicacion: 'Iglesia Central, Tapachula' },
  { id: 'EVT-2026-105', nombre: 'Encuentro Distrital de Damas', etiquetas: ['Convivencia & Oración'], departamentoId: 'mujer', estado: 'proximo', fechaInicio: '2027-01-16', ubicacion: 'Distrito Comitán' },
  { id: 'EVT-2026-056', nombre: 'Vigilia de Consagración "Revive 2026"', etiquetas: ['Espiritual', 'General'], departamentoId: 'personal', estado: 'proximo', fechaInicio: '2026-12-19', ubicacion: 'Templo Maranatha, Tuxtla Gutiérrez' },
  { id: 'EVT-2026-013', nombre: 'Semana de Evangelismo Juvenil', etiquetas: ['Evangelismo', 'Jóvenes'], departamentoId: 'juvenil', estado: 'en-curso', fechaInicio: '2026-11-15', fechaFin: '2026-11-22', ubicacion: 'San Cristóbal de las Casas' },
  { id: 'EVT-2026-041', nombre: 'Investidura de Guías Mayores', etiquetas: ['Ceremonia'], departamentoId: 'evangelismo', estado: 'proximo', fechaInicio: '2026-12-13', ubicacion: 'Iglesia Central, Tuxtla Gutiérrez' },
  { id: 'EVT-2026-008', nombre: 'Retiro Espiritual de Jóvenes', etiquetas: ['Retiro', 'Fin de semana'], departamentoId: 'juvenil', estado: 'finalizado', fechaInicio: '2026-10-10', fechaFin: '2026-10-12', ubicacion: 'Lagos de Montebello' },
  { id: 'EVT-2026-077', nombre: 'Escuela Sabática Filial: Plantando Iglesias', etiquetas: ['Misión'], departamentoId: 'escuela-sabatica', estado: 'en-curso', fechaInicio: '2026-11-01', fechaFin: '2026-11-30', ubicacion: 'Región Selva, Chiapas' },
  { id: 'EVT-2026-090', nombre: 'Taller de Finanzas Familiares', etiquetas: ['Taller', 'Familias'], departamentoId: 'mayordomia', estado: 'cancelado', fechaInicio: '2027-01-24', ubicacion: 'Iglesia Getsemaní, Tapachula' },
  { id: 'EVT-2026-064', nombre: 'Feria de Salud Comunitaria', etiquetas: ['Servicio', 'Comunidad'], departamentoId: 'evangelismo', estado: 'proximo', fechaInicio: '2027-02-07', ubicacion: 'Parque Central, Comitán' },
  { id: 'EVT-2026-019', nombre: 'Congreso de Jóvenes Adventistas Universitarios', etiquetas: ['Congreso', 'Universitarios'], departamentoId: 'juvenil', estado: 'finalizado', fechaInicio: '2026-09-19', ubicacion: 'Universidad Linda Vista, Pueblo Nuevo' },
  { id: 'EVT-2026-110', nombre: 'Sábado de la Mujer: Mujeres de Fe', etiquetas: ['Culto'], departamentoId: 'mujer', estado: 'proximo', fechaInicio: '2027-03-06', ubicacion: 'Todas las iglesias' },
  { id: 'EVT-2026-023', nombre: 'Clase Bíblica para Nuevos Creyentes', etiquetas: ['Estudio bíblico'], departamentoId: 'escuela-sabatica', estado: 'proximo', fechaInicio: '2027-01-09', ubicacion: 'En línea' },
  { id: 'EVT-2026-058', nombre: 'Campaña "Esperanza para Chiapas"', etiquetas: ['Evangelismo', 'Campaña'], departamentoId: 'personal', estado: 'en-curso', fechaInicio: '2026-11-08', fechaFin: '2026-11-29', ubicacion: 'Distrito Tuxtla Norte' },
  { id: 'EVT-2026-045', nombre: 'Rally de Aventureros y Conquistadores', etiquetas: ['Competencia'], departamentoId: 'evangelismo', estado: 'finalizado', fechaInicio: '2026-08-22', ubicacion: 'Unidad Deportiva, Tapachula' },
  { id: 'EVT-2026-071', nombre: 'Noche de Talentos Juveniles', etiquetas: ['Música', 'Arte'], departamentoId: 'juvenil', estado: 'proximo', fechaInicio: '2027-02-14', ubicacion: 'Auditorio UMCH' },
  { id: 'EVT-2026-082', nombre: 'Escuela Bíblica de Vacaciones', etiquetas: ['Niños', 'Verano'], departamentoId: 'infantil', estado: 'proximo', fechaInicio: '2027-07-12', fechaFin: '2027-07-16', ubicacion: 'Iglesias locales' },
];
