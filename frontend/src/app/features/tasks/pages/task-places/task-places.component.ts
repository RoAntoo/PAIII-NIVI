import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, model, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subscription, TimeoutError, defer, filter, finalize, map, switchMap } from 'rxjs';
import { DeviceCapabilitiesService, PLACE_MODULE } from '../../../../core/device/device-capabilities.service';
import { LocationService, NearbyPosition } from '../../../../core/device/location.service';
import { SettingsService } from '../../../../core/settings/settings.service';
import { Place, PlacesApiService } from '../../data-access/places-api.service';
import { PLACE_LABELS, PlaceCategory, classifyIntent } from '../../domain/intent-classifier';

interface NearbyResults {
  approximate: boolean;
  places: { place: Place; distance: string | null }[];
}

@Component({
  selector: 'app-task-places',
  templateUrl: './task-places.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskPlacesComponent {
  private readonly preferences = inject(SettingsService);
  private readonly capabilities = inject(DeviceCapabilitiesService);
  private readonly location = inject(LocationService);
  private readonly api = inject(PlacesApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dismissed = signal<ReadonlySet<PlaceCategory>>(new Set());
  private readonly association = signal<{ requestedId: string; place: Place } | null>(null);
  private request?: Subscription;

  readonly title = input('');
  readonly disabled = input(false);
  readonly placeId = model<string | null>(null);
  readonly intent = computed(() => classifyIntent(this.title()));
  private readonly category = computed(() => this.intent()?.category);
  readonly enabled = computed(() => this.preferences.loaded()
    && this.capabilities.moduleAvailable(PLACE_MODULE, this.preferences.settings()));
  readonly suggestion = computed(() => {
    const intent = this.intent();
    return this.enabled() && !this.disabled() && intent && !this.dismissed().has(intent.category) ? intent : null;
  });
  readonly associatedPlace = computed(() => {
    const association = this.association();
    return association && association.requestedId === this.placeId() ? association.place : null;
  });
  readonly labels = PLACE_LABELS;
  readonly nearby = signal<NearbyResults | null>(null);
  readonly pending = signal<'nearby' | 'details' | null>(null);
  readonly searchError = signal('');
  readonly detailsError = signal('');

  constructor() {
    effect(() => {
      const enabled = this.enabled();
      const disabled = this.disabled();
      this.category();
      untracked(() => {
        if (!enabled || disabled || this.pending() === 'nearby') this.request?.unsubscribe();
        this.nearby.set(null);
        this.searchError.set('');
        if (!enabled) {
          this.association.set(null);
          this.detailsError.set('');
        }
      });
    });
  }

  dismiss(): void {
    const category = this.category();
    if (category) this.dismissed.update(previous => new Set([...previous, category]));
    if (this.pending() === 'nearby') this.request?.unsubscribe();
    this.nearby.set(null);
    this.searchError.set('');
  }

  search(): void {
    const intent = this.suggestion();
    if (!intent || this.pending()) return;

    this.searchError.set('');
    this.nearby.set(null);
    const search = defer(() => this.location.locate()).pipe(
      filter(() => this.suggestion()?.category === intent.category),
      switchMap(position => this.api.searchNearby({
        lat: position.lat,
        lng: position.lng,
        category: intent.category,
        radius: Math.min(5_000, Math.max(3_000, Math.ceil(position.accuracyMeters / 500) * 500)),
      }).pipe(map(places => ({
        approximate: position.accuracyMeters >= 1_000,
        places: places.map(place => ({ place, distance: distanceLabel(position, place) })),
      })))),
    );
    this.run(search, 'nearby', result => this.nearby.set(result), this.searchError.set);
  }

  loadAssociatedPlace(): void {
    const id = this.placeId();
    if (!id || !this.enabled() || this.disabled() || this.pending()) return;

    this.detailsError.set('');
    this.run(this.api.getPlace(id), 'details', place => {
      if (id === this.placeId() && this.enabled()) this.association.set({ requestedId: id, place });
    }, this.detailsError.set);
  }

  select(place: Place): void {
    if (!this.suggestion()) return;
    this.association.set({ requestedId: place.id, place });
    this.placeId.set(place.id);
    this.detailsError.set('');
  }

  remove(): void {
    if (this.disabled()) return;
    if (this.pending() === 'details') this.request?.unsubscribe();
    this.placeId.set(null);
    this.association.set(null);
    this.detailsError.set('');
  }

  mapsUrl(place: Place): string {
    const hasCoordinates = place.lat !== null && place.lng !== null;
    const query = hasCoordinates ? `${place.lat},${place.lng}` : [place.name, place.address].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}&query_place_id=${encodeURIComponent(place.id)}`;
  }

  private run<T>(
    operation: Observable<T>,
    type: 'nearby' | 'details',
    next: (result: T) => void,
    showError: (message: string) => void,
  ): void {
    this.pending.set(type);
    this.request = operation.pipe(takeUntilDestroyed<T>(this.destroyRef), finalize(() => this.pending.set(null))).subscribe({
      next,
      error: error => showError(errorMessage(error)),
    });
  }
}

function distanceLabel(origin: NearbyPosition, place: Place): string | null {
  if (place.lat === null || place.lng === null || origin.accuracyMeters >= 1_000) return null;
  const radians = Math.PI / 180;
  const dLat = (place.lat - origin.lat) * radians;
  const dLng = (place.lng - origin.lng) * radians;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(origin.lat * radians) * Math.cos(place.lat * radians) * Math.sin(dLng / 2) ** 2;
  const kilometers = 12_742 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
  const rounded = Math.round(kilometers * 10) / 10;
  if (rounded === 0) return 'Menos de 100 m en línea recta (aprox.)';
  return `${rounded.toLocaleString('es-AR')} km en línea recta (aprox.)`;
}

function errorMessage(error: unknown): string {
  if (error instanceof TimeoutError) return 'La búsqueda tardó demasiado. Podés reintentar.';
  if (error instanceof HttpErrorResponse) {
    switch (error.status) {
      case 0: return 'No hay conexión con NIVI. Revisá internet o el modo avión y reintentá.';
      case 404: return 'El lugar asociado ya no está disponible. Podés quitarlo o elegir otro.';
      case 429: return 'Alcanzamos el límite de búsquedas. Probá de nuevo en un minuto.';
      case 503: return 'La búsqueda de lugares todavía no está configurada en el servidor.';
      case 504: return 'La búsqueda tardó demasiado. Podés reintentar.';
      default: return 'No pudimos consultar los lugares. Podés reintentar.';
    }
  }
  return error instanceof Error ? error.message : 'No pudimos obtener la ubicación. Podés reintentar.';
}
