import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EventosStore } from '../../services/eventos-store';
import { EVENTOS_MOCK } from '../../services/eventos.mock';
import { EventosList } from './eventos-list';

describe('EventosList', () => {
  let fixture: ComponentFixture<EventosList>;
  let el: HTMLElement;

  const nombresEnTabla = () =>
    [...el.querySelectorAll('table tbody tr td:first-child p:first-child')].map((p) =>
      p.textContent?.trim(),
    );
  const resumen = () => el.querySelector('[aria-live=polite]')?.textContent?.replace(/\s+/g, ' ');
  const buscar = async (texto: string) => {
    const input = el.querySelector<HTMLInputElement>('input[type=search]')!;
    input.value = texto;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventosList],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(EventosList);
    el = fixture.nativeElement;
    await esperar(450); // carga simulada (400 ms)
    await fixture.whenStable();
  });

  it('muestra los indicadores y la primera página', () => {
    const resumenCards = el.querySelectorAll('section[aria-label=Resumen] p.text-2xl');
    expect(resumenCards[0].textContent?.trim()).toBe(String(EVENTOS_MOCK.length));
    expect(resumenCards[1].textContent?.trim()).toBe('4');
    expect(nombresEnTabla()).toHaveLength(5);
    expect(el.textContent).toContain('Página 1 de 4');
  });

  it('busca sin importar acentos ni mayúsculas', async () => {
    await buscar('ESCUELA SABATICA');
    expect(resumen()).toContain('3 registros');
    expect(nombresEnTabla().every((n) => n)).toBe(true);
  });

  it('busca por fecha escrita', async () => {
    await buscar('diciembre 2026');
    expect(resumen()).toContain('4 registros');
  });

  it('pagina y desactiva "siguiente" en la última página', async () => {
    el.querySelector<HTMLButtonElement>('[aria-label="Página 4"]')!.click();
    await fixture.whenStable();
    expect(el.textContent).toContain('Mostrando 16 - 18 de 18');
    expect(el.querySelector<HTMLButtonElement>('[aria-label="Página siguiente"]')!.disabled).toBe(true);
  });

  it('el filtro de estado ofrece los estados de la API y Cancelado', async () => {
    el.querySelector<HTMLButtonElement>('app-estado-filter .filter-btn')!.click();
    await fixture.whenStable();
    const opciones = [...el.querySelectorAll('[role=option] span:first-child')].map((o) =>
      o.textContent?.trim(),
    );
    expect(opciones).toEqual(['Todos los estados', 'En curso', 'Próximo', 'Finalizado', 'Cancelado']);
  });

  it('el menú ⋮ solo ofrece cancelar y pide confirmación', async () => {
    const primero = nombresEnTabla()[0]!; // "En curso"
    el.querySelector<HTMLButtonElement>(`table [aria-label="Más acciones para ${primero}"]`)!.click();
    await fixture.whenStable();
    const items = [...el.querySelectorAll('table [role=menuitem]')].map((i) => i.textContent?.trim());
    expect(items).toEqual(['Cancelar evento']);

    el.querySelector<HTMLButtonElement>('table [role=menuitem]')!.click();
    await fixture.whenStable();
    const dialog = el.querySelector('dialog')!;
    expect(dialog.textContent).toContain('¿Cancelar evento?');
    [...dialog.querySelectorAll('button')].find((b) => b.textContent?.includes('Sí, cancelar'))!.click();
    await esperar(350);
    await fixture.whenStable();

    const store = TestBed.inject(EventosStore);
    expect(store.eventos()[0].estado).toBe('cancelado');
    expect(el.querySelector('table tbody tr .badge-estado')?.textContent?.trim()).toBe('Cancelado');
  });

  it('no deja cancelar un evento finalizado o ya cancelado', async () => {
    await buscar('Rally'); // finalizado
    el.querySelector<HTMLButtonElement>('table [aria-label^="Más acciones"]')!.click();
    await fixture.whenStable();
    const item = el.querySelector<HTMLButtonElement>('table [role=menuitem]')!;
    expect(item.disabled).toBe(true);
    expect(item.textContent).toContain('El evento ya finalizó');
  });

  it('muestra estado vacío cuando no hay coincidencias', async () => {
    await buscar('zzzz');
    expect(el.textContent).toContain('No hay eventos que coincidan');
  });

  it('elimina un evento después de confirmar', async () => {
    const primero = nombresEnTabla()[0]!;
    el.querySelector<HTMLButtonElement>(`table [aria-label="Eliminar ${primero}"]`)!.click();
    await fixture.whenStable();
    const dialog = el.querySelector('dialog')!;
    expect(dialog.textContent).toContain(primero);

    [...dialog.querySelectorAll('button')].find((b) => b.textContent?.includes('Eliminar'))!.click();
    await esperar(350); // eliminación simulada (300 ms)
    await fixture.whenStable();

    expect(el.querySelector('dialog')).toBeNull();
    expect(nombresEnTabla()).not.toContain(primero);
    expect(TestBed.inject(EventosStore).total()).toBe(EVENTOS_MOCK.length - 1);
  });
});
