import { TestBed } from '@angular/core/testing';
import { DeviceCapabilitiesService, NIVI_MODULES, VOICE_MODULE } from './device-capabilities.service';
import { DEFAULT_SETTINGS } from '../settings/settings.service';

describe('device capabilities', () => {
  it('keeps all future modules unavailable even when the preference is enabled', () => {
    const capabilities = TestBed.inject(DeviceCapabilitiesService);
    for (const module of NIVI_MODULES.filter(module => module !== VOICE_MODULE)) {
      expect(module.implemented).toBe(false);
      expect(capabilities.moduleAvailable(module, { ...DEFAULT_SETTINGS, [module.key]: true })).toBe(false);
      expect(capabilities.status(module, DEFAULT_SETTINGS)).toContain('Disponible después de implementar');
    }
  });

  it('offers manual entry when a native plugin is unavailable on web', () => {
    const capabilities = TestBed.inject(DeviceCapabilitiesService);
    const voice = VOICE_MODULE;
    expect(voice.implemented).toBe(true);
    expect(capabilities.moduleAvailable(voice, DEFAULT_SETTINGS)).toBe(false);
    expect(capabilities.status(voice, DEFAULT_SETTINGS)).toContain('manualmente');
    expect(capabilities.status(voice, { ...DEFAULT_SETTINGS, enableVoice: false })).toContain('Desactivado');
  });
});
