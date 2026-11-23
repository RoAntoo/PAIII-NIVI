import { Injectable, InjectionToken, inject } from '@angular/core';
import { PermissionState, registerPlugin } from '@capacitor/core';

export const TASK_IMPORT_PLUGIN_NAME = 'NiviTaskImport';
export type PhotoSource = 'camera' | 'gallery';

interface CameraStatus {
  camera: PermissionState;
}

interface TaskImportPlugin {
  checkPermissions(): Promise<CameraStatus>;
  requestPermissions(options: { permissions: ['camera'] }): Promise<CameraStatus>;
  readPhoto(options: { source: PhotoSource }): Promise<{ lines: string[] }>;
  scanQr(): Promise<{ value: string }>;
}

export const TASK_IMPORT_BRIDGE = new InjectionToken<TaskImportPlugin>('NIVI camera import', {
  providedIn: 'root',
  factory: () => {
    const native = registerPlugin<TaskImportPlugin>(TASK_IMPORT_PLUGIN_NAME);
    return {
      checkPermissions: () => native.checkPermissions(),
      requestPermissions: options => native.requestPermissions(options),
      readPhoto: options => native.readPhoto(options),
      scanQr: () => native.scanQr(),
    };
  },
});

async function requireCamera(plugin: TaskImportPlugin): Promise<void> {
  const { camera } = await plugin.checkPermissions();
  if (camera === 'granted') return;
  if (camera !== 'denied' && (await plugin.requestPermissions({ permissions: ['camera'] })).camera === 'granted') return;
  throw { code: 'PERMISSION' };
}

@Injectable({ providedIn: 'root' })
export class OcrService {
  private readonly plugin = inject(TASK_IMPORT_BRIDGE);

  async recognizeImage(source: PhotoSource, signal: AbortSignal): Promise<string[]> {
    if (source === 'camera') await requireCamera(this.plugin);
    signal.throwIfAborted();
    return (await this.plugin.readPhoto({ source })).lines;
  }
}

@Injectable({ providedIn: 'root' })
export class QrService {
  private readonly plugin = inject(TASK_IMPORT_BRIDGE);

  async scan(signal: AbortSignal): Promise<string> {
    await requireCamera(this.plugin);
    signal.throwIfAborted();
    return (await this.plugin.scanQr()).value;
  }
}
