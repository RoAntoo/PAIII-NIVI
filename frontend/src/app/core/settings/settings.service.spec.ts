import { TestBed } from '@angular/core/testing';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE, SettingsService } from './settings.service';

describe('persisted module settings', () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => { localStorage.clear(); TestBed.resetTestingModule(); });

  it('restores preferences with the real web Preferences adapter after service restart', async () => {
    let service = TestBed.inject(SettingsService);
    await service.ready;
    expect(service.settings()).toEqual(DEFAULT_SETTINGS);
    expect(service.settings().enablePlaceSuggestions).toBe(false);
    expect(service.settings().enableOfflineMode).toBe(false);
    await service.set('enableVoice', false);
    await service.set('enablePlaceSuggestions', true);
    TestBed.resetTestingModule();
    service = TestBed.inject(SettingsService);
    await service.ready;
    expect(service.settings().enableVoice).toBe(false);
    expect(service.settings().enablePlaceSuggestions).toBe(true);
  });

  it('ignores unknown keys and invalid flag types while merging older settings', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: SETTINGS_STORAGE, useValue: {
      get: async () => ({ value: JSON.stringify({ enableVoice: false, enableOcr: 'true', secret: true }) }),
      set: vi.fn(),
    } }] });
    const service = TestBed.inject(SettingsService);
    await service.ready;
    expect(service.settings()).toEqual({ ...DEFAULT_SETTINGS, enableVoice: false });
  });

  it('reports a write error and keeps the last saved state until retry succeeds', async () => {
    const storage = { get: vi.fn().mockResolvedValue({ value: null }),
      set: vi.fn().mockRejectedValueOnce(new Error('Storage unavailable')).mockResolvedValue(undefined) };
    TestBed.configureTestingModule({ providers: [{ provide: SETTINGS_STORAGE, useValue: storage }] });
    const service = TestBed.inject(SettingsService);
    await service.ready;
    await service.set('enableVoice', false);
    expect(service.settings().enableVoice).toBe(true);
    expect(service.error()).toContain('No se pudo guardar');
    expect(service.saving()).toBe(false);
    await service.set('enableVoice', false);
    expect(service.settings().enableVoice).toBe(false);
    expect(service.error()).toBeNull();
  });

  it('recovers from malformed storage through an explicit reload', async () => {
    const storage = { get: vi.fn().mockResolvedValueOnce({ value: '{' })
      .mockResolvedValue({ value: '{"enableQr":false}' }), set: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: SETTINGS_STORAGE, useValue: storage }] });
    const service = TestBed.inject(SettingsService);
    await service.ready;
    expect(service.error()).not.toBeNull();
    expect(service.settings()).toEqual(DEFAULT_SETTINGS);
    await service.reload();
    expect(service.settings().enableQr).toBe(false);
    expect(service.error()).toBeNull();
  });
});
