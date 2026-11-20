import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ColeccionesStore } from '../../services/colecciones-store';
import { RecursoFormDialog, validarArchivo } from './recurso-form-dialog';

describe('validarArchivo', () => {
  const mb = (n: number) => new Uint8Array(n * 1024 * 1024);

  it('acepta por extensión o por tipo MIME', () => {
    expect(validarArchivo(new File(['x'], 'a.pdf', { type: 'application/pdf' }), '.pdf,application/pdf', 25)).toBeNull();
    expect(validarArchivo(new File(['x'], 'canto.mp3', { type: 'audio/mpeg' }), 'audio/*', 100)).toBeNull();
    expect(validarArchivo(new File(['x'], 'tabla.xlsx'), '.doc,.docx,.xls,.xlsx', 25)).toBeNull();
  });

  it('rechaza tipos que no corresponden y archivos muy pesados', () => {
    expect(validarArchivo(new File(['x'], 'foto.png', { type: 'image/png' }), '.pdf,application/pdf', 25)).toContain('no corresponde');
    expect(validarArchivo(new File([mb(11)], 'grande.png', { type: 'image/png' }), 'image/*', 10)).toContain('más de 10 MB');
  });
});

describe('RecursoFormDialog', () => {
  let fixture: ComponentFixture<RecursoFormDialog>;
  let el: HTMLElement;

  const elegirTipo = async (label: string) => {
    [...el.querySelectorAll<HTMLButtonElement>('.type-option')].find((b) => b.textContent?.includes(label))!.click();
    await fixture.whenStable();
  };
  const escribir = (sel: string, v: string) => {
    const i = el.querySelector<HTMLInputElement>(sel)!;
    i.value = v;
    i.dispatchEvent(new Event('input'));
  };
  const errores = () => [...el.querySelectorAll('#recurso-form .form-error')].map((e) => e.textContent?.trim());

  beforeEach(async () => {
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    fixture = TestBed.createComponent(RecursoFormDialog);
    fixture.componentRef.setInput('coleccionId', '1');
    el = fixture.nativeElement;
    TestBed.inject(ColeccionesStore).load();
    await new Promise((r) => setTimeout(r, 450));
    await fixture.whenStable();
  });

  it('pide elegir el tipo antes que nada', async () => {
    el.querySelector<HTMLButtonElement>('button[form=recurso-form]')!.click();
    await fixture.whenStable();
    expect(errores()).toContain('Elige qué tipo de recurso vas a agregar.');
    expect(el.querySelector('#recurso-title')).toBeNull();
  });

  it('PDF muestra zona de archivo con formato y tamaño; Drive muestra un enlace', async () => {
    await elegirTipo('PDF');
    expect(el.querySelector('.dropzone')?.textContent).toContain('PDF · máx. 25 MB');
    expect(el.querySelector<HTMLInputElement>('#recurso-file')!.accept).toBe('.pdf,application/pdf');
    expect(el.querySelector('#recurso-link')).toBeNull();

    await elegirTipo('Google Drive');
    expect(el.querySelector('.dropzone')).toBeNull();
    expect(el.querySelector('#recurso-link')).not.toBeNull();
  });

  it('valida que el enlace de Drive sea de Google Drive', async () => {
    await elegirTipo('Google Drive');
    escribir('#recurso-link', 'https://dropbox.com/x');
    escribir('#recurso-title', 'Carpeta');
    escribir('#recurso-description', 'Material');
    el.querySelector<HTMLButtonElement>('button[form=recurso-form]')!.click();
    await fixture.whenStable();
    expect(errores()).toEqual(['El enlace no es válido para Google Drive.']);

    escribir('#recurso-link', 'https://drive.google.com/drive/folders/abc');
    await fixture.whenStable();
    expect(errores()).toEqual([]);
  });

  it('video permite elegir entre subir archivo o enlace de YouTube/Vimeo', async () => {
    await elegirTipo('Video');
    const seg = [...el.querySelectorAll<HTMLButtonElement>('.seg')];
    expect(seg.map((s) => s.textContent?.trim())).toEqual(['Subir archivo', 'YouTube / Vimeo']);
    expect(el.querySelector('.dropzone')).not.toBeNull();

    seg[1].click();
    await fixture.whenStable();
    expect(el.querySelector<HTMLInputElement>('#recurso-link')!.placeholder).toContain('youtube');
  });
});
