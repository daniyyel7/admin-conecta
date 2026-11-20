import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { EventosStore } from '../../services/eventos-store';
import { EventoForm } from './evento-form';

describe('EventoForm', () => {
  let fixture: ComponentFixture<EventoForm>;
  let el: HTMLElement;
  let store: EventosStore;
  const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const escribir = (selector: string, valor: string, evento = 'input') => {
    const input = el.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
    input.value = valor;
    input.dispatchEvent(new Event(evento));
  };
  const enviar = async () => {
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
  };
  const errores = () => [...el.querySelectorAll('.form-error')].map((e) => e.textContent?.trim());

  async function crear(id?: string) {
    await TestBed.configureTestingModule({
      imports: [EventoForm],
      providers: [provideRouter([])],
    }).compileComponents();
    store = TestBed.inject(EventosStore);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(EventoForm);
    if (id) fixture.componentRef.setInput('id', id);
    el = fixture.nativeElement;
    await esperar(450); // carga simulada de la lista
    await fixture.whenStable();
  }

  it('marca los campos obligatorios al guardar vacío', async () => {
    await crear();
    await enviar();
    expect(el.textContent).toContain('Revisa los campos marcados');
    expect(errores()).toEqual([
      'Escribe el nombre del evento.',
      'Escribe una descripción del evento.',
      'Elige la fecha de inicio.',
      'Elige la fecha de fin.',
      'Indica dónde se realizará.',
      'Sube una imagen de portada.',
      'Elige el departamento responsable.',
    ]);
  });

  it('no tiene etiquetas ni permite elegir el estado', async () => {
    await crear();
    expect(el.querySelector('#etiqueta-input')).toBeNull();
    expect(el.querySelector('input[type=radio]')).toBeNull();
    expect(el.textContent).toContain('Se asigna automáticamente según las fechas');
  });

  it('no acepta una fecha de fin anterior a la de inicio', async () => {
    await crear();
    escribir('#fechaInicio', '2027-03-20');
    escribir('#fechaFin', '2027-03-18');
    await enviar();
    expect(errores()).toContain('Debe ser igual o posterior a la fecha de inicio.');
  });


  it('crea un evento válido y vuelve a la lista', async () => {
    await crear();
    const total = store.total();
    escribir('#nombre', 'Congreso Juvenil 2027');
    escribir('#descripcion', 'Congreso anual para jóvenes de toda la unión.');
    escribir('#fechaInicio', '2027-03-20');
    escribir('#fechaFin', '2027-03-22');
    escribir('#ubicacion', 'Auditorio UMCH');
    escribir('#departamentoId', 'juvenil', 'change');
    // La imagen se carga con FileReader; aquí se simula ya cargada.
    (fixture.componentInstance as unknown as { form: { controls: { imagen: { setValue(v: string): void } } } })
      .form.controls.imagen.setValue('data:image/png;base64,AAAA');
    await fixture.whenStable();
    expect(errores()).toEqual([]);
    await enviar();
    await esperar(550); // guardado simulado
    await fixture.whenStable();

    expect(store.total()).toBe(total + 1);
    expect(store.eventos()[0]).toMatchObject({
      nombre: 'Congreso Juvenil 2027',
      descripcion: 'Congreso anual para jóvenes de toda la unión.',
      departamentoId: 'juvenil',
      estado: 'proximo', // asignado por la "API" según las fechas (2027)
      fechaFin: '2027-03-22',
      etiquetas: [],
    });
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/eventos'], expect.anything());
  });

  it('al editar rellena los datos del evento', async () => {
    await crear('EVT-2026-056');
    expect(el.querySelector('h1')?.textContent).toContain('Editar evento');
    expect(el.querySelector<HTMLInputElement>('#nombre')!.value).toBe('Vigilia de Consagración "Revive 2026"');
    expect(el.querySelector<HTMLSelectElement>('#departamentoId')!.value).toBe('personal');
    expect(el.querySelector('.badge-estado')?.textContent?.trim()).toBe('Próximo');
  });


  it('muestra "no encontrado" con un ID inexistente', async () => {
    await crear('EVT-0000');
    expect(el.textContent).toContain('No encontramos el evento');
  });

  it('pide confirmación para salir solo si hay cambios', async () => {
    await crear();
    const form = fixture.componentInstance;
    expect(form.canLeave()).toBe(true);

    escribir('#nombre', 'Algo');
    await fixture.whenStable();
    const salida = form.canLeave();
    expect(salida).toBeInstanceOf(Promise);
    await fixture.whenStable();
    expect(el.querySelector('dialog')?.textContent).toContain('¿Salir sin guardar?');

    [...el.querySelectorAll<HTMLButtonElement>('dialog button')]
      .find((b) => b.textContent?.includes('Seguir editando'))!
      .click();
    await expect(salida).resolves.toBe(false);
  });
});
