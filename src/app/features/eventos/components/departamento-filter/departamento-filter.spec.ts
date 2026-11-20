import { DEPARTAMENTOS_DEMO } from '../../../../../testing/api-falsa';
import { TestBed } from '@angular/core/testing';
import { DepartamentoFilter } from './departamento-filter';

describe('DepartamentoFilter', () => {
  const opciones = DEPARTAMENTOS_DEMO.slice(0, 3).map((depto, i) => ({ depto, count: i + 1 }));

  async function setup() {
    const fixture = TestBed.createComponent(DepartamentoFilter);
    fixture.componentRef.setInput('opciones', opciones);
    const emitted: Set<string>[] = [];
    fixture.componentInstance.selectedChange.subscribe((s) => emitted.push(s));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('.filter-btn')!.click();
    await fixture.whenStable();
    return { fixture, el, emitted };
  }

  it('muestra "Todos" con todos marcados al abrir', async () => {
    const { el } = await setup();
    expect(el.querySelector('.filter-btn')?.textContent).toContain('Todos (3)');
    const checks = el.querySelectorAll<HTMLInputElement>('#depto-popover input[type=checkbox]');
    expect([...checks].every((c) => c.checked)).toBe(true);
    expect(el.textContent).toContain('6 evts');
  });

  it('aplica solo lo seleccionado y marca "seleccionar todo" como parcial', async () => {
    const { fixture, el, emitted } = await setup();
    const checks = el.querySelectorAll<HTMLInputElement>('#depto-popover input[type=checkbox]');
    checks[1].click(); // desmarca el primer departamento
    await fixture.whenStable();
    expect(checks[0].indeterminate).toBe(true);

    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Aplicar'))!.click();
    expect([...emitted[0]]).toEqual([opciones[1].depto.id, opciones[2].depto.id]);
  });

  it('filtra la lista con el buscador y "Limpiar" quita el filtro', async () => {
    const { fixture, el, emitted } = await setup();
    const search = el.querySelector<HTMLInputElement>('#depto-popover input[type=search]')!;
    search.value = 'juvenil';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(el.querySelectorAll('#depto-popover li label')).toHaveLength(1);

    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Limpiar'))!.click();
    expect(emitted[0].size).toBe(0);
  });
});
