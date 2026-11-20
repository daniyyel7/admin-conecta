import { ComponentFixture, TestBed } from '@angular/core/testing';
import { setDepartamentos } from '../../../../core/catalogos/departamentos';
import { crearApiFalsa, DEPARTAMENTOS_DEMO, proveerApiFalsa } from '../../../../../testing/api-falsa';
import { EventosInicio } from './eventos-inicio';

describe('EventosInicio', () => {
  let fixture: ComponentFixture<EventosInicio>;
  let el: HTMLElement;
  let api: ReturnType<typeof crearApiFalsa>['estado'];
  const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const nombres = () =>
    [...el.querySelectorAll('ol li p.text-sm')].map((p) => p.textContent?.trim().slice(0, 18));
  const boton = (texto: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      (b.getAttribute('aria-label') ?? b.textContent ?? '').includes(texto),
    )!;
  const agregar = async (id: string) => {
    const select = el.querySelector<HTMLSelectElement>('#inicio-agregar')!;
    select.value = id;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };

  async function crear(inicial: string[] = []) {
    setDepartamentos(DEPARTAMENTOS_DEMO);
    await TestBed.configureTestingModule({
      imports: [EventosInicio],
      providers: proveerApiFalsa((estado) => {
        estado.inicio = inicial;
        api = estado;
      }),
    }).compileComponents();
    fixture = TestBed.createComponent(EventosInicio);
    el = fixture.nativeElement;
    await esperar(60);
    await fixture.whenStable();
  }

  it('sin eventos elegidos lo explica y deja agregar solo en curso o próximos', async () => {
    await crear();
    expect(el.textContent).toContain('la app no mostrará eventos en su Inicio');
    const opciones = [...el.querySelectorAll<HTMLOptionElement>('#inicio-agregar option')].map((o) => o.value);
    expect(opciones).toContain('EVT-2026-034'); // próximo
    expect(opciones).not.toContain('EVT-2026-008'); // finalizado
    expect(opciones).not.toContain('EVT-2026-090'); // cancelado
    expect(boton('Guardar').disabled).toBe(true);
  });

  it('agrega, reordena, quita y guarda en el orden elegido', async () => {
    await crear();
    await agregar('EVT-2026-034');
    await agregar('EVT-2026-012');
    await agregar('EVT-2026-056');
    expect(nombres()).toEqual(['Congreso Juvenil: ', 'Camporee de Conqui', 'Vigilia de Consagr']);

    boton('Subir Vigilia').click();
    await fixture.whenStable();
    boton('Quitar Congreso').click();
    await fixture.whenStable();
    // Vigilia subió un lugar (antes de Camporee) y Congreso salió.
    expect(nombres()).toEqual(['Vigilia de Consagr', 'Camporee de Conqui']);

    boton('Guardar').click();
    await esperar(40);
    await fixture.whenStable();
    expect(api.inicio).toEqual(['EVT-2026-056', 'EVT-2026-012']);
    expect(el.textContent).toContain('Se guardó el Inicio de la app.');
    expect(boton('Guardar').disabled).toBe(true);
  });

  it('no deja pasar de 5 eventos', async () => {
    await crear(['EVT-2026-012', 'EVT-2026-034', 'EVT-2026-021', 'EVT-2026-056', 'EVT-2026-013']);
    const select = el.querySelector<HTMLSelectElement>('#inicio-agregar')!;
    expect(select.disabled).toBe(true);
    expect(select.textContent).toContain('Máximo 5 eventos');
    expect(el.textContent).toContain('5 de 5');
  });

  it('marca los elegidos que ya no se muestran y los quita al guardar', async () => {
    await crear(['EVT-2026-090', 'EVT-2026-034']);
    expect(el.textContent).toContain('No se muestra en la app');

    boton('Bajar Taller').click(); // ahora hay un cambio pendiente
    await fixture.whenStable();
    boton('Guardar').click();
    await esperar(40);
    await fixture.whenStable();
    expect(api.inicio).toEqual(['EVT-2026-034']);
    expect(el.textContent).not.toContain('No se muestra en la app');
  });

  it('descartar vuelve a lo guardado', async () => {
    await crear(['EVT-2026-034']);
    await agregar('EVT-2026-012');
    expect(nombres()).toHaveLength(2);
    boton('Descartar cambios').click();
    await fixture.whenStable();
    expect(nombres()).toEqual(['Congreso Juvenil: ']);
  });
});
