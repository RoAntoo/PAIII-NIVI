import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { DeviceCapabilitiesService } from '../../../../core/device/device-capabilities.service';
import { DEVICE_GEOLOCATION } from '../../../../core/device/location.service';
import { DEFAULT_SETTINGS, NiviSettings, SettingsService } from '../../../../core/settings/settings.service';
import { TaskPlacesComponent } from './task-places.component';

describe('task place suggestions', () => {
  const path = `${environment.apiUrl}/places/nearby`;
  const place = {
    id: 'ChIJ_test', name: 'Ferretería de prueba', address: 'Calle de prueba 123',
    lat: -34.60, lng: -58.41, attributions: [],
  };
  const coordinates = { coords: { latitude: -34.61, longitude: -58.41, accuracy: 400 } };
  let fixture: ComponentFixture<TaskPlacesComponent>;
  let http: HttpTestingController;
  let settings: WritableSignal<NiviSettings>;
  const geo = {
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
    getCurrentPosition: vi.fn(),
  };

  beforeEach(() => {
    geo.checkPermissions.mockReset();
    geo.requestPermissions.mockReset();
    geo.getCurrentPosition.mockReset();
    geo.checkPermissions.mockResolvedValue({ coarseLocation: 'granted', location: 'denied' });
    geo.getCurrentPosition.mockResolvedValue(coordinates);
    settings = signal({ ...DEFAULT_SETTINGS, enablePlaceSuggestions: true });
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: SettingsService, useValue: { loaded: signal(true), settings } },
      { provide: DeviceCapabilitiesService, useValue: {
        supports: () => true,
        moduleAvailable: (_: unknown, flags: typeof DEFAULT_SETTINGS) => flags.enablePlaceSuggestions,
      } },
      { provide: DEVICE_GEOLOCATION, useValue: geo },
    ] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TaskPlacesComponent);
    fixture.componentRef.setInput('title', 'Comprar tornillos');
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function click(label: string): void {
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const button = Array.from(buttons).find(item => item.textContent?.trim() === label);
    expect(button).toBeDefined();
    button!.click();
    fixture.detectChanges();
  }

  it('does not read location or call Places while typing, on a study task or with Places disabled', () => {
    expect(fixture.nativeElement.textContent).toContain('Buscar ferreterías');
    expect(geo.checkPermissions).not.toHaveBeenCalled();
    fixture.componentRef.setInput('title', 'Estudiar Programación Avanzada');
    fixture.detectChanges();
    fixture.componentInstance.search();
    expect(fixture.nativeElement.textContent).not.toContain('Buscar cerca');
    settings.set(DEFAULT_SETTINGS);
    fixture.componentRef.setInput('title', 'Comprar medicamentos');
    fixture.detectChanges();
    fixture.componentInstance.search();
    expect(geo.checkPermissions).not.toHaveBeenCalled();
    http.expectNone(path);
  });

  it('explains a denied permission and leaves the task unchanged', async () => {
    geo.checkPermissions.mockResolvedValue({ coarseLocation: 'prompt', location: 'prompt' });
    geo.requestPermissions.mockResolvedValue({ coarseLocation: 'denied', location: 'denied' });
    click('Buscar cerca');
    await vi.waitFor(() => expect(fixture.componentInstance.searchError()).toContain('NIVI no tiene permiso'));
    fixture.detectChanges();
    expect(geo.requestPermissions).toHaveBeenCalledWith({ permissions: ['coarseLocation'] });
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('NIVI no tiene permiso de ubicación');
    expect(fixture.componentInstance.placeId()).toBeNull();
    http.expectNone(path);
  });

  it('ignores a pending location result when the task changes to a different intent', async () => {
    let releasePosition!: (position: typeof coordinates) => void;
    geo.getCurrentPosition.mockReturnValue(new Promise(resolve => { releasePosition = resolve; }));
    click('Buscar cerca');
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalledOnce());
    fixture.componentRef.setInput('title', 'Comprar medicamentos');
    fixture.detectChanges();
    releasePosition(coordinates);
    await fixture.whenStable();
    http.expectNone(path);
  });

  it('sends only search coordinates and category, then changes the association on explicit selection', async () => {
    click('Buscar cerca');
    const request = await vi.waitFor(() => http.expectOne({ method: 'POST', url: path }));
    expect(request.request.body).toEqual({ lat: -34.61, lng: -58.41, category: 'HARDWARE', radius: 3000 });
    request.flush([place]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('en línea recta');
    expect(fixture.nativeElement.querySelector('a').href).toContain('query_place_id=ChIJ_test');
    expect(fixture.componentInstance.placeId()).toBeNull();
    click('Asociar a la tarea');
    expect(fixture.componentInstance.placeId()).toBe(place.id);
    click('Quitar lugar');
    expect(fixture.componentInstance.placeId()).toBeNull();
  });

  it('loads a stored association only on demand and without geolocation', () => {
    fixture.componentRef.setInput('placeId', place.id);
    fixture.detectChanges();
    const detailsPath = `${environment.apiUrl}/places/${place.id}`;
    http.expectNone(detailsPath);
    click('Ver lugar asociado');
    http.expectOne({ method: 'GET', url: detailsPath }).flush(place);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(place.name);
    expect(geo.checkPermissions).not.toHaveBeenCalled();
  });

  it('offers a retry after a rate limit and reports an empty result without invented places', async () => {
    click('Buscar cerca');
    const limited = await vi.waitFor(() => http.expectOne(path));
    limited.flush({}, { status: 429, statusText: 'Too Many Requests' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('límite de búsquedas');
    click('Buscar de nuevo');
    const retried = await vi.waitFor(() => http.expectOne(path));
    retried.flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No encontramos lugares');
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
    click('No me interesa');
    expect(fixture.nativeElement.textContent).not.toContain('Buscar ferreterías');
  });

  it('keeps each dismissed category hidden for the rest of the form', () => {
    click('No me interesa');
    fixture.componentRef.setInput('title', 'Comprar medicamentos');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Buscar farmacias');
    click('No me interesa');
    fixture.componentRef.setInput('title', 'Comprar tornillos');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Buscar ferreterías');
  });
});
