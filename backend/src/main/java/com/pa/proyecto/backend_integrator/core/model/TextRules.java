package com.pa.proyecto.backend_integrator.core.model;

/** Shared limits match the existing VARCHAR columns. */
public final class TextRules {
    public static final int MAX_LENGTH = 255;

    private TextRules() {}

    public static String required(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " is required");
        }
        optional(value, field);
        return value.trim();
    }

    public static String optional(String value, String field) {
        if (value != null && value.length() > MAX_LENGTH) {
            throw new IllegalArgumentException(field + " must contain at most " + MAX_LENGTH + " characters");
        }
        return value;
    }
}
