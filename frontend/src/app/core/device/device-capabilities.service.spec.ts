import { TestBed } from '@angular/core/testing';
import { DeviceCapabilitiesService, NIVI_MODULES, OCR_MODULE, QR_MODULE, VOICE_MODULE } from './device-capabilities.service';
import { DEFAULT_SETTINGS } from '../settings/settings.service';

describe('device capabilities', () => {
  it('keeps all future modules unavailable even when the preference is enabled', () => {
    const capabilities = TestBed.inject(DeviceCapabilitiesService);
    for (const module of NIVI_MODULES.filter(module => module.pr > 3)) {
      expect(module.implemented).toBe(false);
      expect(capabilities.moduleAvailable(module, { ...DEFAULT_SETTINGS, [module.key]: true })).toBe(false);
      expect(capabilities.status(module, DEFAULT_SETTINGS)).toContain('Disponible después de implementar');
    }
  });

  it.each([VOICE_MODULE, OCR_MODULE, QR_MODULE])('offers manual entry for $label on web', (module) => {
    const capabilities = TestBed.inject(DeviceCapabilitiesService);
    expect(module.implemented).toBe(true);
    expect(capabilities.moduleAvailable(module, DEFAULT_SETTINGS)).toBe(false);
    expect(capabilities.status(module, DEFAULT_SETTINGS)).toContain('manualmente');
    expect(capabilities.status(module, { ...DEFAULT_SETTINGS, [module.key]: false })).toContain('Desactivado');
  });
});
