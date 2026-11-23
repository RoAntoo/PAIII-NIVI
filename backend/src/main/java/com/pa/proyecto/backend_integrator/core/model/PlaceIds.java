package com.pa.proyecto.backend_integrator.core.model;

import java.util.regex.Pattern;

public final class PlaceIds {
    public static final int MAX_LENGTH = 1024;
    private static final Pattern FORMAT = Pattern.compile("[A-Za-z0-9_-]{1," + MAX_LENGTH + "}");

    private PlaceIds() {}

    public static boolean isValid(String id) {
        return id != null && FORMAT.matcher(id).matches();
    }

    public static void validateOptional(String id) {
        if (id != null && !isValid(id)) throw new IllegalArgumentException("Invalid place ID");
    }
}
