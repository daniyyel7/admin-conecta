import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { proveerApiFalsa } from '../../../../testing/api-falsa';
import { ColeccionesStore } from './colecciones-store';

describe('ColeccionesStore (contra la API falsa)', () => {
  let store: ColeccionesStore;
  const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: proveerApiFalsa() });
    store = TestBed.inject(ColeccionesStore);
    store.load();
    await esperar(50);
  });

  it('carga las colecciones con la forma del JSON de la API', () => {
    const libros = store.getById('1')!;
    expect(libros.title).toBe('Libros UMCH 2026');
    expect(libros.numberReources).toBe('5 archivos');
    expect(libros.resources[0]).toMatchObject({ type: 'pdf', apartment: 'Escuela Sabática', status: 'En curso' });
  });

  it('crea una colección vacía con estado y link asignados por la API', async () => {
    const col = await firstValueFrom(
      store.createCollection({
        title: 'Nueva',
        description: 'Desc',
        apartment: 'Ministerio Juvenil',
        category: 'Libros',
        date: '2099-01-01',
        location: 'En línea',
        visible: true,
      }),
    );
    expect(col).toMatchObject({ status: 'Próximo', link: `/recursos/${col.id}`, numberReources: '0 archivos', resources: [] });
    expect(store.colecciones()[0].id).toBe(col.id);
  });

  it('el recurso hereda departamento, categoría, fecha y estado de su colección', async () => {
    const r = await firstValueFrom(
      store.addResource('2', { type: 'link', title: 'Web', description: 'd', link: 'https://x.org', visible: true }),
    );
    const col = store.getById('2')!;
    expect(r).toMatchObject({ apartment: col.apartment, category: col.category, date: col.date, status: col.status });
    expect(col.numberReources).toBe('5 archivos');
  });

  it('edita, oculta y elimina recursos actualizando el conteo', async () => {
    const id = store.getById('1')!.resources[0].id;
    await firstValueFrom(store.setResourceVisible('1', id, false));
    expect(store.getById('1')!.resources[0].visible).toBe(false);

    await firstValueFrom(store.removeResource('1', id));
    expect(store.getById('1')!.resources).toHaveLength(4);
    expect(store.getById('1')!.numberReources).toBe('4 archivos');
  });

  it('al editar la colección sus recursos toman los nuevos datos', async () => {
    const col = store.getById('4')!;
    await firstValueFrom(store.updateCollection('4', { ...col, apartment: 'Ministerio Personal', category: 'Estudios' }));
    expect(store.getById('4')!.resources.every((r) => r.apartment === 'Ministerio Personal' && r.category === 'Estudios')).toBe(true);
  });

  it('los errores de la API llegan con su mensaje', async () => {
    await expect(firstValueFrom(store.removeResource('1', '999'))).rejects.toThrow('El recurso no existe.');
  });

  it('sube el archivo a la carpeta de la colección con progreso y devuelve la URL', async () => {
    const eventos: number[] = [];
    let url: string | undefined;
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    await new Promise<void>((resolve) =>
      store.upload(file, 'pdf', '1').subscribe({
        next: (p) => {
          eventos.push(p.progress);
          url = p.url ?? url;
        },
        complete: resolve,
      }),
    );
    expect(eventos.at(-1)).toBe(100);
    expect(eventos.length).toBeGreaterThan(2);
    expect(url).toBe('https://app.umch.org.mx/media/publico/pdf/col-1/a.pdf');
  });
});
