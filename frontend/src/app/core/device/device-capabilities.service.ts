import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { NiviSettings } from '../settings/settings.service';
import { VOICE_PLUGIN_NAME } from './speech.service';
import { TASK_IMPORT_PLUGIN_NAME } from './task-import.service';

export interface NiviModule {
  key: keyof NiviSettings;
  label: string;
  pr: number;
  plugin: string | null;
  implemented: boolean;
}

export const VOICE_MODULE: NiviModule = {
  key: 'enableVoice', label: 'Dictado por voz', pr: 2, plugin: VOICE_PLUGIN_NAME, implemented: true,
};

export const PLACE_MODULE: NiviModule = {
  key: 'enablePlaceSuggestions', label: 'Sugerencias de lugares', pr: 4, plugin: 'Geolocation', implemented: true,
};

export const OCR_MODULE: NiviModule = {
  key: 'enableOcr', label: 'Lectura de listas con cámara (OCR)', pr: 3, plugin: TASK_IMPORT_PLUGIN_NAME, implemented: true,
};

export const QR_MODULE: NiviModule = {
  key: 'enableQr', label: 'Plantillas por QR', pr: 3, plugin: TASK_IMPORT_PLUGIN_NAME, implemented: true,
};

export const NIVI_MODULES: readonly NiviModule[] = [
  VOICE_MODULE,
  OCR_MODULE,
  QR_MODULE,
  PLACE_MODULE,
  { key: 'enableReminders', label: 'Recordatorios', pr: 5, plugin: 'LocalNotifications', implemented: true },
  { key: 'enableOfflineMode', label: 'Tareas sin conexión', pr: 5, plugin: null, implemented: true },
];

@Injectable({ providedIn: 'root' })
export class DeviceCapabilitiesService {
  readonly platform = Capacitor.getPlatform();
  readonly native = Capacitor.isNativePlatform();

  /** Requires implementation, user opt-in and any necessary native plugin. */
  moduleAvailable(module: NiviModule, settings: NiviSettings): boolean {
    return settings[module.key] && this.supports(module);
  }

  supports(module: NiviModule): boolean {
    return module.implemented
      && (module.key !== 'enablePlaceSuggestions' || this.platform === 'android')
      && (!module.plugin || (this.native && Capacitor.isPluginAvailable(module.plugin)));
  }

  /** Explains module readiness or the manual-entry fallback without requesting permissions. */
  status(module: NiviModule, settings: NiviSettings): string {
    if (!module.implemented) return `Disponible después de implementar PR ${module.pr.toString().padStart(2, '0')}.`;
    if (!settings[module.key]) return 'Desactivado en Ajustes.';
    if (!this.moduleAvailable(module, settings)) return 'No disponible en este dispositivo. Podés crear tareas manualmente.';
    return 'Disponible; los permisos del sistema se solicitan al usar la función.';
  }
}
