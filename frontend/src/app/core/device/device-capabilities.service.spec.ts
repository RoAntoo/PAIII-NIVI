import { TestBed } from '@angular/core/testing';
import { DeviceCapabilitiesService, NIVI_MODULES, OCR_MODULE, QR_MODULE, VOICE_MODULE } from './device-capabilities.service';
import { PLACE_MODULE } from './device-capabilities.service';
import { DEFAULT_SETTINGS } from '../settings/settings.service';

describe('device capabilities', () => {
  it('keeps all future modules unavailable even when the preference is enabled', () => {
    const capabilities = TestBed.inject(DeviceCapabilitiesService);
    for (const module of NIVI_MODULES.filter(module => module.pr > 4)) {
      expect(module.implemented).toBe(false);
      expect(capabilities.moduleAvailable(module, { ...DEFAULT_SETTINGS, [module.key]: true })).toBe(false);
      expect(capabilities.status(module, DEFAULT_SETTINGS)).toContain('Disponible después de implementar');
    }
  });

  it('keeps location off by default and reports the manual fallback on web', () => {
    const capabilities = TestBed.inject(DeviceCapabilitiesService);
    expect(PLACE_MODULE.implemented).toBe(true);
    expect(DEFAULT_SETTINGS.enablePlaceSuggestions).toBe(false);
    const enabled = { ...DEFAULT_SETTINGS, enablePlaceSuggestions: true };
    expect(capabilities.moduleAvailable(PLACE_MODULE, enabled)).toBe(false);
    expect(capabilities.status(PLACE_MODULE, enabled)).toContain('manualmente');
  });

  it.each([VOICE_MODULE, OCR_MODULE, QR_MODULE])('offers manual entry for $label on web', (module) => {
    const capabilities = TestBed.inject(DeviceCapabilitiesService);
    expect(module.implemented).toBe(true);
    expect(capabilities.moduleAvailable(module, DEFAULT_SETTINGS)).toBe(false);
    expect(capabilities.status(module, DEFAULT_SETTINGS)).toContain('manualmente');
    expect(capabilities.status(module, { ...DEFAULT_SETTINGS, [module.key]: false })).toContain('Desactivado');
  });
});
