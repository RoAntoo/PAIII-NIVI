import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { PermissionState } from '@capacitor/core';
import { environment } from '../../../../../environments/environment';
import { DeviceCapabilitiesService } from '../../../../core/device/device-capabilities.service';
import { TASK_IMPORT_BRIDGE } from '../../../../core/device/task-import.service';
import { SETTINGS_STORAGE, SettingsService } from '../../../../core/settings/settings.service';
import { TaskListComponent } from '../task-list/task-list.component';
import { TaskImportComponent } from './task-import.component';

describe('task import review and save', () => {
  const path = environment.apiUrl + '/projects/12/tasks';
  const validQr = 'nivi-task:v1:eyJ0aXRsZSI6IlJldmlzYXIgcHJlc2VudGFjacOzbiIsImNhdGVnb3J5IjoiRVNUVURJTyIsImVzdGltYXRlSG91cnMiOjJ9';

  async function setup(source: 'OCR' | 'QR' = 'OCR') {
    const bridge = {
      checkPermissions: vi.fn(async (): Promise<{ camera: PermissionState }> => ({ camera: 'prompt' })),
      requestPermissions: vi.fn(async (): Promise<{ camera: PermissionState }> => ({ camera: 'granted' })),
      readPhoto: vi.fn(async () => ({ lines: ['Lista de tareas', 'A', 'B', 'C', 'D', 'E'] })),
      scanQr: vi.fn(async () => ({ value: validQr })),
    };
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ projectId: '12' }), data: { source } } } },
      { provide: TASK_IMPORT_BRIDGE, useValue: bridge },
      { provide: SETTINGS_STORAGE, useValue: { get: async () => ({ value: null }), set: async () => {} } },
    ] });
    const settings = TestBed.inject(SettingsService);
    await settings.ready;
    vi.spyOn(TestBed.inject(DeviceCapabilitiesService), 'moduleAvailable')
      .mockImplementation((module, preferences) => preferences[module.key]);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(TaskImportComponent);
    fixture.detectChanges();
    return { bridge, fixture, navigate, settings, component: fixture.componentInstance };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('selects exactly three of five corrected OCR tasks and ignores double confirmation', async () => {
    const { component, bridge, navigate, fixture } = await setup();
    const http = TestBed.inject(HttpTestingController);
    await component.read('gallery');
    expect(bridge.readPhoto).toHaveBeenCalledWith({ source: 'gallery' });
    expect(bridge.checkPermissions).not.toHaveBeenCalled();
    fixture.detectChanges();
    const fields = fixture.nativeElement.querySelectorAll('textarea') as NodeListOf<HTMLTextAreaElement>;
    expect(fields).toHaveLength(5);
    fields[0].value = 'Comprar jabón';
    fields[0].dispatchEvent(new Event('input'));
    const selection = fixture.nativeElement.querySelectorAll('input[type=checkbox]') as NodeListOf<HTMLInputElement>;
    selection[1].click();
    selection[3].click();
    expect(component.pendingCount()).toBe(3);
    http.expectNone(path);

    const save = component.save();
    await component.save();
    const seenKeys = new Set();
    for (const title of ['Comprar jabón', 'C', 'E']) {
      const request = http.expectOne({ method: 'POST', url: path });
      expect(request.request.body).toMatchObject({ title, source: 'OCR', category: 'GENERAL' });
      seenKeys.add(request.request.body.clientRequestId);
      request.flush({ id: seenKeys.size, ...request.request.body });
      await Promise.resolve();
    }
    await save;
    expect(seenKeys.size).toBe(3);
    expect(navigate).toHaveBeenCalledOnce();
  });

  it('handles a canceled photo, an empty image, and permission denial without writing tasks', async () => {
    const { component, bridge } = await setup();
    bridge.readPhoto.mockRejectedValueOnce({ code: 'CANCELED' });
    await component.read('gallery');
    expect(component.importError()).toBeNull();
    expect(component.reviewed()).toBe(false);
    bridge.readPhoto.mockResolvedValueOnce({ lines: ['...'] });
    await component.read('gallery');
    expect(component.importError()).toContain('No se encontró texto');
    bridge.requestPermissions.mockResolvedValueOnce({ camera: 'denied' });
    await component.read('camera');
    expect(bridge.readPhoto).toHaveBeenCalledTimes(2);
    expect(component.importError()).toContain('cámara está deshabilitada');
    await component.save();
    TestBed.inject(HttpTestingController).expectNone(path);
  });

  it('discards a reviewed import when leaving without confirming', async () => {
    const { component, fixture } = await setup();
    await component.read('gallery');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cancelar revisión');
    fixture.destroy();
    TestBed.inject(HttpTestingController).expectNone(path);
  });

  it('rejects external QR data and saves a valid QR only after editing and confirming', async () => {
    const { component, bridge, navigate } = await setup('QR');
    const http = TestBed.inject(HttpTestingController);
    bridge.scanQr.mockResolvedValueOnce({ value: 'https://example.org/qr' });
    await component.read();
    expect(component.importError()).toContain('plantilla NIVI');
    expect(component.rows()).toEqual([]);
    await component.read();
    expect(bridge.requestPermissions).toHaveBeenCalledWith({ permissions: ['camera'] });
    const row = component.rows()[0];
    expect(row).toMatchObject({ title: 'Revisar presentación', category: 'ESTUDIO', estimateHours: 2 });
    component.update(row, { title: 'Revisar presentación oral' });
    http.expectNone(path);
    const save = component.save();
    const request = http.expectOne({ method: 'POST', url: path });
    expect(request.request.body).toMatchObject({
      title: 'Revisar presentación oral', category: 'ESTUDIO', estimateHours: 2, source: 'QR',
    });
    request.flush({ id: 1, ...request.request.body });
    await save;
    expect(navigate).toHaveBeenCalledWith(['/projects', 12, 'tasks']);
  });

  it('gates the OCR and QR entries independently of each other and of manual entry', async () => {
    const { component, settings, bridge } = await setup();
    const list = TestBed.createComponent(TaskListComponent);
    list.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(path).flush([]);
    expect(list.nativeElement.querySelector('a[href$="/ocr"]')).not.toBeNull();
    expect(list.nativeElement.querySelector('a[href$="/qr"]')).not.toBeNull();
    await settings.set('enableOcr', false);
    list.detectChanges();
    expect(list.nativeElement.querySelector('a[href$="/ocr"]')).toBeNull();
    expect(list.nativeElement.querySelector('a[href$="/qr"]')).not.toBeNull();
    await component.read();
    expect(bridge.readPhoto).not.toHaveBeenCalled();
    await settings.set('enableQr', false);
    list.detectChanges();
    expect(list.nativeElement.querySelector('a[href$="/qr"]')).toBeNull();
    expect(list.nativeElement.querySelector('a[href$="/new"]')).not.toBeNull();
  });
});
