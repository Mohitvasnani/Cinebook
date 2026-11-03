package com.mohit.screenbook.common;

/**
 * The problem type URIs from docs/api-contract.md. Clients branch on the last
 * segment of these rather than on the prose in "detail", which is why each
 * case needs a stable identifier of its own.
 */
public final class Problems {

    public static final String BASE = "https://screenbook.dev/problems";

    public static final String NOT_FOUND = BASE + "/not-found";
    public static final String SEAT_UNAVAILABLE = BASE + "/seat-unavailable";
    public static final String HOLD_EXPIRED = BASE + "/hold-expired";
    public static final String HOLD_ALREADY_CONVERTED = BASE + "/hold-already-converted";
    public static final String VALIDATION_FAILED = BASE + "/validation-failed";

    private Problems() {
    }
}
