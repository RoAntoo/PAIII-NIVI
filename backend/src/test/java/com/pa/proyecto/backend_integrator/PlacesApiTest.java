package com.pa.proyecto.backend_integrator;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "app.places.google-api-key=")
@AutoConfigureMockMvc
class PlacesApiTest {
    @Autowired MockMvc mvc;

    private static final String VALID =
            "{\"lat\":-34.6,\"lng\":-58.4,\"category\":\"LABORATORY\",\"radius\":3000}";

    @Test
    void requiresAuthentication() throws Exception {
        mvc.perform(post("/places/nearby").contentType("application/json").content(VALID))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/places/ChIJ_test")).andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{\"lat\":91,\"lng\":0,\"category\":\"HARDWARE\",\"radius\":500}",
            "{\"lat\":0,\"lng\":-181,\"category\":\"HARDWARE\",\"radius\":500}",
            "{\"lat\":0,\"lng\":0,\"category\":\"restaurant\",\"radius\":500}",
            "{\"lat\":0,\"lng\":0,\"category\":0,\"radius\":500}",
            "{\"lat\":0,\"lng\":0,\"category\":\"PHARMACY\",\"radius\":5001}",
            "{\"lat\":0,\"lng\":0,\"category\":\"PHARMACY\",\"radius\":499}",
            "{\"lng\":0,\"category\":\"PHARMACY\",\"radius\":500}"
    })
    @WithMockUser
    void rejectsInvalidInputBeforeCallingProvider(String body) throws Exception {
        mvc.perform(post("/places/nearby").contentType("application/json").content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void handlesUnconfiguredServerWithoutReturningInventedResults() throws Exception {
        mvc.perform(post("/places/nearby").contentType("application/json").content(VALID))
                .andExpect(status().isServiceUnavailable())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.code").value("PLACES_UNCONFIGURED"));
        mvc.perform(get("/places/place.id")).andExpect(status().isBadRequest());
    }
}
