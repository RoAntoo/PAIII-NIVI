package com.pa.proyecto.backend_integrator.adapter.places;

import org.springframework.http.HttpStatus;

public final class PlacesException extends RuntimeException {
    public enum Reason {
        UNCONFIGURED(HttpStatus.SERVICE_UNAVAILABLE, "Places search is not configured"),
        LIMITED(HttpStatus.TOO_MANY_REQUESTS, "Places request limit reached"),
        TIMEOUT(HttpStatus.GATEWAY_TIMEOUT, "Places provider timed out"),
        UNAVAILABLE(HttpStatus.BAD_GATEWAY, "Places provider unavailable"),
        NOT_FOUND(HttpStatus.NOT_FOUND, "Place not found");

        private final HttpStatus status;
        private final String message;

        Reason(HttpStatus status, String message) {
            this.status = status;
            this.message = message;
        }
    }

    private final Reason reason;

    PlacesException(Reason reason) {
        super(reason.message);
        this.reason = reason;
    }

    public HttpStatus status() { return reason.status; }

    public String code() { return "PLACES_" + reason.name(); }

    public int retryAfterSeconds() { return reason == Reason.LIMITED ? PlacesRequestLimit.RETRY_AFTER_SECONDS : 0; }
}
