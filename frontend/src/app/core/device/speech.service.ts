import { Injectable, InjectionToken, inject } from '@angular/core';
import { PermissionState, registerPlugin } from '@capacitor/core';

export const VOICE_PLUGIN_NAME = 'NiviVoiceRecognition';
export type SpeechLanguage = 'es-AR' | 'es-ES';

interface MicrophoneStatus {
  microphone: PermissionState;
}

interface VoiceRecognitionPlugin {
  available(): Promise<{ available: boolean }>;
  checkPermissions(): Promise<MicrophoneStatus>;
  requestPermissions(): Promise<MicrophoneStatus>;
  start(options: { language: SpeechLanguage }): Promise<{ transcript: string }>;
  stop(): Promise<void>;
  cancel(): Promise<void>;
}

export const VOICE_RECOGNITION = new InjectionToken<VoiceRecognitionPlugin>('NIVI voice recognition', {
  providedIn: 'root',
  factory: () => {
    const native = registerPlugin<VoiceRecognitionPlugin>(VOICE_PLUGIN_NAME);
    return {
      available: () => native.available(),
      checkPermissions: () => native.checkPermissions(),
      requestPermissions: () => native.requestPermissions(),
      start: options => native.start(options),
      stop: () => native.stop(),
      cancel: () => native.cancel(),
    };
  },
});

@Injectable({ providedIn: 'root' })
export class SpeechService {
  private readonly plugin = inject(VOICE_RECOGNITION);

  async isAvailable(): Promise<boolean> {
    return (await this.plugin.available()).available;
  }

  async requestPermission(): Promise<boolean> {
    const { microphone } = await this.plugin.checkPermissions();
    if (microphone === 'granted') return true;
    if (microphone === 'denied') return false;
    return (await this.plugin.requestPermissions()).microphone === 'granted';
  }

  async start(language: SpeechLanguage): Promise<string> {
    return (await this.plugin.start({ language })).transcript;
  }

  stop(): Promise<void> {
    return this.plugin.stop();
  }

  cancel(): Promise<void> {
    return this.plugin.cancel();
  }
}
