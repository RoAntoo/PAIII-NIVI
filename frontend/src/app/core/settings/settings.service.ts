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
  readonly loaded = signal(false);
  readonly corrupted = signal(false);
  readonly ready = this.load();

  /** Loads saved flags; failed reads block writes until a successful reload. */
  private async load(): Promise<void> {
    this.loaded.set(false);
    this.corrupted.set(false);
    try {
      const { value } = await this.storage.get({ key: STORAGE_KEY });
      let stored: unknown;
      try {
        stored = value === null ? {} : JSON.parse(value);
        if (!stored || typeof stored !== 'object' || Array.isArray(stored)) throw new Error('Invalid settings');
      } catch {
        this.corrupted.set(true);
        this.error.set('Los ajustes guardados tienen un formato inválido. Podés reintentar la lectura o restablecerlos con confirmación.');
        return;
      }
      const next = { ...DEFAULT_SETTINGS };
      for (const key of Object.keys(next) as (keyof NiviSettings)[]) {
        const entry = (stored as Record<string, unknown>)[key];
        if (typeof entry === 'boolean') next[key] = entry;
      }
      this.state.set(next);
      this.loaded.set(true);
    } catch {
      this.error.set('No se pudieron recuperar los ajustes. Recuperalos antes de guardar cambios para conservar tus preferencias.');
    } finally { this.loading.set(false); }
  }

  /** Retries reading persisted preferences without overwriting them. */
  async reload(): Promise<void> {
    if (this.loading() || this.saving()) return;
    this.loading.set(true);
    this.error.set(null);
    await this.load();
  }

  /** Replaces an invalid record only after explicit confirmation; failed writes remain blocked. */
  async resetCorrupted(confirmed: boolean): Promise<void> {
    if (!confirmed || !this.corrupted() || this.loading() || this.saving()) return;
    this.saving.set(true);
    try {
      await this.storage.set({ key: STORAGE_KEY, value: JSON.stringify(DEFAULT_SETTINGS) });
      this.state.set({ ...DEFAULT_SETTINGS });
      this.loaded.set(true);
      this.corrupted.set(false);
      this.error.set(null);
    } catch {
      this.error.set('No se pudieron restablecer los ajustes. Se conservó el bloqueo; podés reintentar.');
    } finally { this.saving.set(false); }
  }

  /** Persists one flag only after a successful read, retaining saved state on failure. */
  async set(key: keyof NiviSettings, enabled: boolean): Promise<void> {
    await this.ready;
    if (this.saving() || this.loading() || !this.loaded()) return;
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
