package com.pa.proyecto.backend_integrator.core.output;

import java.util.List;

public interface PlacesProvider {
    enum Category { HARDWARE, LABORATORY, PHARMACY }

    record NearbySearch(double lat, double lng, Category category, int radius) {}

    record Attribution(String provider, String providerUri) {}

    record Place(String id, String name, String address, Double lat, Double lng, List<Attribution> attributions) {}

    List<Place> searchNearby(NearbySearch search);

    Place getPlace(String id);
}
