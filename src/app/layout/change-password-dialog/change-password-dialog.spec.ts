import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ChangePasswordDialog } from './change-password-dialog';

describe('ChangePasswordDialog', () => {
  let fixture: ComponentFixture<ChangePasswordDialog>;
  let el: HTMLElement;
  const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const escribir = (sel: string, v: string) => {
    const i = el.querySelector<HTMLInputElement>(sel)!;
    i.value = v;
    i.dispatchEvent(new Event('input'));
  };
  const enviar = async () => {
    el.querySelector<HTMLButtonElement>('button[form=change-password-form]')!.click();
    await fixture.whenStable();
  };
  const errores = () => [...el.querySelectorAll('.form-error')].map((e) => e.textContent?.trim());

  beforeEach(async () => {
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    fixture = TestBed.createComponent(ChangePasswordDialog);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('pide los tres campos', async () => {
    await enviar();
    expect(errores()).toEqual([
      'Escribe tu contraseña actual.',
      'Escribe la nueva contraseña.',
      'Vuelve a escribir la nueva contraseña.',
    ]);
  });

  it('no deja usar la misma contraseña ni confirmar con otra distinta', async () => {
    escribir('#cp-current', 'Conecta2026');
    escribir('#cp-password', 'Conecta2026');
    escribir('#cp-confirm', 'Conecta2027');
    await enviar();
    expect(errores()).toEqual([
      'La nueva contraseña debe ser diferente a la actual.',
      'Las contraseñas no coinciden.',
    ]);
  });

  it('muestra el error del servidor si la contraseña actual no es correcta', async () => {
    escribir('#cp-current', 'abc'); // el mock la rechaza
    escribir('#cp-password', 'Conecta2027');
    escribir('#cp-confirm', 'Conecta2027');
    await enviar();
    await esperar(750);
    await fixture.whenStable();
    expect(errores()).toEqual(['La contraseña actual no es correcta.']);
  });

  it('confirma cuando se cambió', async () => {
    escribir('#cp-current', 'Conecta2026');
    escribir('#cp-password', 'Conecta2027');
    escribir('#cp-confirm', 'Conecta2027');
    await enviar();
    await esperar(750);
    await fixture.whenStable();
    expect(el.textContent).toContain('Tu contraseña se actualizó');
  });
});
