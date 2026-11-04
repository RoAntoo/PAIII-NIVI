package com.pa.proyecto.backend_integrator.adapter.web;

/**
 * DTO simple para devolver mensajes de error en formato JSON.
 */
public record ErrorResponse(String error, String message) {
}
