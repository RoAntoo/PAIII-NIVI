package com.pa.proyecto.backend_integrator.adapter.places;

import com.pa.proyecto.backend_integrator.core.output.PlacesProvider.Category;
import com.pa.proyecto.backend_integrator.core.output.PlacesProvider.NearbySearch;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.net.SocketTimeoutException;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class GooglePlacesProviderTest {
    private static final String NEARBY = "https://places.googleapis.com/v1/places:searchNearby";
    private static final NearbySearch SEARCH = new NearbySearch(-34.6, -58.4, Category.HARDWARE, 3000);
    private static final String PLACE = """
            {"id":"ChIJ_test","displayName":{"text":"Ferretería de prueba"},"formattedAddress":"Calle 123",
             "location":{"latitude":-34.61,"longitude":-58.42},
             "attributions":[{"provider":"Example provider","providerUri":"https://example.org"}]}
            """;

    private final AtomicLong time = new AtomicLong();
    private MockRestServiceServer server;
    private GooglePlacesProvider provider;

    @BeforeEach
    void createProvider() {
        var builder = RestClient.builder().baseUrl("https://places.googleapis.com/v1");
        server = MockRestServiceServer.bindTo(builder).build();
        provider = new GooglePlacesProvider("test-only-key", builder.build(), new PlacesRequestLimit(time::get));
    }

    @Test
    void sendsLimitedNearbySearchAndMapsRealResponseFields() {
        server.expect(requestTo(NEARBY)).andExpect(method(HttpMethod.POST))
                .andExpect(header("X-Goog-Api-Key", "test-only-key"))
                .andExpect(header("X-Goog-FieldMask",
                        "places.id,places.displayName,places.formattedAddress,places.location,places.attributions"))
                .andExpect(content().json("""
                        {"includedTypes":["hardware_store"],"maxResultCount":8,"rankPreference":"DISTANCE",
                         "languageCode":"es","locationRestriction":{"circle":{"center":{"latitude":-34.6,
                         "longitude":-58.4},"radius":3000}}}
                        """))
                .andRespond(withSuccess("{\"places\":[" + PLACE + "]}", MediaType.APPLICATION_JSON));

        var result = provider.searchNearby(SEARCH).getFirst();
        assertEquals("Ferretería de prueba", result.name());
        assertEquals("Calle 123", result.address());
        assertEquals(-34.61, result.lat());
        assertEquals(-58.42, result.lng());
        assertEquals("Example provider", result.attributions().getFirst().provider());
        server.verify();
    }

    @Test
    void detailsDoesNotSendCurrentLocation() {
        server.expect(requestTo("https://places.googleapis.com/v1/places/ChIJ_test?languageCode=es"))
                .andExpect(method(HttpMethod.GET)).andExpect(content().string(""))
                .andExpect(header("X-Goog-FieldMask", "id,displayName,formattedAddress,location,attributions"))
                .andRespond(withSuccess(PLACE, MediaType.APPLICATION_JSON));
        assertEquals("ChIJ_test", provider.getPlace("ChIJ_test").id());
        server.verify();
    }

    @Test
    void treatsEmptyPayloadAsEmptyResultsAndLetsQuotaRecoverAfterOneMinute() {
        server.expect(requestTo(NEARBY))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS).body("private upstream response"));
        server.expect(requestTo(NEARBY)).andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        var failure = assertThrows(PlacesException.class, () -> provider.searchNearby(SEARCH));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, failure.status());
        assertEquals(60, failure.retryAfterSeconds());
        assertFalse(failure.getMessage().contains("private upstream response"));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS,
                assertThrows(PlacesException.class, () -> provider.searchNearby(SEARCH)).status());
        time.set(Duration.ofMinutes(1).toNanos());
        assertTrue(provider.searchNearby(SEARCH).isEmpty());
        server.verify();
    }

    @Test
    void handlesTransportTimeoutWithoutLeakingUpstreamDetails() {
        server.expect(requestTo(NEARBY)).andRespond(withException(new SocketTimeoutException("socket details")));
        var failure = assertThrows(PlacesException.class, () -> provider.searchNearby(SEARCH));
        assertEquals(HttpStatus.GATEWAY_TIMEOUT, failure.status());
        assertFalse(failure.getMessage().contains("socket details"));
        server.verify();
    }

    @Test
    void capsConcurrentRequestsAndRequestsPerMinute() {
        var limit = new PlacesRequestLimit(time::get);
        assertTrue(limit.acquire());
        assertTrue(limit.acquire());
        assertFalse(limit.acquire());
        limit.release();
        limit.release();
        for (int slot = 2; slot < 12; slot++) {
            assertTrue(limit.acquire());
            limit.release();
        }
        assertFalse(limit.acquire());
        time.set(Duration.ofMinutes(1).toNanos());
        assertTrue(limit.acquire());
    }
}
