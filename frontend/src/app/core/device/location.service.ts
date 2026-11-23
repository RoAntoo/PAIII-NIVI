import { Injectable, InjectionToken, inject } from '@angular/core';
import { Geolocation, GeolocationPlugin } from '@capacitor/geolocation';
import { DeviceCapabilitiesService, PLACE_MODULE } from './device-capabilities.service';

export interface NearbyPosition {
  lat: number;
  lng: number;
  accuracyMeters: number;
}

type DeviceGeolocation = Pick<GeolocationPlugin, 'checkPermissions' | 'requestPermissions' | 'getCurrentPosition'>;

export const DEVICE_GEOLOCATION = new InjectionToken<DeviceGeolocation>('NIVI geolocation', {
  providedIn: 'root',
  factory: () => ({
    checkPermissions: () => Geolocation.checkPermissions(),
    requestPermissions: options => Geolocation.requestPermissions(options),
    getCurrentPosition: options => Geolocation.getCurrentPosition(options),
  }),
});

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly geolocation = inject(DEVICE_GEOLOCATION);
  private readonly capabilities = inject(DeviceCapabilitiesService);

  async locate(): Promise<NearbyPosition> {
    if (!this.capabilities.supports(PLACE_MODULE)) {
      throw new Error('La búsqueda por ubicación está disponible en la app Android.');
    }
    try {
      let permission = await this.geolocation.checkPermissions();
      if (permission.coarseLocation !== 'granted' && permission.location !== 'granted') {
        permission = await this.geolocation.requestPermissions({ permissions: ['coarseLocation'] });
      }
      if (permission.coarseLocation !== 'granted' && permission.location !== 'granted') {
        throw Object.assign(new Error(), { code: 'OS-PLUG-GLOC-0003' });
      }

      const { coords } = await this.geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        maximumAge: 0,
        timeout: 8_000,
      });
      if (!Number.isFinite(coords.accuracy) || coords.accuracy < 0
          || !(Math.abs(coords.latitude) <= 90) || !(Math.abs(coords.longitude) <= 180)) {
        throw new Error('Invalid device position');
      }
      return { lat: coords.latitude, lng: coords.longitude, accuracyMeters: coords.accuracy };
    } catch (error) {
      throw new Error(locationMessage(error), { cause: error });
    }
  }
}

function locationMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
  switch (code) {
    case 'OS-PLUG-GLOC-0003':
    case 'OS-PLUG-GLOC-0008':
      return 'NIVI no tiene permiso de ubicación. Podés habilitarlo en los ajustes de Android y reintentar.';
    case 'OS-PLUG-GLOC-0007':
    case 'OS-PLUG-GLOC-0009':
    case 'OS-PLUG-GLOC-0016':
    case 'OS-PLUG-GLOC-0017':
      return 'Activá la ubicación del dispositivo y revisá la conexión o el modo avión antes de reintentar.';
    case 'OS-PLUG-GLOC-0010':
      return 'La ubicación tardó demasiado. Probá donde haya mejor señal o configurá una ubicación en el emulador.';
    default:
      return 'No pudimos obtener la ubicación. Revisá la configuración del dispositivo y reintentá.';
  }
}
