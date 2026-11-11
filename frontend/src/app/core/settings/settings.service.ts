import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { Preferences, PreferencesPlugin } from '@capacitor/preferences';

export interface NiviSettings {
  enableVoice: boolean;
  enableOcr: boolean;
  enableQr: boolean;
  enablePlaceSuggestions: boolean;
  enableReminders: boolean;
  enableOfflineMode: boolean;
}

export const DEFAULT_SETTINGS: Readonly<NiviSettings> = Object.freeze({
  enableVoice: true, enableOcr: true, enableQr: true,
  enablePlaceSuggestions: false, enableReminders: true, enableOfflineMode: false,
});
export const SETTINGS_STORAGE = new InjectionToken<Pick<PreferencesPlugin, 'get' | 'set'>>(
  'NIVI settings storage', { providedIn: 'root', factory: () => ({
    get: options => Preferences.get(options),
    set: options => Preferences.set(options),
  }) },
);
const STORAGE_KEY = 'nivi.settings.v1';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private storage = inject(SETTINGS_STORAGE);
  private state = signal<NiviSettings>({ ...DEFAULT_SETTINGS });
  readonly settings = this.state.asReadonly();
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly ready = this.load();

  private async load(): Promise<void> {
    try {
      const { value } = await this.storage.get({ key: STORAGE_KEY });
      const stored: unknown = value ? JSON.parse(value) : {};
      if (!stored || typeof stored !== 'object' || Array.isArray(stored)) throw new Error('Invalid settings');
      const next = { ...DEFAULT_SETTINGS };
      for (const key of Object.keys(next) as (keyof NiviSettings)[]) {
        const entry = (stored as Record<string, unknown>)[key];
        if (typeof entry === 'boolean') next[key] = entry;
      }
      this.state.set(next);
    } catch {
      this.error.set('No se pudieron recuperar los ajustes. Se usan los valores iniciales; podés reintentar.');
    } finally { this.loading.set(false); }
  }

  async reload(): Promise<void> {
    if (this.loading() || this.saving()) return;
    this.loading.set(true);
    this.error.set(null);
    await this.load();
  }

  async set(key: keyof NiviSettings, enabled: boolean): Promise<void> {
    await this.ready;
    if (this.saving() || this.loading()) return;
    this.saving.set(true);
    this.error.set(null);
    const next = { ...this.state(), [key]: enabled };
    try {
      await this.storage.set({ key: STORAGE_KEY, value: JSON.stringify(next) });
      this.state.set(next);
    } catch {
      this.error.set('No se pudo guardar el ajuste. Conservamos el valor anterior; intentá de nuevo.');
    } finally { this.saving.set(false); }
  }
}
