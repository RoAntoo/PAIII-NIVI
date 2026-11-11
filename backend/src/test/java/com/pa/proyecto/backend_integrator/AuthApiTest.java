package com.pa.proyecto.backend_integrator;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthApiTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JwtEncoder encoder;

    @Test void anonymousRequestsCannotReadOrDeleteProjects() throws Exception {
        mvc.perform(get("/projects")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").exists());
        mvc.perform(delete("/projects/1")).andExpect(status().isUnauthorized());
        mvc.perform(get("/projects").header("Authorization", "Bearer invalid"))
                .andExpect(status().isUnauthorized());
    }

    @Test void loginIssuesUsableTokenWithoutExposingPassword() throws Exception {
        var response = mvc.perform(post("/auth/login").contentType("application/json")
                        .content("{\"username\":\"test-user\",\"password\":\"test-only-password\"}"))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.password").doesNotExist()).andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andReturn().getResponse();
        String token = json.readTree(response.getContentAsString()).get("accessToken").asText();
        mvc.perform(get("/projects").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        mvc.perform(get("/projects").header("Authorization", "Bearer " + token + "tampered"))
                .andExpect(status().isUnauthorized());
    }

    @Test void invalidCredentialsAndMissingFieldsAreRejected() throws Exception {
        mvc.perform(post("/auth/login").contentType("application/json")
                        .content("{\"username\":\"test-user\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Invalid username or password"));
        mvc.perform(post("/auth/login").contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test void expiredTokensAndTokensFromAnotherIssuerAreRejected() throws Exception {
        for (String issuer : new String[]{"nivi", "another-issuer"}) {
            Instant now = Instant.now();
            var claims = JwtClaimsSet.builder().issuer(issuer).subject("test-user")
                    .issuedAt(now.minusSeconds(7200))
                    .expiresAt(issuer.equals("nivi") ? now.minusSeconds(3600) : now.plusSeconds(3600)).build();
            String token = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
            mvc.perform(get("/projects").header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
        }
    }

    @Test void loginPreflightAllowsAuthorizationOnlyForConfiguredOrigins() throws Exception {
        mvc.perform(options("/auth/login").header("Origin", "http://localhost:4200")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:4200"));
        mvc.perform(options("/auth/login").header("Origin", "https://untrusted.example")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden());
    }
}
