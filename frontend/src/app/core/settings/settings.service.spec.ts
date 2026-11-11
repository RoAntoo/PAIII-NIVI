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

  it('blocks writes after failed reads until reload succeeds without losing existing flags', async () => {
    const stored = { ...DEFAULT_SETTINGS, enableVoice: false, enableQr: false };
    const storage = { get: vi.fn().mockRejectedValueOnce(new Error('Read failed'))
      .mockRejectedValueOnce(new Error('Still unavailable'))
      .mockResolvedValue({ value: JSON.stringify(stored) }), set: vi.fn().mockResolvedValue(undefined) };
    TestBed.configureTestingModule({ providers: [{ provide: SETTINGS_STORAGE, useValue: storage }] });
    const service = TestBed.inject(SettingsService);
    await service.ready;
    await service.set('enableOcr', false);
    expect(storage.set).not.toHaveBeenCalled();
    expect(service.loaded()).toBe(false);
    await service.reload();
    await service.set('enableOcr', false);
    expect(storage.set).not.toHaveBeenCalled();
    await service.reload();
    expect(service.loaded()).toBe(true);
    await service.set('enableOcr', false);
    expect(JSON.parse(storage.set.mock.calls[0][0].value)).toEqual({ ...stored, enableOcr: false });
  });

  it('requires confirmation to reset corrupt data and unlocks only after a successful write', async () => {
    const storage = { get: vi.fn().mockResolvedValue({ value: '{' }),
      set: vi.fn().mockRejectedValueOnce(new Error('Write failed')).mockResolvedValue(undefined) };
    TestBed.configureTestingModule({ providers: [{ provide: SETTINGS_STORAGE, useValue: storage }] });
    const service = TestBed.inject(SettingsService);
    await service.ready;
    expect(service.corrupted()).toBe(true);
    await service.reload();
    expect(service.corrupted()).toBe(true);
    await service.resetCorrupted(false);
    expect(storage.set).not.toHaveBeenCalled();
    await service.resetCorrupted(true);
    expect(service.loaded()).toBe(false);
    expect(service.corrupted()).toBe(true);
    await service.resetCorrupted(true);
    expect(service.loaded()).toBe(true);
    expect(service.corrupted()).toBe(false);
    expect(service.settings()).toEqual(DEFAULT_SETTINGS);
    await service.set('enableVoice', false);
    expect(service.settings().enableVoice).toBe(false);
  });

  it('does not offer or execute reset for transient read errors', async () => {
    const storage = { get: vi.fn().mockRejectedValue(new Error('Unavailable')), set: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: SETTINGS_STORAGE, useValue: storage }] });
    const service = TestBed.inject(SettingsService);
    await service.ready;
    expect(service.corrupted()).toBe(false);
    await service.resetCorrupted(true);
    expect(storage.set).not.toHaveBeenCalled();
  });
});
