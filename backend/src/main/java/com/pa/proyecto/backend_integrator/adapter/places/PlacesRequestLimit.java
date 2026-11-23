package com.pa.proyecto.backend_integrator.adapter.places;

import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.function.LongSupplier;

final class PlacesRequestLimit {
    static final int RETRY_AFTER_SECONDS = 60;
    private static final long WINDOW = Duration.ofSeconds(RETRY_AFTER_SECONDS).toNanos();

    private final Deque<Long> calls = new ArrayDeque<>();
    private final LongSupplier nanoTime;
    private Long throttledAt;
    private int inFlight;

    PlacesRequestLimit(LongSupplier nanoTime) {
        this.nanoTime = nanoTime;
    }

    synchronized boolean acquire() {
        long now = nanoTime.getAsLong();
        while (!calls.isEmpty() && now - calls.getFirst() >= WINDOW) {
            calls.removeFirst();
        }
        if (inFlight >= 2 || calls.size() >= 12 || (throttledAt != null && now - throttledAt < WINDOW)) {
            return false;
        }
        calls.addLast(now);
        inFlight++;
        return true;
    }

    synchronized void release() {
        inFlight--;
    }

    synchronized void throttle() {
        throttledAt = nanoTime.getAsLong();
    }
}
