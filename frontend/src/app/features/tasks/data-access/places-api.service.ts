import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PlaceCategory } from '../domain/intent-classifier';

export interface Place {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  attributions: { provider: string; providerUri: string | null }[];
}

export interface NearbySearch {
  lat: number;
  lng: number;
  category: PlaceCategory;
  radius: number;
}

@Injectable({ providedIn: 'root' })
export class PlacesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/places`;

  searchNearby(search: NearbySearch) {
    return this.http.post<Place[]>(`${this.baseUrl}/nearby`, search).pipe(timeout(12_000));
  }

  getPlace(id: string) {
    return this.http.get<Place>(`${this.baseUrl}/${encodeURIComponent(id)}`).pipe(timeout(12_000));
  }
}
