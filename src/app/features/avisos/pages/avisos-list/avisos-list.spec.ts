import { ComponentFixture, TestBed } from '@angular/core/testing';
import { crearApiFalsa, proveerApiFalsa } from '../../../../../testing/api-falsa';
import { AvisosList } from './avisos-list';

describe('AvisosList', () => {
  let fixture: ComponentFixture<AvisosList>;
  let el: HTMLElement;
  let api: ReturnType<typeof crearApiFalsa>['estado'];
  const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const listo = async () => {
    await esperar(40);
    await fixture.whenStable();
  };
  const titulos = () => [...el.querySelectorAll('article h2')].map((h) => h.textContent?.trim());
  const boton = (texto: string, raiz: ParentNode = el) =>
    [...raiz.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      (b.getAttribute('aria-label') ?? b.textContent ?? '').includes(texto),
    )!;
  const escribir = (sel: string, v: string) => {
    const i = el.querySelector<HTMLInputElement | HTMLTextAreaElement>(sel)!;
    i.value = v;
    i.dispatchEvent(new Event('input'));
  };

  beforeEach(async () => {
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    TestBed.configureTestingModule({
      imports: [AvisosList],
      providers: proveerApiFalsa((estado) => (api = estado)),
    });
    fixture = TestBed.createComponent(AvisosList);
    el = fixture.nativeElement;
    await listo();
  });

  it('lista los avisos con su estado y filtra por ocultos', async () => {
    expect(titulos()).toEqual([
      'Cambio de horario para Evento',
      'Reunión General',
      'Mantengamos limpio el campamento',
    ]);
    expect(el.textContent).toContain('Importante');
    boton('Ocultos').click();
    await fixture.whenStable();
    expect(titulos()).toEqual(['Mantengamos limpio el campamento']);
  });

  it('valida el formulario y publica un aviso nuevo', async () => {
    boton('Nuevo aviso').click();
    await fixture.whenStable();
    el.querySelector<HTMLButtonElement>('button[form=aviso-form]')!.click();
    await fixture.whenStable();
    expect(el.querySelectorAll('#aviso-form .form-error').length).toBe(2);

    escribir('#aviso-titulo', 'Cena de clausura');
    escribir('#aviso-mensaje', 'Los esperamos a las 8 p. m. en el comedor.');
    escribir('#aviso-fecha', '2026-08-20');
    boton('Importante', el.querySelector('#aviso-form')!).click();
    el.querySelector<HTMLButtonElement>('button[form=aviso-form]')!.click();
    await listo();

    expect(api.avisos[0]).toMatchObject({
      titulo: 'Cena de clausura',
      fecha: '2026-08-20',
      importante: true,
      visible: true,
      icono: 'material-symbols:notifications',
    });
    expect(titulos()[0]).toBe('Cena de clausura');
    expect(el.textContent).toContain('Se publicó "Cena de clausura".');
  });

  it('edita, oculta y elimina', async () => {
    boton('Editar aviso Reunión General').click();
    await fixture.whenStable();
    expect(el.querySelector<HTMLInputElement>('#aviso-titulo')!.value).toBe('Reunión General');
    escribir('#aviso-titulo', 'Reunión General (cambio de lugar)');
    el.querySelector<HTMLButtonElement>('button[form=aviso-form]')!.click();
    await listo();
    expect(api.avisos.find((a) => a.id === '3')?.titulo).toBe('Reunión General (cambio de lugar)');

    boton('Visible en la app: Cambio de horario').click();
    await listo();
    expect(api.avisos.find((a) => a.id === '2')?.visible).toBe(false);

    boton('Eliminar aviso Mantengamos').click();
    await fixture.whenStable();
    boton('Eliminar', el.querySelector('app-confirm-dialog')!).click();
    await listo();
    expect(api.avisos.map((a) => a.id)).not.toContain('1');
    expect(titulos()).not.toContain('Mantengamos limpio el campamento');
  });
});
