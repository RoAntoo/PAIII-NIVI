package com.pa.proyecto.backend_integrator.adapter.web;

import com.pa.proyecto.backend_integrator.adapter.places.PlacesException;
import com.pa.proyecto.backend_integrator.core.model.PlaceIds;
import com.pa.proyecto.backend_integrator.core.output.PlacesProvider;
import com.pa.proyecto.backend_integrator.core.output.PlacesProvider.Category;
import com.pa.proyecto.backend_integrator.core.output.PlacesProvider.NearbySearch;
import com.pa.proyecto.backend_integrator.core.output.PlacesProvider.Place;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/places")
public class PlacesController {
    private final PlacesProvider places;

    public PlacesController(PlacesProvider places) {
        this.places = places;
    }

    @PostMapping("/nearby")
    public ResponseEntity<List<Place>> nearby(@RequestBody NearbyRequest request) {
        if (!inRange(request.lat(), 90) || !inRange(request.lng(), 180)
                || request.category() == null || request.radius() == null
                || request.radius() < 500 || request.radius() > 5000) {
            throw new IllegalArgumentException("Valid coordinates, category and a radius of 500–5000 meters are required");
        }
        Category category;
        try {
            category = Category.valueOf(request.category());
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("Unsupported place category");
        }
        var search = new NearbySearch(request.lat(), request.lng(), category, request.radius());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(places.searchNearby(search));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Place> details(@PathVariable String id) {
        PlaceIds.validateOptional(id);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(places.getPlace(id));
    }

    @ExceptionHandler(PlacesException.class)
    public ResponseEntity<ErrorResponse> placesError(PlacesException error) {
        var response = ResponseEntity.status(error.status()).cacheControl(CacheControl.noStore());
        if (error.retryAfterSeconds() > 0) response.header(HttpHeaders.RETRY_AFTER, String.valueOf(error.retryAfterSeconds()));
        return response.body(new ErrorResponse(error.status().getReasonPhrase(), error.getMessage(), error.code()));
    }

    private static boolean inRange(Double coordinate, double limit) {
        return coordinate != null && Math.abs(coordinate) <= limit;
    }

    public record NearbyRequest(Double lat, Double lng, String category, Integer radius) {}
}
