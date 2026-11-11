import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { NiviSettings } from '../settings/settings.service';

export interface NiviModule {
  key: keyof NiviSettings;
  label: string;
  pr: number;
  plugin: string | null;
  implemented: boolean;
}

export const NIVI_MODULES: readonly NiviModule[] = [
  { key: 'enableVoice', label: 'Dictado por voz', pr: 2, plugin: 'SpeechRecognition', implemented: false },
  { key: 'enableOcr', label: 'Lectura de listas con cámara (OCR)', pr: 3, plugin: 'Camera', implemented: false },
  { key: 'enableQr', label: 'Plantillas por QR', pr: 3, plugin: 'BarcodeScanner', implemented: false },
  { key: 'enablePlaceSuggestions', label: 'Sugerencias de lugares', pr: 4, plugin: 'Geolocation', implemented: false },
  { key: 'enableReminders', label: 'Recordatorios', pr: 5, plugin: 'LocalNotifications', implemented: false },
  { key: 'enableOfflineMode', label: 'Tareas sin conexión', pr: 5, plugin: null, implemented: false },
];

@Injectable({ providedIn: 'root' })
export class DeviceCapabilitiesService {
  readonly platform = Capacitor.getPlatform();
  readonly native = Capacitor.isNativePlatform();

  moduleAvailable(module: NiviModule, settings: NiviSettings): boolean {
    return module.implemented && settings[module.key]
      && (!module.plugin || (this.native && Capacitor.isPluginAvailable(module.plugin)));
  }

  status(module: NiviModule, settings: NiviSettings): string {
    if (!module.implemented) return `Disponible después de implementar PR ${module.pr.toString().padStart(2, '0')}.`;
    if (!settings[module.key]) return 'Desactivado en Ajustes.';
    if (!this.moduleAvailable(module, settings)) return 'No disponible en este dispositivo. Podés crear tareas manualmente.';
    return 'Disponible; los permisos del sistema se solicitan al usar la función.';
  }
}
