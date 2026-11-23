import { TestBed } from '@angular/core/testing';
import { DeviceCapabilitiesService, NIVI_MODULES, OCR_MODULE, QR_MODULE, VOICE_MODULE } from './device-capabilities.service';
import { PLACE_MODULE } from './device-capabilities.service';
import { DEFAULT_SETTINGS } from '../settings/settings.service';

describe('device capabilities', () => {
  it('offers offline storage on web and keeps native reminders unavailable there', () => {
    const capabilities = TestBed.inject(DeviceCapabilitiesService);
    const offline = NIVI_MODULES.find(module => module.key === 'enableOfflineMode')!;
    const reminders = NIVI_MODULES.find(module => module.key === 'enableReminders')!;
    expect(capabilities.moduleAvailable(offline, { ...DEFAULT_SETTINGS, enableOfflineMode: true })).toBe(true);
    expect(capabilities.moduleAvailable(reminders, DEFAULT_SETTINGS)).toBe(false);
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
