package com.pa.proyecto.backend_integrator.adapter.web;

/**
 * DTO simple para devolver mensajes de error en formato JSON.
 */
@com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
public record ErrorResponse(String error, String message, String code) {
    public ErrorResponse(String error, String message) {
        this(error, message, null);
    }
}
