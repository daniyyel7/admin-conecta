import { simularEstadoApi } from './eventos-store';

describe('simularEstadoApi (estado según fechas)', () => {
  const hoy = new Date(2026, 10, 19); // 19 de noviembre de 2026

  it('antes del inicio es "proximo"', () => {
    expect(simularEstadoApi({ fechaInicio: '2026-11-20', fechaFin: '2026-11-22' }, hoy)).toBe('proximo');
  });

  it('entre inicio y fin (inclusive) es "en-curso"', () => {
    expect(simularEstadoApi({ fechaInicio: '2026-11-19', fechaFin: '2026-11-19' }, hoy)).toBe('en-curso');
    expect(simularEstadoApi({ fechaInicio: '2026-11-10', fechaFin: '2026-11-19' }, hoy)).toBe('en-curso');
  });

  it('después del fin es "finalizado"', () => {
    expect(simularEstadoApi({ fechaInicio: '2026-11-01', fechaFin: '2026-11-18' }, hoy)).toBe('finalizado');
  });
});
