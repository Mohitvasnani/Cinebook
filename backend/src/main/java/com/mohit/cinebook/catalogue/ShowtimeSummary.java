package com.mohit.cinebook.catalogue;

import java.time.Instant;

/**
 * One row of GET /api/showtimes. Field names are the JSON keys, so this file
 * and docs/api-contract.md have to agree.
 */
public record ShowtimeSummary(
        long id,
        String filmTitle,
        String screenName,
        Instant startsAt,
        int runtimeMinutes,
        int priceMinor,
        String currency,
        int seatsAvailable,
        int seatsTotal
) {
}