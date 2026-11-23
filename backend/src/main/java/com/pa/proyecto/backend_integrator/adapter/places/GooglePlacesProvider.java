package com.pa.proyecto.backend_integrator.adapter.places;

import com.pa.proyecto.backend_integrator.core.model.PlaceIds;
import com.pa.proyecto.backend_integrator.core.output.PlacesProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.SocketTimeoutException;
import java.time.Duration;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static com.pa.proyecto.backend_integrator.adapter.places.PlacesException.Reason.*;

@Component
public class GooglePlacesProvider implements PlacesProvider {
    private static final String BASE_URL = "https://places.googleapis.com/v1";
    private static final List<String> FIELDS = List.of("id", "displayName", "formattedAddress", "location", "attributions");
    private static final String NEARBY_FIELDS = FIELDS.stream().map(field -> "places." + field).collect(Collectors.joining(","));
    private static final String DETAILS_FIELDS = String.join(",", FIELDS);
    private static final int MAX_RESULTS = 8;
    private static final Map<Category, List<String>> TYPES = Map.of(
            Category.HARDWARE, List.of("hardware_store"),
            Category.LABORATORY, List.of("medical_lab"),
            Category.PHARMACY, List.of("pharmacy")
    );

    private final RestClient http;
    private final String apiKey;
    private final PlacesRequestLimit limit;

    @Autowired
    public GooglePlacesProvider(@Value("${app.places.google-api-key:}") String apiKey) {
        this(apiKey, buildClient(), new PlacesRequestLimit(System::nanoTime));
    }

    GooglePlacesProvider(String apiKey, RestClient http, PlacesRequestLimit limit) {
        this.apiKey = apiKey.trim();
        this.http = http;
        this.limit = limit;
    }

    @Override
    public List<Place> searchNearby(NearbySearch search) {
        var body = Map.of(
                "includedTypes", TYPES.get(search.category()),
                "maxResultCount", MAX_RESULTS,
                "rankPreference", "DISTANCE",
                "languageCode", "es",
                "locationRestriction", Map.of("circle", Map.of(
                        "center", Map.of("latitude", search.lat(), "longitude", search.lng()),
                        "radius", search.radius()
                ))
        );
        var response = request(() -> http.post().uri("/places:searchNearby")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Goog-Api-Key", apiKey)
                .header("X-Goog-FieldMask", NEARBY_FIELDS)
                .body(body).retrieve().body(NearbyResponse.class), false);
        var seenIds = new HashSet<String>();
        return entries(response.places()).map(GooglePlacesProvider::toPlace).filter(Objects::nonNull)
                .filter(place -> seenIds.add(place.id())).limit(MAX_RESULTS).toList();
    }

    @Override
    public Place getPlace(String id) {
        var response = request(() -> http.get().uri("/places/{id}?languageCode=es", id)
                .header("X-Goog-Api-Key", apiKey)
                .header("X-Goog-FieldMask", DETAILS_FIELDS)
                .retrieve().body(GooglePlace.class), true);
        Place place = toPlace(response);
        if (place == null) throw new PlacesException(UNAVAILABLE);
        return place;
    }

    private <T> T request(Supplier<T> action, boolean details) {
        if (apiKey.isEmpty()) throw new PlacesException(UNCONFIGURED);
        if (!limit.acquire()) throw new PlacesException(LIMITED);
        try {
            T result = action.get();
            if (result == null) throw new PlacesException(UNAVAILABLE);
            return result;
        } catch (RestClientResponseException error) {
            int status = error.getStatusCode().value();
            if (status == 429) {
                limit.throttle();
                throw new PlacesException(LIMITED);
            }
            if (status == 404 && details) throw new PlacesException(NOT_FOUND);
            if (status == 408 || status == 504) throw new PlacesException(TIMEOUT);
            throw new PlacesException(UNAVAILABLE);
        } catch (ResourceAccessException error) {
            Throwable cause = error.getMostSpecificCause();
            if (cause instanceof SocketTimeoutException) {
                throw new PlacesException(TIMEOUT);
            }
            throw new PlacesException(UNAVAILABLE);
        } catch (RestClientException error) {
            throw new PlacesException(UNAVAILABLE);
        } finally {
            limit.release();
        }
    }

    private static RestClient buildClient() {
        var factory = new SimpleClientHttpRequestFactory() {
            @Override
            protected void prepareConnection(HttpURLConnection connection, String method) throws IOException {
                super.prepareConnection(connection, method);
                connection.setInstanceFollowRedirects(false);
            }
        };
        factory.setConnectTimeout(Duration.ofSeconds(3));
        factory.setReadTimeout(Duration.ofSeconds(8));
        return RestClient.builder().baseUrl(BASE_URL).requestFactory(factory).build();
    }

    private static Place toPlace(GooglePlace place) {
        if (!PlaceIds.isValid(place.id()) || place.displayName() == null
                || place.displayName().text() == null || place.displayName().text().isBlank()) return null;
        var location = place.location();
        boolean hasCoordinates = location != null && inRange(location.latitude(), 90) && inRange(location.longitude(), 180);
        return new Place(place.id(), place.displayName().text(), place.formattedAddress(),
                hasCoordinates ? location.latitude() : null, hasCoordinates ? location.longitude() : null,
                entries(place.attributions()).filter(item -> item.provider() != null && !item.provider().isBlank()).toList());
    }

    private static boolean inRange(Double coordinate, double limit) {
        return coordinate != null && Math.abs(coordinate) <= limit;
    }

    private static <T> Stream<T> entries(List<T> items) {
        return items == null ? Stream.empty() : items.stream().filter(Objects::nonNull);
    }

    private record NearbyResponse(List<GooglePlace> places) {}
    private record GooglePlace(String id, LocalizedText displayName, String formattedAddress,
                               Coordinates location, List<Attribution> attributions) {}
    private record LocalizedText(String text) {}
    private record Coordinates(Double latitude, Double longitude) {}
}
