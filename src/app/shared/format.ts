/** "2026-03-14" → "14 de marzo de 2026" */
export function formatFecha(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(y, m - 1, d),
  );
}

/** Minúsculas y sin acentos, para buscar sin importar cómo se escriba. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
