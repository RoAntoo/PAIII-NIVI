package com.pa.proyecto.backend_integrator.adapter.web;

import com.pa.proyecto.backend_integrator.config.SecurityConfig;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final AuthenticationManager authentication;
    private final JwtEncoder encoder;
    private final Clock clock;
    private final Duration tokenTtl;

    public AuthController(AuthenticationManager authentication, JwtEncoder encoder, Clock clock,
                          @Value("${app.auth.token-ttl:PT1H}") Duration tokenTtl) {
        this.authentication = authentication;
        this.encoder = encoder;
        this.clock = clock;
        this.tokenTtl = tokenTtl;
    }

    public record LoginRequest(String username, String password) {}
    public record LoginResponse(String accessToken, String tokenType, Instant expiresAt, String username) {}

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        if (request.username() == null || request.username().isBlank() || request.password() == null
                || request.password().isBlank()
                || request.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("Username and password are required");
        }
        var user = authentication.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(request.username(), request.password()));
        Instant now = clock.instant();
        Instant expiresAt = now.plus(tokenTtl);
        var claims = JwtClaimsSet.builder().issuer(SecurityConfig.ISSUER).subject(user.getName())
                .issuedAt(now).expiresAt(expiresAt).id(UUID.randomUUID().toString()).build();
        var token = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims));
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(new LoginResponse(token.getTokenValue(), "Bearer", expiresAt, user.getName()));
    }
}
