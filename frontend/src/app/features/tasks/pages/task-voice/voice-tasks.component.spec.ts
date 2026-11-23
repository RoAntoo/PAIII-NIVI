import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { PermissionState } from '@capacitor/core';
import { environment } from '../../../../../environments/environment';
import { DeviceCapabilitiesService } from '../../../../core/device/device-capabilities.service';
import { VOICE_RECOGNITION } from '../../../../core/device/speech.service';
import { SETTINGS_STORAGE, SettingsService } from '../../../../core/settings/settings.service';
import { TaskListComponent } from '../task-list/task-list.component';
import { VoiceTasksComponent } from './voice-tasks.component';

describe('voice tasks', () => {
  const path = environment.apiUrl + '/projects/12/tasks';
  let fixture: ComponentFixture<VoiceTasksComponent>;
  let component: VoiceTasksComponent;
  let http: HttpTestingController;
  let preferences: SettingsService;
  let recognition: ReturnType<typeof createRecognition>;
  let navigate: Router['navigate'];

  function createRecognition() {
    return {
      available: vi.fn(async () => ({ available: true })),
      checkPermissions: vi.fn(async (): Promise<{ microphone: PermissionState }> => ({ microphone: 'prompt' })),
      requestPermissions: vi.fn(async (): Promise<{ microphone: PermissionState }> => ({ microphone: 'granted' })),
      start: vi.fn(async (_options: { language: string }) => ({ transcript: 'comprar tornillos' })),
      stop: vi.fn(async () => {}),
      cancel: vi.fn(async () => {}),
    };
  }

  function holdTranscript(): (transcript: string) => void {
    let finish!: (transcript: string) => void;
    recognition.start.mockReturnValueOnce(new Promise(resolve => {
      finish = transcript => resolve({ transcript });
    }));
    return finish;
  }

  beforeEach(async () => {
    recognition = createRecognition();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ projectId: '12' }) } } },
        { provide: VOICE_RECOGNITION, useValue: recognition },
        { provide: SETTINGS_STORAGE, useValue: { get: async () => ({ value: null }), set: async () => {} } },
      ],
    });
    preferences = TestBed.inject(SettingsService);
    await preferences.ready;
    const capabilities = TestBed.inject(DeviceCapabilitiesService);
    vi.spyOn(capabilities, 'moduleAvailable').mockImplementation((_module, settings) => settings.enableVoice);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(VoiceTasksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('requests permission on demand, listens, stops and saves an edited title only on confirmation', async () => {
    expect(recognition.checkPermissions).not.toHaveBeenCalled();
    const finish = holdTranscript();
    const dictation = component.start();
    await vi.waitFor(() => expect(recognition.start).toHaveBeenCalledWith({ language: 'es-AR' }));
    expect(recognition.requestPermissions).toHaveBeenCalledOnce();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Escuchando…');
    await component.stop();
    expect(recognition.stop).toHaveBeenCalledOnce();
    expect(component.phase()).toBe('stopping');
    finish('comprar tornillos');
    await dictation;
    fixture.detectChanges();
    const title: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    expect(title.value).toBe('Comprar tornillos');
    title.value = 'Comprar tornillos de acero';
    title.dispatchEvent(new Event('input'));
    http.expectNone(path);

    const save = component.save();
    const request = http.expectOne({ method: 'POST', url: path });
    expect(request.request.body).toMatchObject({
      title: 'Comprar tornillos de acero', source: 'VOZ', category: 'GENERAL', estimateHours: 1, status: 'TODO',
    });
    expect(navigate).not.toHaveBeenCalled();
    request.flush({ id: 1, ...request.request.body });
    await save;
    expect(navigate).toHaveBeenCalledWith(['/projects', 12, 'tasks']);
  });

  it('offers manual entry when microphone permission is rejected', async () => {
    recognition.requestPermissions.mockResolvedValueOnce({ microphone: 'denied' });
    await component.start();
    fixture.detectChanges();
    expect(recognition.start).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('micrófono');
    expect(fixture.nativeElement.querySelector('a[href$="/new"]').textContent).toContain('Escribir tarea');
    http.expectNone(path);
  });

  it('does not open a permission dialog if there is no recognition service', async () => {
    recognition.available.mockResolvedValueOnce({ available: false });
    await component.start();
    expect(recognition.checkPermissions).not.toHaveBeenCalled();
    expect(component.speechMessage()).toContain('no está disponible');
  });

  it('drops a late transcript after cancellation without sending a task', async () => {
    const finish = holdTranscript();
    const dictation = component.start();
    await vi.waitFor(() => expect(component.phase()).toBe('listening'));
    await component.cancelDictation();
    finish('Comprar tornillos');
    await dictation;
    expect(recognition.cancel).toHaveBeenCalledOnce();
    expect(component.reviewing()).toBe(false);
    expect(component.rows()).toEqual([]);
    http.expectNone(path);
  });

  it('waits for a pending permission dialog to settle when canceling preparation', async () => {
    let grant!: () => void;
    recognition.requestPermissions.mockReturnValueOnce(new Promise(resolve => {
      grant = () => resolve({ microphone: 'granted' });
    }));
    const dictation = component.start();
    await vi.waitFor(() => expect(recognition.requestPermissions).toHaveBeenCalledOnce());
    await component.cancelDictation();
    await component.start();
    expect(recognition.available).toHaveBeenCalledOnce();
    grant();
    await dictation;
    expect(component.phase()).toBe('idle');
    expect(recognition.start).not.toHaveBeenCalled();
  });

  it('cancels the native session when leaving during recognition', async () => {
    const finish = holdTranscript();
    const dictation = component.start();
    await vi.waitFor(() => expect(component.phase()).toBe('listening'));
    fixture.destroy();
    finish('Comprar tornillos');
    await dictation;
    expect(recognition.cancel).toHaveBeenCalledOnce();
    expect(component.rows()).toEqual([]);
    http.expectNone(path);
  });

  it('handles an empty transcript and retries a network failure without losing previous drafts', async () => {
    recognition.start.mockResolvedValueOnce({ transcript: '  ... ' });
    await component.start();
    expect(component.speechMessage()).toContain('No se reconoció texto');
    expect(component.rows()).toEqual([]);
    await component.start();
    recognition.start.mockRejectedValueOnce({ code: 'NETWORK' });
    await component.start();
    expect(component.speechMessage()).toContain('conexión');
    expect(component.rows().map(row => row.title)).toEqual(['Comprar tornillos']);
    recognition.start.mockResolvedValueOnce({ transcript: 'llamar a mamá' });
    await component.start();
    expect(component.speechMessage()).toBeNull();
    expect(component.rows().map(row => row.title)).toEqual(['Comprar tornillos', 'Llamar a mamá']);
    http.expectNone(path);
  });

  it('uses es-ES on an explicit retry when the service rejects es-AR', async () => {
    recognition.start.mockRejectedValueOnce({ code: 'LANGUAGE' });
    await component.start();
    expect(component.speechMessage()).toContain('español de España');
    expect(recognition.start).toHaveBeenCalledOnce();
    await component.start();
    expect(recognition.start).toHaveBeenLastCalledWith({ language: 'es-ES' });
  });

  it('splits, joins, adds and removes candidates before submitting the reviewed tasks', async () => {
    await component.start();
    const original = component.rows()[0];
    component.splitRow(original, 'Comprar'.length);
    expect(component.rows().map(row => row.title)).toEqual(['Comprar', 'tornillos']);
    component.joinWithPrevious(component.rows()[1], component.rows()[0]);
    expect(component.rows().map(row => row.title)).toEqual(['Comprar tornillos']);
    component.addRow();
    const second = component.rows()[1];
    await component.save();
    expect(component.saveError()).toContain('El título es obligatorio');
    http.expectNone(path);
    component.removeRow(second);
    expect(component.pendingCount()).toBe(1);
  });

  it('ignores double submission and retries only unconfirmed tasks with the same request key', async () => {
    recognition.start.mockResolvedValueOnce({ transcript: 'comprar tornillos; estudiar para el parcial; llamar a mamá' });
    await component.start();
    const save = component.save();
    await component.save();
    const first = http.expectOne({ method: 'POST', url: path });
    expect(first.request.body.title).toBe('Comprar tornillos');
    first.flush({ id: 1, ...first.request.body });
    await Promise.resolve();
    const second = http.expectOne({ method: 'POST', url: path });
    expect(second.request.body.title).toBe('Estudiar para el parcial');
    expect(second.request.body.clientRequestId).not.toBe(first.request.body.clientRequestId);
    second.error(new ProgressEvent('error'));
    await save;
    expect(component.savedCount()).toBe(1);
    expect(component.pendingCount()).toBe(2);
    expect(component.retryRequest()).toEqual(second.request.body);
    expect(navigate).not.toHaveBeenCalled();
    http.expectNone(path);

    const retry = component.save();
    const repeated = http.expectOne({ method: 'POST', url: path });
    expect(repeated.request.body).toEqual(second.request.body);
    repeated.flush({ id: 2, ...repeated.request.body });
    await Promise.resolve();
    const last = http.expectOne({ method: 'POST', url: path });
    expect(last.request.body.title).toBe('Llamar a mamá');
    last.flush({ id: 3, ...last.request.body });
    await retry;
    expect(component.savedCount()).toBe(3);
    expect(navigate).toHaveBeenCalledOnce();
  });

  it('gates the project entry and direct screen with the voice preference while preserving manual entry', async () => {
    const list = TestBed.createComponent(TaskListComponent);
    list.detectChanges();
    http.expectOne(path).flush([]);
    expect(list.nativeElement.querySelector('a[href$="/voice"]')).not.toBeNull();
    await preferences.set('enableVoice', false);
    list.detectChanges();
    fixture.detectChanges();
    expect(list.nativeElement.querySelector('a[href$="/voice"]')).toBeNull();
    expect(list.nativeElement.querySelector('a[href$="/new"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href$="/new"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Desactivado en Ajustes');
    await component.start();
    expect(recognition.available).not.toHaveBeenCalled();
  });
});
